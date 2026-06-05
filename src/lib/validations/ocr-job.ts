import { z } from "zod";

export const snaptextOcrJobSchema = z.object({
  pdfUrl: z.url("pdfUrl must be a valid URL."),
  filename: z.string().trim().min(1, "filename is required."),
  fileSize: z.number().int().positive("fileSize must be a positive integer."),
  fileHash: z.string().trim().min(16, "fileHash is required."),
  emailMessageId: z.string().trim().min(1).optional(),
  ocrJobId: z.string().trim().min(1).optional(),
});

export type SnaptextOcrJobInput = z.infer<typeof snaptextOcrJobSchema>;
