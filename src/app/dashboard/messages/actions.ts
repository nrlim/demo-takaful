"use server";

import type { InputJsonValue } from "@prisma/client/runtime/client";
import { revalidatePath } from "next/cache";
import { writeEmailGatewayLog } from "@/lib/email-gateway-log";
import { isAuthenticated } from "@/lib/auth";
import { normalizeSnaptextResult } from "@/lib/ocr-schema";
import { prisma } from "@/lib/prisma";
import { createSnaptextOcrJob, mapProviderStatus, SNAPTEXT_PROVIDER } from "@/lib/snaptext";

export async function triggerPendingOcrMessagesAction(): Promise<void> {
  if (!(await isAuthenticated())) {
    return;
  }

  const messages = await prisma.emailMessage.findMany({
    where: {
      hasAttachments: true,
      ocrStatus: { in: ["PENDING", "FAILED"] },
    },
    include: {
      attachments: true,
    },
    orderBy: { receivedAt: "asc" },
    take: 20,
  });

  for (const message of messages) {
    if (message.attachments.length === 0) {
      continue;
    }

    await prisma.emailMessage.update({
      where: { id: message.id },
      data: { ocrStatus: "PROCESSING", ocr: false },
    });

    for (const attachment of message.attachments) {
      const ocrJob = await prisma.ocrJob.create({
        data: {
          provider: SNAPTEXT_PROVIDER,
          emailMessageId: message.id,
          pdfUrl: attachment.publicUrl,
          filename: attachment.filename,
          fileSize: attachment.fileSize,
          fileHash: attachment.fileHash,
          status: "PROCESSING",
        },
      });

      await writeEmailGatewayLog({
        connectionId: message.connectionId,
        level: "SYNC",
        event: "OCR_RETRY_TRIGGERED",
        message: "Pending message PDF submitted to Snaptext OCR.",
        metadata: { messageId: message.id, ocrJobId: ocrJob.id, filename: attachment.filename },
      });

      try {
        const providerJob = await createSnaptextOcrJob({
          pdfUrl: attachment.publicUrl,
          filename: attachment.filename,
          fileSize: attachment.fileSize,
          fileHash: attachment.fileHash,
          emailMessageId: message.id,
          ocrJobId: ocrJob.id,
        });
        const mappedStatus = mapProviderStatus(providerJob.status);
        const normalizedResult = normalizeSnaptextResult(providerJob);
        const providerJobId = typeof providerJob.id === "string"
          ? providerJob.id
          : typeof providerJob.jobId === "string"
            ? providerJob.jobId
            : undefined;

        await prisma.ocrJob.update({
          where: { id: ocrJob.id },
          data: {
            providerJobId,
            providerStatus: providerJob.status,
            status: mappedStatus,
            response: providerJob as InputJsonValue,
            result: normalizedResult as InputJsonValue,
            resultReceivedAt: normalizedResult ? new Date() : null,
          },
        });
        await prisma.emailMessage.update({
          where: { id: message.id },
          data: {
            ocrJobId: ocrJob.id,
            ocr: mappedStatus === "COMPLETED",
            ocrStatus: mappedStatus,
          },
        });
        await writeEmailGatewayLog({
          connectionId: message.connectionId,
          level: "OK",
          event: "OCR_RETRY_ACCEPTED",
          message: "Snaptext OCR retry accepted successfully.",
          metadata: { messageId: message.id, ocrJobId: ocrJob.id, providerJobId: providerJobId ?? null, status: mappedStatus },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message.slice(0, 500) : "OCR submission failed.";
        await prisma.ocrJob.update({
          where: { id: ocrJob.id },
          data: { status: "FAILED", errorMessage },
        });
        await prisma.emailMessage.update({
          where: { id: message.id },
          data: {
            ocrJobId: ocrJob.id,
            ocr: false,
            ocrStatus: "FAILED",
          },
        });
        await writeEmailGatewayLog({
          connectionId: message.connectionId,
          level: "ERROR",
          event: "OCR_RETRY_FAILED",
          message: "Snaptext OCR retry submission failed.",
          metadata: { messageId: message.id, ocrJobId: ocrJob.id, filename: attachment.filename, error: errorMessage },
        });
      }
    }
  }

  revalidatePath("/dashboard/messages");
  revalidatePath("/dashboard/ocr-results");
}
