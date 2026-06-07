import { z } from "zod";
import { SNAPTEXT_DEFAULT_ENDPOINT, SNAPTEXT_OCR_MODEL_IDS } from "@/lib/snaptext-constants";

export const snaptextOcrModelIdSchema = z.enum(SNAPTEXT_OCR_MODEL_IDS);

export const snaptextConfigurationSchema = z.object({
  apiKey: z.string().trim().optional(),
  endpoint: z.url().default(SNAPTEXT_DEFAULT_ENDPOINT),
  enabled: z.enum(["true", "false"]).transform((value) => value === "true"),
  ocrModelId: z.union([snaptextOcrModelIdSchema, z.literal("")]).transform((value) => value || null),
});

export type SnaptextOcrModelId = z.infer<typeof snaptextOcrModelIdSchema>;
export type SnaptextConfigurationInput = z.infer<typeof snaptextConfigurationSchema>;

export function normalizeSnaptextOcrModelId(
  value: string | null | undefined,
): SnaptextOcrModelId | null {
  const parsed = snaptextOcrModelIdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
