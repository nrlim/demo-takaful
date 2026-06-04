import type { InputJsonValue } from "@prisma/client/runtime/client";
import { apiError, validateBearerToken } from "@/lib/api-auth";
import { normalizeSnaptextResult } from "@/lib/ocr-schema";
import { prisma } from "@/lib/prisma";
import { snaptextOcrResultSchema } from "@/lib/validations/ocr-result";

function mapStatus(status: string): "PROCESSING" | "COMPLETED" | "FAILED" {
  const normalized = status.toLowerCase();

  if (["completed", "complete", "success", "succeeded", "done"].includes(normalized)) {
    return "COMPLETED";
  }

  if (["failed", "error", "rejected"].includes(normalized)) {
    return "FAILED";
  }

  return "PROCESSING";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<Response> {
  if (!validateBearerToken(request)) {
    return apiError("Unauthorized", "UNAUTHORIZED", 401);
  }

  const { jobId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = snaptextOcrResultSchema.safeParse(body);

  if (!parsed.success) {
    return apiError("Invalid OCR result payload", "INVALID_PAYLOAD", 400);
  }

  const status = mapStatus(parsed.data.status);
  const normalizedResult = normalizeSnaptextResult(parsed.data.result);
  const job = await prisma.ocrJob.update({
    where: { id: jobId },
    data: {
      providerJobId: parsed.data.providerJobId,
      providerStatus: parsed.data.status,
      status,
      result: normalizedResult as InputJsonValue,
      resultReceivedAt: new Date(),
    },
  }).catch(() => null);

  if (!job) {
    return apiError("OCR job not found", "OCR_JOB_NOT_FOUND", 404);
  }

  if (job.emailMessageId) {
    await prisma.emailMessage.update({
      where: { id: job.emailMessageId },
      data: {
        ocrJobId: job.id,
        ocr: status === "COMPLETED",
        ocrStatus: status,
      },
    }).catch(() => undefined);
  }

  return Response.json({ job });
}
