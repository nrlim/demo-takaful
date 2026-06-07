import { takafulApplicationOcrSchema } from "@/lib/ocr-schema";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/secret-crypto";
import { SNAPTEXT_DEFAULT_ENDPOINT, SNAPTEXT_PROVIDER } from "@/lib/snaptext-constants";
import type { SnaptextOcrJobInput } from "@/lib/validations/ocr-job";
import { normalizeSnaptextOcrModelId, type SnaptextOcrModelId } from "@/lib/validations/snaptext-configuration";

export { SNAPTEXT_DEFAULT_ENDPOINT, SNAPTEXT_PROVIDER };

export interface SnaptextJobResponse {
  id?: string;
  jobId?: string;
  runId?: string;
  status?: string;
  [key: string]: unknown;
}

export type MappedProviderStatus = "PROCESSING" | "COMPLETED" | "FAILED";

function getPublicBaseUrl(): string | null {
  const configuredUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return null;
}

function buildCallbackUrl(ocrJobId?: string): string | null {
  const baseUrl = getPublicBaseUrl();
  if (!baseUrl) {
    return null;
  }

  return ocrJobId
    ? `${baseUrl}/api/v1/ocr/jobs/${ocrJobId}/result`
    : `${baseUrl}/api/v1/ocr/snaptext/callback`;
}

function buildCallbackHeaders(): Record<string, string> | undefined {
  const token = process.env.API_AUTH_TOKEN;
  if (!token) {
    return undefined;
  }

  return { Authorization: `Bearer ${token}` };
}

export async function getSnaptextConfiguration(): Promise<{
  endpoint: string;
  apiKey: string;
  ocrModelId: SnaptextOcrModelId | null;
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
    ocrModelId: normalizeSnaptextOcrModelId(config.ocrModelId),
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
      ocrModelId: config.ocrModelId,
      jsonSchema: takafulApplicationOcrSchema,
      callbackUrl: buildCallbackUrl(input.ocrJobId),
      webhookUrl: buildCallbackUrl(input.ocrJobId),
      callbackHeaders: buildCallbackHeaders(),
      webhookHeaders: buildCallbackHeaders(),
      metadata: {
        middlewareJobId: input.ocrJobId,
        emailMessageId: input.emailMessageId,
      },
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

export async function fetchSnaptextOcrJobResult(providerJobId: string): Promise<SnaptextJobResponse> {
  const config = await getSnaptextConfiguration();

  if (!config) {
    throw new Error("Snaptext configuration is not enabled.");
  }

  const baseEndpoint = config.endpoint.replace(/\/$/, "");
  const encodedJobId = encodeURIComponent(providerJobId);
  const endpoints = [
    `${baseEndpoint}/${encodedJobId}`,
    `${baseEndpoint}/${encodedJobId}/result`,
    `${baseEndpoint}?jobId=${encodedJobId}`,
  ];
  let lastErrorBody: unknown = null;
  let lastStatus = 0;

  for (const endpoint of endpoints) {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
    });
    const responseBody = await response.json().catch(() => ({}));

    if (response.ok) {
      return responseBody as SnaptextJobResponse;
    }

    lastStatus = response.status;
    lastErrorBody = responseBody;

    if (response.status !== 404 && response.status !== 405) {
      break;
    }
  }

  throw new Error(
    `Snaptext API returned ${lastStatus}: ${JSON.stringify(lastErrorBody).slice(0, 500)}`,
  );
}

export function getSnaptextProviderJobId(response: SnaptextJobResponse): string | undefined {
  return typeof response.jobId === "string"
    ? response.jobId
    : typeof response.id === "string"
      ? response.id
      : undefined;
}

export function extractSnaptextResult(response: unknown): unknown | null {
  if (!response || typeof response !== "object") {
    return null;
  }

  const record = response as Record<string, unknown>;
  const result = record.result
    ?? record.data
    ?? record.output
    ?? record.extraction
    ?? record.extractedData
    ?? record.json
    ?? record.resultJson;
  return result === undefined ? null : result;
}

export function mapProviderStatus(
  status: string | undefined,
  result?: unknown | null,
): MappedProviderStatus {
  const normalizedStatus = status?.toLowerCase() ?? "processing";

  if (["completed", "complete", "succeeded", "success", "done"].includes(normalizedStatus)) {
    return "COMPLETED";
  }

  if (["failed", "failure", "error", "errored", "rejected", "cancelled", "canceled"].includes(normalizedStatus)) {
    return "FAILED";
  }

  if (result !== null && result !== undefined) {
    return "COMPLETED";
  }

  return "PROCESSING";
}
