"use server";

import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  recipientCatchRuleIdSchema,
  recipientCatchRuleSchema,
} from "@/lib/validations/recipient-catch-rule";

export async function createRecipientCatchRuleAction(formData: FormData): Promise<void> {
  if (!(await isAuthenticated())) {
    return;
  }

  const parsed = recipientCatchRuleSchema.safeParse({
    email: formData.get("email"),
    label: formData.get("label"),
    category: formData.get("category"),
    priority: formData.get("priority"),
    requireAttachment: formData.get("requireAttachment") ?? "false",
    subjectKeywords: formData.get("subjectKeywords"),
    bodyKeywords: formData.get("bodyKeywords"),
    attachmentKeywords: formData.get("attachmentKeywords"),
  });

  if (!parsed.success) {
    return;
  }

  await prisma.recipientCatchRule.upsert({
    where: { email: parsed.data.email },
    update: {
      label: parsed.data.label,
      category: parsed.data.category,
      priority: parsed.data.priority,
      requireAttachment: parsed.data.requireAttachment,
      subjectKeywords: parsed.data.subjectKeywords,
      bodyKeywords: parsed.data.bodyKeywords,
      attachmentKeywords: parsed.data.attachmentKeywords,
      enabled: true,
    },
    create: {
      email: parsed.data.email,
      label: parsed.data.label,
      category: parsed.data.category,
      priority: parsed.data.priority,
      requireAttachment: parsed.data.requireAttachment,
      subjectKeywords: parsed.data.subjectKeywords,
      bodyKeywords: parsed.data.bodyKeywords,
      attachmentKeywords: parsed.data.attachmentKeywords,
      enabled: true,
      matchedToday: 0,
    },
  });

  revalidatePath("/dashboard/catch-rules");
}

export async function updateRecipientCatchRuleAction(formData: FormData): Promise<void> {
  if (!(await isAuthenticated())) {
    return;
  }

  const idParsed = recipientCatchRuleIdSchema.safeParse({
    ruleId: formData.get("ruleId"),
  });
  const parsed = recipientCatchRuleSchema.safeParse({
    email: formData.get("email"),
    label: formData.get("label"),
    category: formData.get("category"),
    priority: formData.get("priority"),
    requireAttachment: formData.get("requireAttachment") ?? "false",
    subjectKeywords: formData.get("subjectKeywords"),
    bodyKeywords: formData.get("bodyKeywords"),
    attachmentKeywords: formData.get("attachmentKeywords"),
  });

  if (!idParsed.success || !parsed.success) {
    return;
  }

  await prisma.recipientCatchRule.update({
    where: { id: idParsed.data.ruleId },
    data: {
      email: parsed.data.email,
      label: parsed.data.label,
      category: parsed.data.category,
      priority: parsed.data.priority,
      requireAttachment: parsed.data.requireAttachment,
      subjectKeywords: parsed.data.subjectKeywords,
      bodyKeywords: parsed.data.bodyKeywords,
      attachmentKeywords: parsed.data.attachmentKeywords,
    },
  });

  revalidatePath("/dashboard/catch-rules");
}

export async function toggleRecipientCatchRuleAction(formData: FormData): Promise<void> {
  if (!(await isAuthenticated())) {
    return;
  }

  const parsed = recipientCatchRuleIdSchema.safeParse({
    ruleId: formData.get("ruleId"),
  });

  if (!parsed.success) {
    return;
  }

  const rule = await prisma.recipientCatchRule.findUnique({
    where: { id: parsed.data.ruleId },
    select: { enabled: true },
  });

  if (!rule) {
    return;
  }

  await prisma.recipientCatchRule.update({
    where: { id: parsed.data.ruleId },
    data: { enabled: !rule.enabled },
  });

  revalidatePath("/dashboard/catch-rules");
}

export async function deleteRecipientCatchRuleAction(formData: FormData): Promise<void> {
  if (!(await isAuthenticated())) {
    return;
  }

  const parsed = recipientCatchRuleIdSchema.safeParse({
    ruleId: formData.get("ruleId"),
  });

  if (!parsed.success) {
    return;
  }

  await prisma.recipientCatchRule.delete({
    where: { id: parsed.data.ruleId },
  });

  revalidatePath("/dashboard/catch-rules");
}
