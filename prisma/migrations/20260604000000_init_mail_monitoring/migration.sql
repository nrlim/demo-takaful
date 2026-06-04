CREATE TYPE "MailConnectionStatus" AS ENUM ('DISCONNECTED', 'CONNECTED', 'ERROR');
CREATE TYPE "MessageOcrStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "MailServerConnection" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "host" TEXT NOT NULL,
  "port" INTEGER NOT NULL,
  "username" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "mailbox" TEXT NOT NULL DEFAULT 'INBOX',
  "secure" BOOLEAN NOT NULL DEFAULT true,
  "status" "MailConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
  "lastError" TEXT,
  "lastSyncAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MailServerConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailMessage" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "messageUid" INTEGER NOT NULL,
  "messageId" TEXT,
  "fromEmail" TEXT NOT NULL,
  "toEmail" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL,
  "hasAttachments" BOOLEAN NOT NULL DEFAULT false,
  "attachmentCount" INTEGER NOT NULL DEFAULT 0,
  "ocr" BOOLEAN NOT NULL DEFAULT false,
  "ocrStatus" "MessageOcrStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MailServerConnection_status_idx" ON "MailServerConnection"("status");
CREATE INDEX "MailServerConnection_updatedAt_idx" ON "MailServerConnection"("updatedAt");
CREATE UNIQUE INDEX "EmailMessage_connectionId_messageUid_key" ON "EmailMessage"("connectionId", "messageUid");
CREATE INDEX "EmailMessage_ocr_receivedAt_idx" ON "EmailMessage"("ocr", "receivedAt");
CREATE INDEX "EmailMessage_connectionId_receivedAt_idx" ON "EmailMessage"("connectionId", "receivedAt");
CREATE INDEX "EmailMessage_fromEmail_idx" ON "EmailMessage"("fromEmail");
CREATE INDEX "EmailMessage_toEmail_idx" ON "EmailMessage"("toEmail");
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "MailServerConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
