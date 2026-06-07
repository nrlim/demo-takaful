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

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => windowlessSetTimeout(resolve, milliseconds));
}

function windowlessSetTimeout(callback: () => void, milliseconds: number): NodeJS.Timeout {
  return setTimeout(callback, milliseconds);
}

function getSnaptextWaitConfig(): { timeoutMs: number; intervalMs: number } {
  const timeoutMs = Number(process.env.SNAPTEXT_SYNC_WAIT_MS ?? 45000);
  const intervalMs = Number(process.env.SNAPTEXT_POLL_INTERVAL_MS ?? 3000);

  return {
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 45000,
    intervalMs: Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : 3000,
  };
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

  const acceptedJob = responseBody as SnaptextJobResponse;
  return await waitForSnaptextCompletion(acceptedJob);
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
  const pagesData = record.pagesData ?? record.pages_data ?? record.pageData;

  if (result && typeof result === "object" && !Array.isArray(result) && pagesData !== undefined) {
    return {
      pagesData,
      ...(result as Record<string, unknown>),
    };
  }

  if (result !== undefined) {
    return result;
  }

  if (pagesData !== undefined) {
    return { pagesData };
  }

  return null;
}

function hasMeaningfulSnaptextResult(result: unknown | null | undefined): boolean {
  if (result === null || result === undefined) {
    return false;
  }

  if (Array.isArray(result)) {
    return result.length > 0;
  }

  if (typeof result === "object") {
    return Object.keys(result).length > 0;
  }

  if (typeof result === "string") {
    return result.trim().length > 0;
  }

  return true;
}

export function mapProviderStatus(
  status: string | undefined,
  result?: unknown | null,
): MappedProviderStatus {
  const normalizedStatus = status?.toLowerCase();

  if (normalizedStatus && ["completed", "complete", "succeeded", "success", "done"].includes(normalizedStatus)) {
    return "COMPLETED";
  }

  if (normalizedStatus && ["failed", "failure", "error", "errored", "rejected", "cancelled", "canceled"].includes(normalizedStatus)) {
    return "FAILED";
  }

  if (!normalizedStatus && hasMeaningfulSnaptextResult(result)) {
    return "COMPLETED";
  }

  return "PROCESSING";
}

async function waitForSnaptextCompletion(acceptedJob: SnaptextJobResponse): Promise<SnaptextJobResponse> {
  const providerJobId = getSnaptextProviderJobId(acceptedJob);
  const initialResult = extractSnaptextResult(acceptedJob);
  const initialStatus = mapProviderStatus(acceptedJob.status, initialResult);

  if (!providerJobId || initialStatus !== "PROCESSING") {
    return acceptedJob;
  }

  const { timeoutMs, intervalMs } = getSnaptextWaitConfig();
  const startedAt = Date.now();
  let latestJob = acceptedJob;

  while (Date.now() - startedAt < timeoutMs) {
    await sleep(intervalMs);

    try {
      latestJob = await fetchSnaptextOcrJobResult(providerJobId);
    } catch {
      continue;
    }

    const latestResult = extractSnaptextResult(latestJob);
    const latestStatus = mapProviderStatus(latestJob.status, latestResult);

    if (latestStatus !== "PROCESSING") {
      return latestJob;
    }
  }

  return latestJob;
}
