import type { InputJsonValue } from "@prisma/client/runtime/client";
import { apiError, validateBearerToken } from "@/lib/api-auth";
import { logger } from "@/lib/logger";
import { normalizeSnaptextResult } from "@/lib/ocr-schema";
import { prisma } from "@/lib/prisma";
import { createSnaptextOcrJob, mapProviderStatus, SNAPTEXT_PROVIDER } from "@/lib/snaptext";
import { snaptextOcrJobSchema } from "@/lib/validations/ocr-job";

export async function POST(request: Request): Promise<Response> {
  if (!validateBearerToken(request)) {
    return apiError("Unauthorized", "UNAUTHORIZED", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = snaptextOcrJobSchema.safeParse(body);

  if (!parsed.success) {
    return apiError("Invalid OCR job payload", "INVALID_PAYLOAD", 400);
  }

  const createdJob = await prisma.ocrJob.create({
    data: {
      provider: SNAPTEXT_PROVIDER,
      emailMessageId: parsed.data.emailMessageId,
      pdfUrl: parsed.data.pdfUrl,
      filename: parsed.data.filename,
      fileSize: parsed.data.fileSize,
      fileHash: parsed.data.fileHash,
      status: "PROCESSING",
    },
  });

  try {
    const snaptextJob = await createSnaptextOcrJob(parsed.data);
    const mappedStatus = mapProviderStatus(snaptextJob.status);
    const providerJobId = typeof snaptextJob.id === "string"
      ? snaptextJob.id
      : typeof snaptextJob.jobId === "string"
        ? snaptextJob.jobId
        : undefined;

    const normalizedResult = normalizeSnaptextResult(snaptextJob);
    const updatedJob = await prisma.ocrJob.update({
      where: { id: createdJob.id },
      data: {
        providerJobId,
        providerStatus: snaptextJob.status,
        status: mappedStatus,
        response: snaptextJob as InputJsonValue,
        result: normalizedResult as InputJsonValue,
        resultReceivedAt: new Date(),
      },
    });

    if (parsed.data.emailMessageId) {
      await prisma.emailMessage.update({
        where: { id: parsed.data.emailMessageId },
        data: {
          ocrJobId: updatedJob.id,
          ocr: mappedStatus === "COMPLETED",
          ocrStatus: mappedStatus,
        },
      }).catch(() => undefined);
    }

    return Response.json({ job: updatedJob, providerJob: snaptextJob });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Snaptext OCR failed.";

    logger.error("Snaptext OCR job failed", {
      ocrJobId: createdJob.id,
      emailMessageId: parsed.data.emailMessageId,
      filename: parsed.data.filename,
    });

    const failedJob = await prisma.ocrJob.update({
      where: { id: createdJob.id },
      data: {
        status: "FAILED",
        errorMessage: errorMessage.slice(0, 500),
      },
    });

    if (parsed.data.emailMessageId) {
      await prisma.emailMessage.update({
        where: { id: parsed.data.emailMessageId },
        data: {
          ocrJobId: failedJob.id,
          ocr: false,
          ocrStatus: "FAILED",
        },
      }).catch(() => undefined);
    }

    return apiError("OCR failed. Check server logs for details.", "OCR_FAILED", 500);
  }
}
