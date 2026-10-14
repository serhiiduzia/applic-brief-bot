import { z } from "zod";

export const proposalSchema = z.object({
  title: z.string().min(1).max(200),
  client: z.string().max(200).nullable().optional(),
  intro: z.string().max(5000),
  kpis: z
    .array(z.object({ label: z.string().min(1).max(60), value: z.string().min(1).max(60) }))
    .max(4)
    .optional(),
  sections: z
    .array(
      z.object({
        heading: z.string().min(1).max(200),
        text: z.string().max(10000),
        bullets: z.array(z.string().max(1000)).max(50),
        table: z
          .object({
            columns: z.array(z.string().max(100)).min(1).max(8),
            rows: z.array(z.array(z.string().max(1000)).max(8)).max(60),
          })
          .nullable()
          .optional(),
      }),
    )
    .max(30),
  price: z.string().max(5000).nullable(),
  timeline: z.string().max(5000).nullable(),
  nextSteps: z.string().max(5000).nullable(),
});

export type Proposal = z.infer<typeof proposalSchema>;

export type StoredProposal = Proposal & {
  id: string;
  chatId: number;
  createdAt: string;
};
