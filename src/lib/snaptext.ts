import { takafulApplicationOcrSchema } from "@/lib/ocr-schema";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/secret-crypto";
import type { SnaptextOcrJobInput } from "@/lib/validations/ocr-job";

export const SNAPTEXT_PROVIDER = "snaptext";
export const SNAPTEXT_DEFAULT_ENDPOINT = "https://snaptextid.vercel.app/api/v1/jobs";

export interface SnaptextJobResponse {
  id?: string;
  jobId?: string;
  status?: string;
  [key: string]: unknown;
}

export async function getSnaptextConfiguration(): Promise<{
  endpoint: string;
  apiKey: string;
} | null> {
  const config = await prisma.integrationConfiguration.findUnique({
    where: { provider: SNAPTEXT_PROVIDER },
  });

  if (!config || !config.enabled) {
    return null;
  }

  return {
    endpoint: config.endpoint,
    apiKey: decryptSecret(config.apiKey),
  };
}

export async function createSnaptextOcrJob(
  input: SnaptextOcrJobInput,
): Promise<SnaptextJobResponse> {
  const config = await getSnaptextConfiguration();

  if (!config) {
    throw new Error("Snaptext configuration is not enabled.");
  }

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pdfUrl: input.pdfUrl,
      filename: input.filename,
      fileSize: input.fileSize,
      fileHash: input.fileHash,
      schema: takafulApplicationOcrSchema,
    }),
  });

  const responseBody = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `Snaptext API returned ${response.status}: ${JSON.stringify(responseBody).slice(0, 500)}`,
    );
  }

  return responseBody as SnaptextJobResponse;
}

export function mapProviderStatus(status: string | undefined): "PROCESSING" | "COMPLETED" {
  const normalizedStatus = status?.toLowerCase() ?? "processing";

  if (["completed", "complete", "succeeded", "success", "done"].includes(normalizedStatus)) {
    return "COMPLETED";
  }

  return "PROCESSING";
}
