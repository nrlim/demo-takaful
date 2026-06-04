ALTER TABLE "OcrJob"
  ADD COLUMN "result" JSONB,
  ADD COLUMN "resultReceivedAt" TIMESTAMP(3);
