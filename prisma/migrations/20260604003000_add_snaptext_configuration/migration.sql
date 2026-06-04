CREATE TABLE "IntegrationConfiguration" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "apiKey" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "lastTestAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntegrationConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OcrJob" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerJobId" TEXT,
  "emailMessageId" TEXT,
  "pdfUrl" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "fileHash" TEXT NOT NULL,
  "status" "MessageOcrStatus" NOT NULL DEFAULT 'PROCESSING',
  "providerStatus" TEXT,
  "errorMessage" TEXT,
  "response" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OcrJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntegrationConfiguration_provider_key" ON "IntegrationConfiguration"("provider");
CREATE INDEX "IntegrationConfiguration_enabled_idx" ON "IntegrationConfiguration"("enabled");
CREATE INDEX "OcrJob_emailMessageId_idx" ON "OcrJob"("emailMessageId");
CREATE INDEX "OcrJob_status_createdAt_idx" ON "OcrJob"("status", "createdAt");
ALTER TABLE "EmailMessage" ADD COLUMN "ocrJobId" TEXT;
