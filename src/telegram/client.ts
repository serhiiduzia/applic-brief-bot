import { config } from "../config.js";

const MAX_MESSAGE_LENGTH = 4000;

type TelegramResponse = {
  ok: boolean;
  description?: string;
  error_code?: number;
};

async function callTelegram(method: string, body: Record<string, unknown>): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data: TelegramResponse | null = null;
  try {
    data = (await response.json()) as TelegramResponse;
  } catch {
    data = null;
  }
  if (!response.ok || !data || !data.ok) {
    const code = data?.error_code ?? response.status;
    const description = data?.description ?? (response.statusText || "Unknown error");
    throw new Error(`Telegram ${method} failed (${code}): ${description}`);
  }
}

function splitText(text: string): string[] {
  const parts: string[] = [];
  let rest = text;
  while (rest.length > MAX_MESSAGE_LENGTH) {
    const window = rest.slice(0, MAX_MESSAGE_LENGTH);
    let cut = window.lastIndexOf("\n");
    if (cut < MAX_MESSAGE_LENGTH / 2) cut = window.lastIndexOf(" ");
    if (cut < MAX_MESSAGE_LENGTH / 2) cut = MAX_MESSAGE_LENGTH;
    const part = rest.slice(0, cut).trimEnd();
    if (part.length > 0) parts.push(part);
    rest = rest.slice(cut).replace(/^[\n ]+/, "");
  }
  if (rest.length > 0) parts.push(rest);
  return parts;
}

export async function sendMessage(chatId: number, text: string): Promise<void> {
  for (const part of splitText(text)) {
    await callTelegram("sendMessage", { chat_id: chatId, text: part });
  }
}

export async function sendTyping(chatId: number): Promise<void> {
  await callTelegram("sendChatAction", { chat_id: chatId, action: "typing" });
}
