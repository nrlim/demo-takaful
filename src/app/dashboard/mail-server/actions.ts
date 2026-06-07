"use server";

import type { InputJsonValue } from "@prisma/client/runtime/client";
import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import { writeEmailGatewayLog } from "@/lib/email-gateway-log";
import { normalizeSnaptextResult } from "@/lib/ocr-schema";
import { fetchRecentMailMessages, listMailServerMailboxes, verifyMailServerConnection } from "@/lib/mail-server";
import { uploadPdfAttachment, type StoredPdfAttachment } from "@/lib/pdf-storage";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/secret-crypto";
import { createSnaptextOcrJob, extractSnaptextResult, getSnaptextProviderJobId, mapProviderStatus, SNAPTEXT_PROVIDER } from "@/lib/snaptext";
import {
  connectionIdSchema,
  mailServerConnectionSchema,
  updateMailServerConnectionSchema,
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
  const normalizedRecipients = new Set(
    message.recipientEmails.map((email) => email.toLowerCase()),
  );

  if (message.pdfAttachments.length === 0) {
    return null;
  }

  for (const rule of rules) {
    if (!normalizedRecipients.has(rule.email.toLowerCase())) {
      continue;
    }

    if (rule.requireAttachment && !message.hasAttachments) {
      continue;
    }

    const hasSubjectKeywords = rule.subjectKeywords.length > 0;
    const hasBodyKeywords = rule.bodyKeywords.length > 0;
    const subjectMatched = hasSubjectKeywords && includesAnyKeyword(message.subject, rule.subjectKeywords);
    const bodyMatched = hasBodyKeywords && includesAnyKeyword(message.bodyText, rule.bodyKeywords);
    const requiresContentMatch = hasSubjectKeywords || hasBodyKeywords;

    if (requiresContentMatch && !subjectMatched && !bodyMatched) {
      continue;
    }

    if (!includesAnyKeyword(message.attachmentNames.join(" "), rule.attachmentKeywords)) {
      continue;
    }

    const reasons = ["recipient"];
    if (subjectMatched) reasons.push("subject");
    if (bodyMatched) reasons.push("content");
    if (rule.attachmentKeywords.length > 0) reasons.push("attachment name");
    reasons.push("pdf attachment");
    if (rule.requireAttachment) reasons.push("has attachment");

    return { rule, reason: reasons.join(" + ") };
  }

  return null;
}

async function persistEmailAttachments(input: {
  connectionId: string;
  emailMessageId: string;
  messageUid: number;
  sourceMailbox: string;
  attachments: StoredPdfAttachment[];
}): Promise<void> {
  let storedCount = 0;

  for (const attachment of input.attachments) {
    await prisma.emailAttachment.upsert({
      where: {
        emailMessageId_fileHash: {
          emailMessageId: input.emailMessageId,
          fileHash: attachment.fileHash,
        },
      },
      update: {
        filename: attachment.filename,
        contentType: attachment.contentType,
        fileSize: attachment.fileSize,
        storagePath: attachment.storagePath,
        publicUrl: attachment.publicUrl,
      },
      create: {
        emailMessageId: input.emailMessageId,
        filename: attachment.filename,
        contentType: attachment.contentType,
        fileSize: attachment.fileSize,
        fileHash: attachment.fileHash,
        storagePath: attachment.storagePath,
        publicUrl: attachment.publicUrl,
      },
    });
    storedCount += 1;
  }

  await writeEmailGatewayLog({
    connectionId: input.connectionId,
    level: "STORE",
    event: "ATTACHMENTS_STORED",
    message: `${storedCount} attachment record(s) upserted for email message.`,
    metadata: {
      emailMessageId: input.emailMessageId,
      uid: input.messageUid,
      mailbox: input.sourceMailbox,
      fileHashes: input.attachments.map((attachment) => attachment.fileHash),
    },
  });
}

