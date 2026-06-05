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
  sourceMailbox: string;
  messageId?: string;
  fromEmail: string;
  toEmail: string;
  recipientEmails: string[];
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

interface ParsedAddressValue {
  value: Array<{ address?: string }>;
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

function getMailboxes(mailboxConfig: string): string[] {
  return mailboxConfig
    .split(",")
    .map((mailbox) => mailbox.trim())
    .filter((mailbox) => mailbox.length > 0);
}

function firstAddress(addresses: ImapAddress[] | undefined): string {
  return addresses?.find((address) => address.address)?.address ?? "unknown@unknown.local";
}

function normalizeEmail(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const email = value.trim().toLowerCase();
  return email.includes("@") ? email : null;
}

function collectAddressValues(value: unknown): string[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const addressValue = value as ParsedAddressValue;
  return addressValue.value
    .map((item) => normalizeEmail(item.address))
    .filter((email): email is string => Boolean(email));
}

function collectHeaderEmails(headers: Map<string, unknown>): string[] {
  const headerNames = ["delivered-to", "x-original-to", "envelope-to", "resent-to"];
  const emails: string[] = [];

  headerNames.forEach((headerName) => {
    const value = headers.get(headerName);
    if (typeof value === "string") {
      const matches = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
      matches.forEach((match) => {
        const normalized = normalizeEmail(match);
        if (normalized) emails.push(normalized);
      });
    }
  });

  return emails;
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
    const mailboxes = getMailboxes(config.mailbox);
    let openedMailbox = false;

    for (const mailbox of mailboxes) {
      try {
        await client.mailboxOpen(mailbox);
        openedMailbox = true;
        break;
      } catch {
        // Continue trying other configured aliases, for example Junk/Spam folders.
      }
    }

    if (!openedMailbox) {
      throw new Error(`Unable to open configured mailbox list: ${config.mailbox}`);
    }
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export async function listMailServerMailboxes(
  config: MailServerConnectionInput,
): Promise<string[]> {
  const client = createClient(config);

  try {
    await client.connect();
    const mailboxes = await client.list();
    return mailboxes.map((mailbox) => mailbox.path).filter((path) => path.length > 0);
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
    const messages: FetchedMailMessage[] = [];

    for (const mailbox of getMailboxes(config.mailbox)) {
      try {
        await client.mailboxOpen(mailbox);
      } catch {
        continue;
      }

      const uids = await client.search(config.onlyUnread ? { seen: false } : { all: true });
      if (!uids || uids.length === 0) {
        continue;
      }

      const latestUids = uids.slice(-50);

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
        const parsedRecipients = [
          ...collectAddressValues(parsedMail.to),
          ...collectAddressValues(parsedMail.cc),
          ...collectAddressValues(parsedMail.bcc),
          ...collectHeaderEmails(parsedMail.headers),
          ...((message.envelope?.to ?? [])
            .map((address) => normalizeEmail(address.address))
            .filter((email): email is string => Boolean(email))),
        ];
        const recipientEmails = Array.from(new Set(parsedRecipients));
        const fallbackToEmail = normalizeEmail(parsedMail.to && !Array.isArray(parsedMail.to)
          ? parsedMail.to.value[0]?.address
          : undefined) ?? normalizeEmail(firstAddress(message.envelope?.to)) ?? "unknown@unknown.local";

        messages.push({
          uid: message.uid,
          sourceMailbox: mailbox,
          messageId: parsedMail.messageId ?? message.envelope?.messageId,
          fromEmail: parsedMail.from?.value[0]?.address ?? firstAddress(message.envelope?.from),
          toEmail: recipientEmails[0] ?? fallbackToEmail,
          recipientEmails: recipientEmails.length > 0 ? recipientEmails : [fallbackToEmail],
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
    }

    return messages;
  } finally {
    await client.logout().catch(() => undefined);
  }
}
