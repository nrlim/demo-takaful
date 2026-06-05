import type { InputJsonValue } from "@prisma/client/runtime/client";
import { apiError, validateBearerToken } from "@/lib/api-auth";
import { normalizeSnaptextResult } from "@/lib/ocr-schema";
import { prisma } from "@/lib/prisma";
import { snaptextWebhookResultSchema } from "@/lib/validations/ocr-result";

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
  const parsed = snaptextWebhookResultSchema.safeParse(body);

  if (!parsed.success) {
    return apiError("Invalid OCR result payload", "INVALID_PAYLOAD", 400);
  }

  const providerJobId = parsed.data.providerJobId ?? parsed.data.jobId ?? parsed.data.id;
  const status = mapStatus(parsed.data.status);
  const rawResult = parsed.data.result ?? parsed.data.data ?? parsed.data.output ?? parsed.data.extraction ?? parsed.data;
  const normalizedResult = normalizeSnaptextResult(rawResult);
  const job = await prisma.ocrJob.update({
    where: { id: jobId },
    data: {
      providerJobId,
      providerStatus: parsed.data.status,
      status,
      response: parsed.data as InputJsonValue,
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
