import { z } from "zod";

export const briefSchema = z.object({
  projectSummary: z.string(),
  features: z.array(z.string()),
  userRoles: z.array(z.object({ role: z.string(), description: z.string() })),
  platforms: z.array(z.string()),
  notes: z.string(),
});

export type Brief = z.infer<typeof briefSchema>;

export type StoredBrief = Brief & {
  chatId: number;
  clientName: string;
  username: string | null;
  createdAt: string;
};
