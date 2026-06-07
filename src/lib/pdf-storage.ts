import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export interface PdfAttachmentUploadInput {
  messageUid: number;
  filename: string;
  contentType: string;
  content: Buffer;
  connectionId?: string;
  sourceMailbox?: string;
}

export interface StoredPdfAttachment {
  filename: string;
  contentType: string;
  fileSize: number;
  fileHash: string;
  storagePath: string;
  publicUrl: string;
}

const defaultBucket = "ocr-documents";

function getStorageConfig(): {
  url: string;
  serviceRoleKey: string;
  bucket: string;
} {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for PDF storage.");
  }

  return {
    url,
    serviceRoleKey,
    bucket: process.env.SUPABASE_STORAGE_BUCKET ?? defaultBucket,
  };
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120);
}

export function isPdfAttachment(filename: string, contentType: string): boolean {
  return contentType.toLowerCase().includes("pdf") || filename.toLowerCase().endsWith(".pdf");
}

export function createFileHash(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export async function uploadPdfAttachment(
  input: PdfAttachmentUploadInput,
): Promise<StoredPdfAttachment> {
  const config = getStorageConfig();
  const supabase = createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false },
  });

  const fileHash = createFileHash(input.content);
  const safeFilename = sanitizeFilename(input.filename);
  const safeConnectionId = input.connectionId ? sanitizeFilename(input.connectionId) : "unknown-connection";
  const safeMailbox = input.sourceMailbox ? sanitizeFilename(input.sourceMailbox) : "unknown-mailbox";
  const storagePath = `mail-attachments/${safeConnectionId}/${safeMailbox}/${input.messageUid}/${fileHash}-${safeFilename}`;

  const { error } = await supabase.storage
    .from(config.bucket)
    .upload(storagePath, input.content, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload PDF attachment: ${error.message}`);
  }

  const { data } = supabase.storage.from(config.bucket).getPublicUrl(storagePath);

  return {
    filename: input.filename,
    contentType: "application/pdf",
    fileSize: input.content.byteLength,
    fileHash,
    storagePath,
    publicUrl: data.publicUrl,
  };
}
