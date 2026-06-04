ALTER TABLE "RecipientCatchRule"
  ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "requireAttachment" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "subjectKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "bodyKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "attachmentKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

DROP INDEX IF EXISTS "RecipientCatchRule_enabled_idx";
CREATE INDEX "RecipientCatchRule_enabled_priority_idx" ON "RecipientCatchRule"("enabled", "priority");

ALTER TABLE "EmailMessage"
  ADD COLUMN "bodyPreview" TEXT,
  ADD COLUMN "attachmentNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "matchedRuleId" TEXT,
  ADD COLUMN "matchedCategory" TEXT,
  ADD COLUMN "matchReason" TEXT;
