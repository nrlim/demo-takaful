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

  const endpoint = `${config.endpoint.replace(/\/$/, "")}/${encodeURIComponent(providerJobId)}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
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
