import { z } from "zod";

export const insuranceDocumentCategorySchema = z.enum([
  "spaj",
  "uw",
  "claim",
  "policy",
  "premium",
  "medical",
  "endorsement",
  "finance",
]);

function keywordListFromFormValue(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/[\n,]/)
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
}

export const recipientCatchRuleSchema = z.object({
  email: z.email("Masukkan format email yang valid.").trim().toLowerCase(),
  label: z.string().trim().min(1, "Label wajib diisi agar rule mudah diaudit."),
  category: insuranceDocumentCategorySchema,
  priority: z.coerce.number().int().min(1).max(99).default(10),
  requireAttachment: z.enum(["true", "false"]).transform((value) => value === "true"),
  subjectKeywords: z.preprocess(keywordListFromFormValue, z.array(z.string())),
  bodyKeywords: z.preprocess(keywordListFromFormValue, z.array(z.string())),
  attachmentKeywords: z.preprocess(keywordListFromFormValue, z.array(z.string())),
});

export const recipientCatchRuleIdSchema = z.object({
  ruleId: z.string().trim().min(1),
});

export type InsuranceDocumentCategory = z.infer<typeof insuranceDocumentCategorySchema>;
export type RecipientCatchRuleInput = z.infer<typeof recipientCatchRuleSchema>;
