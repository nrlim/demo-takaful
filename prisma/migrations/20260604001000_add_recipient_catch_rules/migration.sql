CREATE TABLE "RecipientCatchRule" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "matchedToday" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecipientCatchRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RecipientCatchRule_email_key" ON "RecipientCatchRule"("email");
CREATE INDEX "RecipientCatchRule_enabled_idx" ON "RecipientCatchRule"("enabled");
CREATE INDEX "RecipientCatchRule_category_idx" ON "RecipientCatchRule"("category");
