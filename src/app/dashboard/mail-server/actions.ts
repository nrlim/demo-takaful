"use server";

import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import { fetchRecentMailMessages, verifyMailServerConnection } from "@/lib/mail-server";
import { uploadPdfAttachment, type StoredPdfAttachment } from "@/lib/pdf-storage";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/secret-crypto";
import {
  connectionIdSchema,
  mailServerConnectionSchema,
  type MailServerConnectionInput,
} from "@/lib/validations/mail-server";

export interface MailServerActionState {
  message?: string;
  error?: string;
}

interface ActiveCatchRule {
  id: string;
  email: string;
  category: string;
  priority: number;
  requireAttachment: boolean;
  subjectKeywords: string[];
  bodyKeywords: string[];
  attachmentKeywords: string[];
}

interface RuleMatchResult {
  rule: ActiveCatchRule;
  reason: string;
}

function includesAnyKeyword(value: string, keywords: string[]): boolean {
  if (keywords.length === 0) {
    return true;
  }

  const normalizedValue = value.toLowerCase();
  return keywords.some((keyword) => normalizedValue.includes(keyword.toLowerCase()));
}

function matchMessageToRule(
  message: Awaited<ReturnType<typeof fetchRecentMailMessages>>[number],
  rules: ActiveCatchRule[],
): RuleMatchResult | null {
  const normalizedRecipient = message.toEmail.toLowerCase();

  if (message.pdfAttachments.length === 0) {
    return null;
  }

  for (const rule of rules) {
    if (rule.email.toLowerCase() !== normalizedRecipient) {
      continue;
    }

    if (rule.requireAttachment && !message.hasAttachments) {
      continue;
    }

    if (!includesAnyKeyword(message.subject, rule.subjectKeywords)) {
      continue;
    }

    if (!includesAnyKeyword(message.bodyText, rule.bodyKeywords)) {
      continue;
    }

    if (!includesAnyKeyword(message.attachmentNames.join(" "), rule.attachmentKeywords)) {
      continue;
    }

    const reasons = ["recipient"];
    if (rule.subjectKeywords.length > 0) reasons.push("subject");
    if (rule.bodyKeywords.length > 0) reasons.push("content");
    if (rule.attachmentKeywords.length > 0) reasons.push("attachment");
    reasons.push("pdf attachment");
    if (rule.requireAttachment) reasons.push("has attachment");

    return { rule, reason: reasons.join(" + ") };
  }

  return null;
}

function buildConfigFromRecord(record: {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  mailbox: string;
  secure: boolean;
}): MailServerConnectionInput {
  return {
    name: record.name,
    host: record.host,
    port: record.port,
    username: record.username,
    password: decryptSecret(record.password),
    mailbox: record.mailbox,
    secure: record.secure,
  };
}

