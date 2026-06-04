import { z } from "zod";

export const snaptextOcrResultSchema = z.object({
  providerJobId: z.string().trim().min(1).optional(),
  status: z.string().trim().min(1).default("COMPLETED"),
  result: z.unknown(),
});

export type SnaptextOcrResultInput = z.infer<typeof snaptextOcrResultSchema>;
