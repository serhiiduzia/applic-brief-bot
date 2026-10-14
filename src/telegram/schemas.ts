import { z } from "zod";

export const telegramUpdateSchema = z.object({
  update_id: z.number().int(),
  message: z
    .object({
      chat: z.object({ id: z.number().int() }),
      from: z
        .object({
          first_name: z.string(),
          last_name: z.string().optional(),
          username: z.string().optional(),
        })
        .optional(),
      text: z.string().optional(),
    })
    .optional(),
});

export type TelegramUpdate = z.infer<typeof telegramUpdateSchema>;
