import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { isPdfAttachment } from "@/lib/pdf-storage";
import type { MailServerConnectionInput } from "@/lib/validations/mail-server";

export interface FetchedPdfAttachment {
  filename: string;
  contentType: string;
  content: Buffer;
}

export interface FetchedMailMessage {
  uid: number;
  messageId?: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  bodyText: string;
  bodyPreview: string;
  receivedAt: Date;
  hasAttachments: boolean;
  attachmentCount: number;
  attachmentNames: string[];
  pdfAttachments: FetchedPdfAttachment[];
}

interface ImapAddress {
  address?: string;
}

interface ImapEnvelope {
  messageId?: string;
  subject?: string;
  date?: Date;
  from?: ImapAddress[];
  to?: ImapAddress[];
}

interface ImapFetchMessage {
  uid: number;
  envelope?: ImapEnvelope;
  source?: Buffer;
}

function createClient(config: MailServerConnectionInput): ImapFlow {
  return new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.username,
      pass: config.password,
    },
    logger: false,
  });
}

function firstAddress(addresses: ImapAddress[] | undefined): string {
  return addresses?.find((address) => address.address)?.address ?? "unknown@unknown.local";
}

function normalizePreview(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 500);
}

export async function verifyMailServerConnection(
  config: MailServerConnectionInput,
): Promise<void> {
  const client = createClient(config);

  try {
    await client.connect();
    await client.mailboxOpen(config.mailbox);
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export async function fetchRecentMailMessages(
  config: MailServerConnectionInput,
): Promise<FetchedMailMessage[]> {
  const client = createClient(config);

  try {
    await client.connect();
    await client.mailboxOpen(config.mailbox);

    const uids = await client.search({ seen: false });
    if (!uids || uids.length === 0) {
      return [];
    }

    const messages: FetchedMailMessage[] = [];
    const latestUids = uids.slice(-25);

    for await (const message of client.fetch(latestUids, {
      envelope: true,
      source: true,
      uid: true,
    }) as AsyncIterable<ImapFetchMessage>) {
      const parsedMail = await simpleParser(message.source ?? Buffer.from(""));
      const pdfAttachments = parsedMail.attachments
        .filter((attachment) => isPdfAttachment(attachment.filename ?? "document.pdf", attachment.contentType ?? ""))
        .map((attachment, index) => ({
          filename: attachment.filename?.trim() || `attachment-${index + 1}.pdf`,
          contentType: attachment.contentType || "application/pdf",
          content: attachment.content,
        }));
      const htmlText = typeof parsedMail.html === "string" ? parsedMail.html.replace(/<[^>]*>/g, " ") : "";
      const bodyText = parsedMail.text ?? htmlText;

      messages.push({
        uid: message.uid,
        messageId: parsedMail.messageId ?? message.envelope?.messageId,
        fromEmail: parsedMail.from?.value[0]?.address ?? firstAddress(message.envelope?.from),
        toEmail: parsedMail.to && !Array.isArray(parsedMail.to)
          ? parsedMail.to.value[0]?.address ?? firstAddress(message.envelope?.to)
          : firstAddress(message.envelope?.to),
        subject: parsedMail.subject ?? message.envelope?.subject ?? "No subject",
        bodyText,
        bodyPreview: normalizePreview(bodyText),
        receivedAt: parsedMail.date ?? message.envelope?.date ?? new Date(),
        hasAttachments: pdfAttachments.length > 0,
        attachmentCount: pdfAttachments.length,
        attachmentNames: pdfAttachments.map((attachment) => attachment.filename),
        pdfAttachments,
      });
    }

    return messages;
  } finally {
    await client.logout().catch(() => undefined);
  }
}
