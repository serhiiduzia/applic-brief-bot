import { Redis } from "@upstash/redis";
import { config } from "../config.js";
import type { StoredBrief } from "../domain/brief.js";
import type { ChatMessage } from "../domain/chat.js";
import type { StoredProposal } from "../domain/proposal.js";

const HISTORY_LIMIT = 40;
const HISTORY_TTL_SECONDS = 7 * 24 * 60 * 60;
const UPDATE_TTL_SECONDS = 24 * 60 * 60;
const PROPOSAL_TTL_SECONDS = 180 * 24 * 60 * 60;
const BRIEFS_INDEX = "briefs";

let client: Redis | null = null;

function redis(): Redis {
  if (!client) {
    client = new Redis({ url: config.redisUrl, token: config.redisToken });
  }
  return client;
}

function parseValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function asObject<T>(value: unknown): T | null {
  const parsed = parseValue(value);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  return parsed as T;
}

function historyKey(chatId: number): string {
  return `chat:${chatId}`;
}

function briefKey(chatId: number | string): string {
  return `brief:${chatId}`;
}

function proposalKey(id: string): string {
  return `proposal:${id}`;
}

function trimHistory(messages: ChatMessage[]): ChatMessage[] {
  const trimmed = messages.slice(-HISTORY_LIMIT);
  let start = 0;
  while (start < trimmed.length && trimmed[start].role === "tool") {
    start += 1;
  }
  return trimmed.slice(start);
}

export async function markUpdateProcessed(updateId: number): Promise<boolean> {
  const result = await redis().set(`update:${updateId}`, 1, { nx: true, ex: UPDATE_TTL_SECONDS });
  return result === "OK";
}

export async function getHistory(chatId: number): Promise<ChatMessage[]> {
  const raw = await redis().get<unknown>(historyKey(chatId));
  const parsed = parseValue(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed as ChatMessage[];
}

export async function saveHistory(chatId: number, messages: ChatMessage[]): Promise<void> {
  const trimmed = trimHistory(messages);
  await redis().set(historyKey(chatId), JSON.stringify(trimmed), { ex: HISTORY_TTL_SECONDS });
}

export async function clearHistory(chatId: number): Promise<void> {
  await redis().del(historyKey(chatId));
}

export async function appendToHistory(chatId: number, message: ChatMessage): Promise<void> {
  const history = await getHistory(chatId);
  history.push(message);
  await saveHistory(chatId, history);
}

export async function saveBrief(brief: StoredBrief): Promise<void> {
  const parsedTime = Date.parse(brief.createdAt);
  const score = Number.isNaN(parsedTime) ? Date.now() : parsedTime;
  await redis().set(briefKey(brief.chatId), JSON.stringify(brief));
  await redis().zadd(BRIEFS_INDEX, { score, member: String(brief.chatId) });
}

export async function listBriefs(
  limit: number,
  offset: number,
): Promise<{ items: StoredBrief[]; total: number }> {
  const total = await redis().zcard(BRIEFS_INDEX);
  if (limit <= 0 || offset >= total) return { items: [], total };
  const ids = await redis().zrange<string[]>(BRIEFS_INDEX, offset, offset + limit - 1, { rev: true });
  if (ids.length === 0) return { items: [], total };
  const values = await redis().mget<unknown[]>(...ids.map((id) => briefKey(id)));
  const items: StoredBrief[] = [];
  for (const value of values) {
    const brief = asObject<StoredBrief>(value);
    if (brief) items.push(brief);
  }
  return { items, total };
}

export async function getBrief(chatId: number): Promise<StoredBrief | null> {
  const raw = await redis().get<unknown>(briefKey(chatId));
  return asObject<StoredBrief>(raw);
}

export async function saveProposal(proposal: StoredProposal): Promise<void> {
  await redis().set(proposalKey(proposal.id), JSON.stringify(proposal), { ex: PROPOSAL_TTL_SECONDS });
}

export async function getProposal(id: string): Promise<StoredProposal | null> {
  const raw = await redis().get<unknown>(proposalKey(id));
  return asObject<StoredProposal>(raw);
}
