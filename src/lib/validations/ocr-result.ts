import { z } from "zod";

export const snaptextOcrResultSchema = z.object({
  providerJobId: z.string().trim().min(1).optional(),
  status: z.string().trim().min(1).default("COMPLETED"),
  result: z.unknown(),
});

export const snaptextWebhookResultSchema = z.object({
  id: z.string().trim().min(1).optional(),
  jobId: z.string().trim().min(1).optional(),
  providerJobId: z.string().trim().min(1).optional(),
  middlewareJobId: z.string().trim().min(1).optional(),
  emailMessageId: z.string().trim().min(1).optional(),
  status: z.string().trim().min(1).default("COMPLETED"),
  result: z.unknown().optional(),
  data: z.unknown().optional(),
  output: z.unknown().optional(),
  extraction: z.unknown().optional(),
  metadata: z.object({
    middlewareJobId: z.string().trim().min(1).optional(),
    emailMessageId: z.string().trim().min(1).optional(),
  }).passthrough().optional(),
}).passthrough();

export type SnaptextOcrResultInput = z.infer<typeof snaptextOcrResultSchema>;
