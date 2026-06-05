CREATE TABLE "EmailGatewayLog" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT,
  "level" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailGatewayLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailGatewayLog_connectionId_createdAt_idx" ON "EmailGatewayLog"("connectionId", "createdAt");
CREATE INDEX "EmailGatewayLog_level_createdAt_idx" ON "EmailGatewayLog"("level", "createdAt");
CREATE INDEX "EmailGatewayLog_event_idx" ON "EmailGatewayLog"("event");
