ALTER TABLE "EmailMessage" ADD COLUMN "sourceMailbox" TEXT NOT NULL DEFAULT 'INBOX';
DROP INDEX IF EXISTS "EmailMessage_connectionId_messageUid_key";
DROP INDEX IF EXISTS "EmailMessage_connectionId_receivedAt_idx";
CREATE UNIQUE INDEX "EmailMessage_connectionId_sourceMailbox_messageUid_key" ON "EmailMessage"("connectionId", "sourceMailbox", "messageUid");
CREATE INDEX "EmailMessage_connectionId_sourceMailbox_receivedAt_idx" ON "EmailMessage"("connectionId", "sourceMailbox", "receivedAt");
