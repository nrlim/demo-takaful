CREATE TABLE "EmailAttachment" (
  "id" TEXT NOT NULL,
  "emailMessageId" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "fileHash" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "publicUrl" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailAttachment_emailMessageId_fileHash_key" ON "EmailAttachment"("emailMessageId", "fileHash");
CREATE INDEX "EmailAttachment_fileHash_idx" ON "EmailAttachment"("fileHash");
ALTER TABLE "EmailAttachment" ADD CONSTRAINT "EmailAttachment_emailMessageId_fkey" FOREIGN KEY ("emailMessageId") REFERENCES "EmailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
