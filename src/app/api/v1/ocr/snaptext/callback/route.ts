import type { InputJsonValue } from "@prisma/client/runtime/client";
import { apiError, validateBearerToken } from "@/lib/api-auth";
import { writeEmailGatewayLog } from "@/lib/email-gateway-log";
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

function getProviderJobId(input: {
  id?: string;
  jobId?: string;
  providerJobId?: string;
}): string | undefined {
  return input.providerJobId ?? input.jobId ?? input.id;
}

export async function POST(request: Request): Promise<Response> {
  if (!validateBearerToken(request)) {
    return apiError("Unauthorized", "UNAUTHORIZED", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = snaptextWebhookResultSchema.safeParse(body);

  if (!parsed.success) {
    return apiError("Invalid Snaptext callback payload", "INVALID_PAYLOAD", 400);
  }

  const providerJobId = getProviderJobId(parsed.data);
  const middlewareJobId = parsed.data.middlewareJobId ?? parsed.data.metadata?.middlewareJobId;
  const status = mapStatus(parsed.data.status);
  const rawResult = parsed.data.result ?? parsed.data.data ?? parsed.data.output ?? parsed.data.extraction ?? parsed.data;
  const normalizedResult = normalizeSnaptextResult(rawResult);

  const existingJob = middlewareJobId
    ? await prisma.ocrJob.findUnique({ where: { id: middlewareJobId } })
    : providerJobId
      ? await prisma.ocrJob.findFirst({ where: { providerJobId } })
      : null;

  if (!existingJob) {
    await writeEmailGatewayLog({
      level: "ERROR",
      event: "OCR_CALLBACK_JOB_NOT_FOUND",
      message: "Snaptext callback received but no matching OCR job was found.",
      metadata: { providerJobId: providerJobId ?? null, middlewareJobId: middlewareJobId ?? null },
    });
    return apiError("OCR job not found", "OCR_JOB_NOT_FOUND", 404);
  }

  const job = await prisma.ocrJob.update({
    where: { id: existingJob.id },
    data: {
      providerJobId: providerJobId ?? existingJob.providerJobId,
      providerStatus: parsed.data.status,
      status,
      response: parsed.data as InputJsonValue,
      result: normalizedResult as InputJsonValue,
      resultReceivedAt: new Date(),
    },
  });

  let connectionId: string | undefined;
  if (job.emailMessageId) {
    const message = await prisma.emailMessage.update({
      where: { id: job.emailMessageId },
      data: {
        ocrJobId: job.id,
        ocr: status === "COMPLETED",
        ocrStatus: status,
      },
      select: { connectionId: true },
    }).catch(() => null);
    connectionId = message?.connectionId;
  }

  await writeEmailGatewayLog({
    connectionId,
    level: "OK",
    event: "OCR_CALLBACK_RECEIVED",
    message: "Snaptext OCR result callback stored successfully.",
    metadata: { ocrJobId: job.id, providerJobId: providerJobId ?? null, status },
  });

  return Response.json({ job });
}
