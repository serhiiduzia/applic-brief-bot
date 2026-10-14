import { config } from "../src/config.js";
import { runBriefingTurn } from "../src/ai/briefing-agent.js";
import type { Brief } from "../src/domain/brief.js";
import type { ClientInfo } from "../src/domain/chat.js";
import { telegramUpdateSchema } from "../src/telegram/schemas.js";
import { sendMessage, sendTyping } from "../src/telegram/client.js";
import {
  clearHistory,
  getHistory,
  markUpdateProcessed,
  saveBrief,
  saveHistory,
} from "../src/storage/repository.js";

const ERROR_TEXT = "Вибачте, сталася помилка, спробуйте ще раз.";
const NON_TEXT_REPLY = "Будь ласка, напишіть ваше повідомлення текстом — так я зможу вам допомогти.";

function ok(): Response {
  return Response.json({ ok: true });
}

export async function GET(): Promise<Response> {
  return ok();
}

async function handleText(client: ClientInfo, text: string): Promise<void> {
  const isStart = text.trim().startsWith("/start");
  if (isStart) await clearHistory(client.chatId);
  const history = isStart ? [] : await getHistory(client.chatId);
  const userText = isStart ? "Привіт!" : text;

  await sendTyping(client.chatId).catch((error: unknown): void => {
    console.error("sendTyping failed", error);
  });

  const result = await runBriefingTurn({
    history: [...history, { role: "user", content: userText }],
    client,
    onBrief: async (brief: Brief): Promise<void> => {
      await saveBrief({
        ...brief,
        chatId: client.chatId,
        clientName: client.name,
        username: client.username,
        createdAt: new Date().toISOString(),
      });
    },
  });

  await saveHistory(client.chatId, result.history);
  await sendMessage(client.chatId, result.reply);
}

export async function POST(request: Request): Promise<Response> {
  if (request.headers.get("x-telegram-bot-api-secret-token") !== config.telegramWebhookSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  let chatId: number | null = null;
  try {
    const parsed = telegramUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return ok();
    const update = parsed.data;
    const message = update.message;
    if (!message) return ok();
    chatId = message.chat.id;

    if (!(await markUpdateProcessed(update.update_id))) return ok();

    if (message.text === undefined) {
      await sendMessage(chatId, NON_TEXT_REPLY);
      return ok();
    }

    const from = message.from;
    const client: ClientInfo = {
      chatId,
      name: from ? [from.first_name, from.last_name].filter(Boolean).join(" ") : "Клієнт",
      username: from?.username ?? null,
    };
    await handleText(client, message.text);
  } catch (error: unknown) {
    console.error("Telegram update failed", error);
    if (chatId !== null) {
      await sendMessage(chatId, ERROR_TEXT).catch((sendError: unknown): void => {
        console.error("Failed to send error message", sendError);
      });
    }
  }
  return ok();
}
