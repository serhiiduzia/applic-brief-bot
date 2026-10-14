import { z } from "zod";

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  REDIS_TOKEN: z.string().min(1),
  MCP_ACCESS_KEY: z.string().min(1),
});

type Env = z.infer<typeof envSchema>;

export type Config = {
  telegramBotToken: string;
  telegramWebhookSecret: string;
  openaiApiKey: string;
  openaiModel: string;
  redisUrl: string;
  redisToken: string;
  mcpAccessKey: string;
};

function pick(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function loadEnv(): Env {
  const result = envSchema.safeParse({
    TELEGRAM_BOT_TOKEN: pick("TELEGRAM_BOT_TOKEN"),
    TELEGRAM_WEBHOOK_SECRET: pick("TELEGRAM_WEBHOOK_SECRET"),
    OPENAI_API_KEY: pick("OPENAI_API_KEY"),
    OPENAI_MODEL: pick("OPENAI_MODEL") ?? "gpt-5-mini",
    REDIS_URL: pick("UPSTASH_REDIS_REST_URL", "KV_REST_API_URL"),
    REDIS_TOKEN: pick("UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_TOKEN"),
    MCP_ACCESS_KEY: pick("MCP_ACCESS_KEY"),
  });
  if (!result.success) {
    const names = result.error.issues.map((issue) => {
      const key = String(issue.path[0]);
      if (key === "REDIS_URL") return "UPSTASH_REDIS_REST_URL (або KV_REST_API_URL)";
      if (key === "REDIS_TOKEN") return "UPSTASH_REDIS_REST_TOKEN (або KV_REST_API_TOKEN)";
      return key;
    });
    throw new Error(`Missing required environment variables: ${names.join(", ")}`);
  }
  return result.data;
}

let cached: Config | null = null;

function getConfig(): Config {
  if (cached) return cached;
  const env = loadEnv();
  cached = {
    telegramBotToken: env.TELEGRAM_BOT_TOKEN,
    telegramWebhookSecret: env.TELEGRAM_WEBHOOK_SECRET,
    openaiApiKey: env.OPENAI_API_KEY,
    openaiModel: env.OPENAI_MODEL,
    redisUrl: env.REDIS_URL,
    redisToken: env.REDIS_TOKEN,
    mcpAccessKey: env.MCP_ACCESS_KEY,
  };
  return cached;
}

export const config: Config = new Proxy({} as Config, {
  get(_target: Config, key: string | symbol): unknown {
    return getConfig()[key as keyof Config];
  },
});