async function triggerOcrForStoredAttachments(input: {
  connectionId: string;
  emailMessageId: string;
  attachments: StoredPdfAttachment[];
}): Promise<void> {
  for (const attachment of input.attachments) {
    const ocrJob = await prisma.ocrJob.create({
      data: {
        provider: SNAPTEXT_PROVIDER,
        emailMessageId: input.emailMessageId,
        pdfUrl: attachment.publicUrl,
        filename: attachment.filename,
        fileSize: attachment.fileSize,
        fileHash: attachment.fileHash,
        status: "PROCESSING",
      },
    });

    await writeEmailGatewayLog({
      connectionId: input.connectionId,
      level: "SYNC",
      event: "OCR_TRIGGERED",
      message: "PDF attachment submitted to Snaptext OCR.",
      metadata: { ocrJobId: ocrJob.id, filename: attachment.filename, publicUrl: attachment.publicUrl },
    });

    try {
      const providerJob = await createSnaptextOcrJob({
        pdfUrl: attachment.publicUrl,
        filename: attachment.filename,
        fileSize: attachment.fileSize,
        fileHash: attachment.fileHash,
        emailMessageId: input.emailMessageId,
        ocrJobId: ocrJob.id,
      });
      const rawResult = extractSnaptextResult(providerJob);
      const mappedStatus = mapProviderStatus(providerJob.status, rawResult);
      const normalizedResult = rawResult === null ? null : normalizeSnaptextResult(rawResult);
      const hasResult = normalizedResult !== null && normalizedResult !== undefined;
      const providerJobId = getSnaptextProviderJobId(providerJob);

      await prisma.ocrJob.update({
        where: { id: ocrJob.id },
        data: {
          providerJobId,
          providerStatus: providerJob.status,
          status: mappedStatus,
          response: providerJob as InputJsonValue,
          ...(hasResult ? { result: normalizedResult as InputJsonValue, resultReceivedAt: new Date() } : {}),
        },
      });
      await prisma.emailMessage.update({
        where: { id: input.emailMessageId },
        data: {
          ocrJobId: ocrJob.id,
          ocr: mappedStatus === "COMPLETED",
          ocrStatus: mappedStatus,
        },
      });
      await writeEmailGatewayLog({
        connectionId: input.connectionId,
        level: "OK",
        event: "OCR_ACCEPTED",
        message: "Snaptext OCR job accepted successfully.",
        metadata: { ocrJobId: ocrJob.id, providerJobId: providerJobId ?? null, status: mappedStatus },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message.slice(0, 500) : "OCR submission failed.";
      await prisma.ocrJob.update({
        where: { id: ocrJob.id },
        data: { status: "FAILED", errorMessage },
      });
      await prisma.emailMessage.update({
        where: { id: input.emailMessageId },
        data: {
          ocrJobId: ocrJob.id,
          ocr: false,
          ocrStatus: "FAILED",
        },
      });
      await writeEmailGatewayLog({
        connectionId: input.connectionId,
        level: "ERROR",
        event: "OCR_FAILED",
        message: "Snaptext OCR submission failed.",
        metadata: { ocrJobId: ocrJob.id, filename: attachment.filename, error: errorMessage },
      });
    }
  }
}

function buildConfigFromRecord(record: {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  mailbox: string;
  secure: boolean;
  onlyUnread: boolean;
}): MailServerConnectionInput {
  return {
    name: record.name,
    host: record.host,
    port: record.port,
    username: record.username,
    password: decryptSecret(record.password),
    mailbox: record.mailbox,
    secure: record.secure,
    onlyUnread: record.onlyUnread,
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
    onlyUnread: formData.get("onlyUnread") ?? "false",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid mail server payload." };
  }

  try {
    await writeEmailGatewayLog({
      level: "INFO",
      event: "CONNECT_ATTEMPT",
      message: `Testing IMAP connection to ${parsed.data.host}:${parsed.data.port}/${parsed.data.mailbox}`,
      metadata: { host: parsed.data.host, port: parsed.data.port, mailbox: parsed.data.mailbox },
    });
    await verifyMailServerConnection(parsed.data);

    const createdConnection = await prisma.mailServerConnection.create({
      data: {
        ...parsed.data,
        password: encryptSecret(parsed.data.password),
        status: "CONNECTED",
        lastError: null,
      },
    });
    await writeEmailGatewayLog({
      connectionId: createdConnection.id,
      level: "OK",
      event: "CONNECT_SUCCESS",
      message: "Mail server connected and mailbox opened successfully.",
      metadata: { host: parsed.data.host, mailbox: parsed.data.mailbox },
    });

    revalidatePath("/dashboard/mail-server");
    return { message: "Mail server connected and saved." };
  } catch (error) {
    const safeError = error instanceof Error ? error.message : "Unable to connect mail server.";

    try {
      const failedConnection = await prisma.mailServerConnection.create({
        data: {
          ...parsed.data,
          password: encryptSecret(parsed.data.password),
          status: "ERROR",
          lastError: safeError.slice(0, 500),
        },
      });
      await writeEmailGatewayLog({
        connectionId: failedConnection.id,
        level: "ERROR",
        event: "CONNECT_FAILED",
        message: "Mail server connection failed.",
        metadata: { error: safeError.slice(0, 500), host: parsed.data.host, mailbox: parsed.data.mailbox },
      });
    } catch {
      return { error: "Mail server failed and database is not ready. Check DATABASE_URL and DIRECT_URL." };
    }

    revalidatePath("/dashboard/mail-server");
    return { error: "Mail server connection failed. Check host, port, credential, and mailbox." };
  }
}

export async function updateMailServerAction(formData: FormData): Promise<void> {
  if (!(await isAuthenticated())) {
    return;
  }

  const parsed = updateMailServerConnectionSchema.safeParse({
    connectionId: formData.get("connectionId"),
    name: formData.get("name"),
    host: formData.get("host"),
    port: formData.get("port"),
    username: formData.get("username"),
    password: formData.get("password") || undefined,
    mailbox: formData.get("mailbox"),
    secure: formData.get("secure") ?? "false",
    onlyUnread: formData.get("onlyUnread") ?? "false",
  });

  if (!parsed.success) {
    return;
  }

  const existing = await prisma.mailServerConnection.findUnique({
    where: { id: parsed.data.connectionId },
  });

  if (!existing) {
    return;
  }

  const password = parsed.data.password?.trim()
    ? parsed.data.password
    : decryptSecret(existing.password);
  const config: MailServerConnectionInput = {
    name: parsed.data.name,
    host: parsed.data.host,
    port: parsed.data.port,
    username: parsed.data.username,
    password,
    mailbox: parsed.data.mailbox,
    secure: parsed.data.secure,
    onlyUnread: parsed.data.onlyUnread,
  };

  try {
    await writeEmailGatewayLog({
      connectionId: existing.id,
      level: "INFO",
      event: "UPDATE_CONNECT_TEST",
      message: "Testing updated IMAP configuration before saving.",
      metadata: { host: config.host, port: config.port, mailbox: config.mailbox },
    });
    await verifyMailServerConnection(config);

    await prisma.mailServerConnection.update({
      where: { id: existing.id },
      data: {
        name: config.name,
        host: config.host,
        port: config.port,
        username: config.username,
        password: encryptSecret(password),
        mailbox: config.mailbox,
        secure: config.secure,
        onlyUnread: config.onlyUnread,
        status: "CONNECTED",
        lastError: null,
      },
    });

    await writeEmailGatewayLog({
      connectionId: existing.id,
      level: "OK",
      event: "UPDATE_CONNECT_SUCCESS",
      message: "Updated IMAP configuration saved successfully.",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message.slice(0, 500) : "Update failed.";
    await prisma.mailServerConnection.update({
      where: { id: existing.id },
      data: { status: "ERROR", lastError: errorMessage },
    });
    await writeEmailGatewayLog({
      connectionId: existing.id,
      level: "ERROR",
      event: "UPDATE_CONNECT_FAILED",
      message: "Updated IMAP configuration failed connection test.",
      metadata: { error: errorMessage },
    });
  }

  revalidatePath("/dashboard/mail-server");
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
    await writeEmailGatewayLog({
      connectionId: connection.id,
      level: "SYNC",
      event: "SYNC_STARTED",
      message: "Mailbox sync started. Searching latest messages across configured folders.",
      metadata: { mailbox: connection.mailbox, host: connection.host, onlyUnread: connection.onlyUnread },
    });
    const config = buildConfigFromRecord(connection);
    const availableMailboxes = await listMailServerMailboxes(config);
    await writeEmailGatewayLog({
      connectionId: connection.id,
      level: "INFO",
      event: "MAILBOXES_DISCOVERED",
      message: `${availableMailboxes.length} mailbox folder(s) discovered from IMAP server.`,
      metadata: { availableMailboxes: availableMailboxes.slice(0, 40), configuredMailboxes: connection.mailbox },
    });
    const messages = await fetchRecentMailMessages(config);
    await writeEmailGatewayLog({
      connectionId: connection.id,
      level: "INFO",
      event: "MESSAGES_FETCHED",
      message: `${messages.length} recent message(s) fetched from IMAP.`,
      metadata: { fetched: messages.length, recipients: messages.flatMap((message) => message.recipientEmails).slice(0, 20) },
    });

    const existingMessages = messages.length > 0
      ? await prisma.emailMessage.findMany({
        where: {
          OR: messages.map((message) => ({
            connectionId: connection.id,
            sourceMailbox: message.sourceMailbox,
            messageUid: message.uid,
          })),
        },
        select: {
          sourceMailbox: true,
          messageUid: true,
        },
      })
      : [];
    const existingMessageKeys = new Set(
      existingMessages.map((message) => `${message.sourceMailbox}:${message.messageUid}`),
    );
    const newMessages = messages.filter(
      (message) => !existingMessageKeys.has(`${message.sourceMailbox}:${message.uid}`),
    );

    await writeEmailGatewayLog({
      connectionId: connection.id,
      level: newMessages.length > 0 ? "INFO" : "OK",
      event: "NEW_MESSAGES_FILTERED",
      message: `${newMessages.length} new message(s) remain after skipping already stored messages.`,
      metadata: { fetched: messages.length, skippedExisting: messages.length - newMessages.length, newMessages: newMessages.length },
    });

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
    await writeEmailGatewayLog({
      connectionId: connection.id,
      level: "INFO",
      event: "RULES_LOADED",
      message: `${activeRecipientRules.length} active catch rule(s) loaded.`,
      metadata: { activeRules: activeRecipientRules.length },
    });
    const matchedMessages = messages
      .map((message) => ({ message, match: matchMessageToRule(message, activeRecipientRules) }))
      .filter((item): item is { message: typeof messages[number]; match: RuleMatchResult } => Boolean(item.match));
    await writeEmailGatewayLog({
      connectionId: connection.id,
      level: matchedMessages.length > 0 ? "MATCH" : "WARN",
      event: "MESSAGES_MATCHED",
      message: `${matchedMessages.length} message(s) matched recipient/content/attachment rules.`,
      metadata: { matched: matchedMessages.length, fetched: messages.length, newMessages: newMessages.length, checkedRecipients: messages.flatMap((message) => message.recipientEmails).slice(0, 20) },
    });

    const storedMatches: Array<{
      message: typeof messages[number];
      match: RuleMatchResult;
      attachments: StoredPdfAttachment[];
    }> = [];

    for (const item of matchedMessages) {
      const alreadyStored = await prisma.emailMessage.findUnique({
        where: {
          connectionId_sourceMailbox_messageUid: {
            connectionId: connection.id,
            sourceMailbox: item.message.sourceMailbox,
            messageUid: item.message.uid,
          },
        },
        select: { id: true },
      });

      const attachments: StoredPdfAttachment[] = [];

      if (alreadyStored) {
        for (const attachment of item.message.pdfAttachments) {
          attachments.push(await uploadPdfAttachment({
            messageUid: item.message.uid,
            filename: attachment.filename,
            contentType: attachment.contentType,
            content: attachment.content,
            connectionId: connection.id,
            sourceMailbox: item.message.sourceMailbox,
          }));
        }

        await persistEmailAttachments({
          connectionId: connection.id,
          emailMessageId: alreadyStored.id,
          messageUid: item.message.uid,
          sourceMailbox: item.message.sourceMailbox,
          attachments,
        });
        await writeEmailGatewayLog({
          connectionId: connection.id,
          level: "OK",
          event: "MESSAGE_ALREADY_STORED",
          message: "Matched email already exists; attachment records were checked and backfilled if missing.",
          metadata: { uid: item.message.uid, mailbox: item.message.sourceMailbox, attachmentCount: attachments.length },
        });
        continue;
      }

      for (const attachment of item.message.pdfAttachments) {
        attachments.push(await uploadPdfAttachment({
          messageUid: item.message.uid,
          filename: attachment.filename,
          contentType: attachment.contentType,
          content: attachment.content,
          connectionId: connection.id,
          sourceMailbox: item.message.sourceMailbox,
        }));
      }

      if (attachments.length > 0) {
        storedMatches.push({ ...item, attachments });
        await writeEmailGatewayLog({
          connectionId: connection.id,
          level: "STORE",
          event: "PDF_UPLOADED",
          message: `${attachments.length} PDF attachment(s) uploaded to public storage.`,
          metadata: { uid: item.message.uid, mailbox: item.message.sourceMailbox, files: attachments.map((attachment) => attachment.filename) },
        });
      } else {
        await writeEmailGatewayLog({
          connectionId: connection.id,
          level: "WARN",
          event: "NO_PDF_ATTACHMENT",
          message: "Matched email skipped because no PDF attachment was stored.",
          metadata: { uid: item.message.uid, mailbox: item.message.sourceMailbox, subject: item.message.subject },
        });
      }
    }

    for (const { message, match, attachments } of storedMatches) {
      const savedMessage = await prisma.emailMessage.upsert({
        where: {
          connectionId_sourceMailbox_messageUid: {
            connectionId: connection.id,
            sourceMailbox: message.sourceMailbox,
            messageUid: message.uid,
          },
        },
        update: {
          messageId: message.messageId,
          sourceMailbox: message.sourceMailbox,
          fromEmail: message.fromEmail,
          toEmail: message.recipientEmails.join(", "),
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
          sourceMailbox: message.sourceMailbox,
          messageId: message.messageId,
          fromEmail: message.fromEmail,
          toEmail: message.recipientEmails.join(", "),
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

      await persistEmailAttachments({
        connectionId: connection.id,
        emailMessageId: savedMessage.id,
        messageUid: message.uid,
        sourceMailbox: message.sourceMailbox,
        attachments,
      });
      await writeEmailGatewayLog({
        connectionId: connection.id,
        level: "STORE",
        event: "MESSAGE_STORED",
        message: "Email message saved to OCR queue with OCR false.",
        metadata: { uid: message.uid, mailbox: message.sourceMailbox, messageId: savedMessage.id, category: match.rule.category },
      });
      await triggerOcrForStoredAttachments({
        connectionId: connection.id,
        emailMessageId: savedMessage.id,
        attachments,
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
    await writeEmailGatewayLog({
      connectionId: connection.id,
      level: "OK",
      event: "SYNC_COMPLETED",
      message: `Mailbox sync completed. ${storedMatches.length} message(s) stored to queue.`,
      metadata: { stored: storedMatches.length, matched: matchedMessages.length, fetched: messages.length, newMessages: newMessages.length },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message.slice(0, 500) : "Sync failed.";
    await writeEmailGatewayLog({
      connectionId: connection.id,
      level: "ERROR",
      event: "SYNC_FAILED",
      message: "Mailbox sync failed.",
      metadata: { error: errorMessage },
    });
    await prisma.mailServerConnection.update({
      where: { id: connection.id },
      data: {
        status: "ERROR",
        lastError: errorMessage,
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
