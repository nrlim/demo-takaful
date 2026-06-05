"use server";

import type { InputJsonValue } from "@prisma/client/runtime/client";
import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import { writeEmailGatewayLog } from "@/lib/email-gateway-log";
import { normalizeSnaptextResult } from "@/lib/ocr-schema";
import { prisma } from "@/lib/prisma";
import { fetchSnaptextOcrJobResult, mapProviderStatus } from "@/lib/snaptext";

export async function refreshSnaptextResultsAction(): Promise<void> {
  if (!(await isAuthenticated())) {
    return;
  }

  const jobs = await prisma.ocrJob.findMany({
    where: {
      providerJobId: { not: null },
      status: { in: ["PROCESSING", "PENDING"] },
    },
    orderBy: { updatedAt: "asc" },
    take: 25,
  });

  for (const job of jobs) {
    if (!job.providerJobId) {
      continue;
    }

    try {
      const providerJob = await fetchSnaptextOcrJobResult(job.providerJobId);
      const mappedStatus = mapProviderStatus(providerJob.status);
      const normalizedResult = normalizeSnaptextResult(providerJob);
      const hasResult = normalizedResult !== null && normalizedResult !== undefined;

      await prisma.ocrJob.update({
        where: { id: job.id },
        data: {
          providerStatus: providerJob.status,
          status: mappedStatus,
          response: providerJob as InputJsonValue,
          ...(hasResult ? { result: normalizedResult as InputJsonValue } : {}),
          ...(mappedStatus === "COMPLETED" || hasResult ? { resultReceivedAt: new Date() } : {}),
        },
      });

      let connectionId: string | undefined;
      if (job.emailMessageId) {
        const message = await prisma.emailMessage.update({
          where: { id: job.emailMessageId },
          data: {
            ocrJobId: job.id,
            ocr: mappedStatus === "COMPLETED",
            ocrStatus: mappedStatus,
          },
          select: { connectionId: true },
        }).catch(() => null);
        connectionId = message?.connectionId;
      }

      await writeEmailGatewayLog({
        connectionId,
        level: "OK",
        event: "OCR_RESULT_REFRESHED",
        message: "OCR job result refreshed from engine API.",
        metadata: { ocrJobId: job.id, providerJobId: job.providerJobId, status: mappedStatus },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message.slice(0, 500) : "OCR result refresh failed.";
      await writeEmailGatewayLog({
        level: "ERROR",
        event: "OCR_RESULT_REFRESH_FAILED",
        message: "Failed to refresh OCR job result from engine API.",
        metadata: { ocrJobId: job.id, providerJobId: job.providerJobId, error: errorMessage },
      });
    }
  }

  revalidatePath("/dashboard/ocr-results");
  revalidatePath("/dashboard/messages");
}
