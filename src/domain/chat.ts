import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export type ChatMessage = ChatCompletionMessageParam;

export type ClientInfo = {
  chatId: number;
  name: string;
  username: string | null;
};