export async function connectMailServerAction(
  _previousState: MailServerActionState,
  formData: FormData,
): Promise<MailServerActionState> {
  if (!(await isAuthenticated())) {
    return { error: "Unauthorized session." };
  }

  const parsed = mailServerConnectionSchema.safeParse({
    name: formData.get("name"),
    host: formData.get("host"),
    port: formData.get("port"),
    username: formData.get("username"),
    password: formData.get("password"),
    mailbox: formData.get("mailbox"),
    secure: formData.get("secure") ?? "false",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid mail server payload." };
  }

  try {
    await verifyMailServerConnection(parsed.data);

    await prisma.mailServerConnection.create({
      data: {
        ...parsed.data,
        password: encryptSecret(parsed.data.password),
        status: "CONNECTED",
        lastError: null,
      },
    });

    revalidatePath("/dashboard/mail-server");
    return { message: "Mail server connected and saved." };
  } catch (error) {
    const safeError = error instanceof Error ? error.message : "Unable to connect mail server.";

    try {
      await prisma.mailServerConnection.create({
        data: {
          ...parsed.data,
          password: encryptSecret(parsed.data.password),
          status: "ERROR",
          lastError: safeError.slice(0, 500),
        },
      });
    } catch {
      return { error: "Mail server failed and database is not ready. Check DATABASE_URL and DIRECT_URL." };
    }

    revalidatePath("/dashboard/mail-server");
    return { error: "Mail server connection failed. Check host, port, credential, and mailbox." };
  }
}

export async function syncMailMessagesAction(formData: FormData): Promise<void> {
  if (!(await isAuthenticated())) {
    return;
  }

  const parsed = connectionIdSchema.safeParse({
    connectionId: formData.get("connectionId"),
  });

  if (!parsed.success) {
    return;
  }

  const connection = await prisma.mailServerConnection.findUnique({
    where: { id: parsed.data.connectionId },
  });

  if (!connection) {
    return;
  }

  try {
    const messages = await fetchRecentMailMessages(buildConfigFromRecord(connection));
    const activeRecipientRules = await prisma.recipientCatchRule.findMany({
      where: { enabled: true },
      orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        email: true,
        category: true,
        priority: true,
        requireAttachment: true,
        subjectKeywords: true,
        bodyKeywords: true,
        attachmentKeywords: true,
      },
    });
    const matchedMessages = messages
      .map((message) => ({ message, match: matchMessageToRule(message, activeRecipientRules) }))
      .filter((item): item is { message: typeof messages[number]; match: RuleMatchResult } => Boolean(item.match));

    const storedMatches: Array<{
      message: typeof messages[number];
      match: RuleMatchResult;
      attachments: StoredPdfAttachment[];
    }> = [];

    for (const item of matchedMessages) {
      const attachments: StoredPdfAttachment[] = [];

      for (const attachment of item.message.pdfAttachments) {
        attachments.push(await uploadPdfAttachment({
          messageUid: item.message.uid,
          filename: attachment.filename,
          contentType: attachment.contentType,
          content: attachment.content,
        }));
      }

      if (attachments.length > 0) {
        storedMatches.push({ ...item, attachments });
      }
    }

    for (const { message, match, attachments } of storedMatches) {
      const savedMessage = await prisma.emailMessage.upsert({
        where: {
          connectionId_messageUid: {
            connectionId: connection.id,
            messageUid: message.uid,
          },
        },
        update: {
          messageId: message.messageId,
          fromEmail: message.fromEmail,
          toEmail: message.toEmail,
          subject: message.subject,
          bodyPreview: message.bodyPreview,
          receivedAt: message.receivedAt,
          hasAttachments: true,
          attachmentCount: attachments.length,
          attachmentNames: attachments.map((attachment) => attachment.filename),
          matchedRuleId: match.rule.id,
          matchedCategory: match.rule.category,
          matchReason: match.reason,
        },
        create: {
          connectionId: connection.id,
          messageUid: message.uid,
          messageId: message.messageId,
          fromEmail: message.fromEmail,
          toEmail: message.toEmail,
          subject: message.subject,
          bodyPreview: message.bodyPreview,
          receivedAt: message.receivedAt,
          hasAttachments: true,
          attachmentCount: attachments.length,
          attachmentNames: attachments.map((attachment) => attachment.filename),
          matchedRuleId: match.rule.id,
          matchedCategory: match.rule.category,
          matchReason: match.reason,
          ocr: false,
          ocrStatus: "PENDING",
        },
      });

      await prisma.emailAttachment.createMany({
        data: attachments.map((attachment) => ({
          emailMessageId: savedMessage.id,
          filename: attachment.filename,
          contentType: attachment.contentType,
          fileSize: attachment.fileSize,
          fileHash: attachment.fileHash,
          storagePath: attachment.storagePath,
          publicUrl: attachment.publicUrl,
        })),
        skipDuplicates: true,
      });
    }

    const matchedRuleIds = new Set(
      storedMatches.map(({ match }) => match.rule.id),
    );

    await Promise.all(
      Array.from(matchedRuleIds).map((ruleId) =>
        prisma.recipientCatchRule.update({
          where: { id: ruleId },
          data: { matchedToday: { increment: 1 } },
        }),
      ),
    );

    await prisma.mailServerConnection.update({
      where: { id: connection.id },
      data: {
        status: "CONNECTED",
        lastError: null,
        lastSyncAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.mailServerConnection.update({
      where: { id: connection.id },
      data: {
        status: "ERROR",
        lastError: error instanceof Error ? error.message.slice(0, 500) : "Sync failed.",
      },
    });
  }

  revalidatePath("/dashboard/mail-server");
  revalidatePath("/dashboard/messages");
}

export async function disconnectMailServerAction(formData: FormData): Promise<void> {
  if (!(await isAuthenticated())) {
    return;
  }

  const parsed = connectionIdSchema.safeParse({
    connectionId: formData.get("connectionId"),
  });

  if (!parsed.success) {
    return;
  }

  await prisma.mailServerConnection.update({
    where: { id: parsed.data.connectionId },
    data: { status: "DISCONNECTED" },
  });

  revalidatePath("/dashboard/mail-server");
}
