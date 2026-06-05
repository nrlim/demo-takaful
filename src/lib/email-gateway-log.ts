import type { InputJsonValue } from "@prisma/client/runtime/client";
import { prisma } from "@/lib/prisma";

export type EmailGatewayLogLevel = "INFO" | "OK" | "WARN" | "ERROR" | "SYNC" | "MATCH" | "STORE";

interface EmailGatewayLogInput {
  connectionId?: string;
  level: EmailGatewayLogLevel;
  event: string;
  message: string;
  metadata?: Record<string, string | number | boolean | null | string[]>;
}

export async function writeEmailGatewayLog(input: EmailGatewayLogInput): Promise<void> {
  await prisma.emailGatewayLog.create({
    data: {
      connectionId: input.connectionId,
      level: input.level,
      event: input.event,
      message: input.message,
      metadata: input.metadata as InputJsonValue | undefined,
    },
  }).catch(() => undefined);
}
