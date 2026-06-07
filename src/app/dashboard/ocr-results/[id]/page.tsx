import Link from "next/link";
import { notFound } from "next/navigation";
import type { JsonValue } from "@prisma/client/runtime/client";
import { prisma } from "@/lib/prisma";
import { OcrPageReviewPanel } from "../ocr-page-review-panel";

export const dynamic = "force-dynamic";

interface OcrQualityScore {
  confidence: number | null;
  readability: number;
  usability: number;
  readabilitySource: "engine" | "estimated";
  usabilitySource: "engine" | "estimated";
  capturedFields: number;
  pageCount: number | null;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function statusClass(status: string): string {
  if (status === "COMPLETED") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "FAILED") return "border-red-200 bg-red-50 text-red-800";
  if (status === "PROCESSING") return "border-sky-200 bg-sky-50 text-sky-800";
  return "border-slate-200 bg-slate-50 text-slate-800";
}

function scoreClass(score: number): string {
  if (score >= 85) return "text-emerald-700";
  if (score >= 70) return "text-sky-700";
  if (score >= 50) return "text-amber-700";
  return "text-red-700";
}

function isRecord(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 1) return Math.round(value * 100);
  return Math.round(Math.min(100, Math.max(0, value)));
}

function findNumberByKeys(value: JsonValue | null, keys: string[]): number | null {
  if (!value) return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNumberByKeys(item, keys);
      if (found !== null) return found;
    }
    return null;
  }

  if (!isRecord(value)) return null;

  for (const [key, item] of Object.entries(value)) {
    if (keys.includes(key.toLowerCase()) && typeof item === "number") {
      return item;
    }
  }

  for (const item of Object.values(value)) {
    const found = findNumberByKeys(item, keys);
    if (found !== null) return found;
  }

  return null;
}

function countCapturedFields(value: JsonValue | null): number {
  if (value === null || value === undefined) return 0;

  if (Array.isArray(value)) {
    return value.reduce<number>((total, item) => total + countCapturedFields(item), 0);
  }

  if (isRecord(value)) {
    return Object.values(value).reduce<number>((total, item) => total + countCapturedFields(item), 0);
  }

  if (typeof value === "string") return value.trim().length > 0 ? 1 : 0;
  return 1;
}

function calculateQualityScore(result: JsonValue | null, response: JsonValue | null, status: string): OcrQualityScore {
  const confidenceValue = findNumberByKeys(result, ["confidence_score", "confidence", "score"])
    ?? findNumberByKeys(response, ["confidence_score", "confidence", "score"]);
  const confidence = confidenceValue === null ? null : normalizeScore(confidenceValue);
  const pageCount = findNumberByKeys(result, ["page_count", "pages", "total_pages", "totalpages"])
    ?? findNumberByKeys(response, ["page_count", "pages", "total_pages", "totalpages"]);
  const snaptextReadability = findNumberByKeys(result, ["readability_score", "readability"])
    ?? findNumberByKeys(response, ["readability_score", "readability"]);
  const snaptextUsability = findNumberByKeys(result, ["usability_score", "usability"])
    ?? findNumberByKeys(response, ["usability_score", "usability"]);
  const capturedFields = countCapturedFields(result);
  const fieldCoverageScore = Math.min(100, capturedFields * 3);
  const completedBonus = status === "COMPLETED" ? 10 : 0;
  const estimatedReadability = Math.min(100, Math.round(((confidence ?? 65) * 0.7) + (fieldCoverageScore * 0.3)));
  const estimatedUsability = Math.min(100, Math.round((fieldCoverageScore * 0.55) + ((confidence ?? 65) * 0.35) + completedBonus));

  return {
    confidence,
    readability: snaptextReadability === null ? estimatedReadability : normalizeScore(snaptextReadability),
    usability: snaptextUsability === null ? estimatedUsability : normalizeScore(snaptextUsability),
    readabilitySource: snaptextReadability === null ? "estimated" : "engine",
    usabilitySource: snaptextUsability === null ? "estimated" : "engine",
    capturedFields,
    pageCount: pageCount === null ? null : Math.round(pageCount),
  };
}

function ScoreCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}): React.JSX.Element {
  const numericValue = Number(value.replace("%", ""));
  const hasScore = Number.isFinite(numericValue);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${hasScore ? scoreClass(numericValue) : "text-slate-950"}`}>{value}</p>
      {hasScore ? (
        <div className="mt-3 h-2 overflow-hidden rounded-md bg-slate-100">
          <div className="h-full rounded-md bg-sky-700" style={{ width: `${Math.min(100, Math.max(0, numericValue))}%` }} />
        </div>
      ) : null}
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

export default async function OcrResultDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const job = await prisma.ocrJob.findUnique({ where: { id } }).catch(() => null);

  if (!job) {
    notFound();
  }

  const message = job.emailMessageId
    ? await prisma.emailMessage.findUnique({
      where: { id: job.emailMessageId },
      select: {
        id: true,
        fromEmail: true,
        toEmail: true,
        subject: true,
        receivedAt: true,
        sourceMailbox: true,
        matchedCategory: true,
        matchReason: true,
      },
    }).catch(() => null)
    : null;
  const result = job.result as JsonValue | null;
  const response = job.response as JsonValue | null;
  const quality = calculateQualityScore(result, response, job.status);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <Link href="/dashboard/ocr-results" className="text-sm font-semibold text-sky-800 hover:text-sky-950">
          Back to OCR Results
        </Link>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{job.filename}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Review PDF dan hasil ekstraksi OCR secara side-by-side untuk proses audit yang lebih cepat.
            </p>
          </div>
          <span className={`w-fit rounded-md border px-3 py-1.5 text-sm font-semibold ${statusClass(job.status)}`}>
            {job.status}
          </span>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-4">
        <ScoreCard label="OCR Confidence" value={quality.confidence === null ? "-" : `${quality.confidence}%`} description="Confidence score dari OCR engine response." />
        <ScoreCard label={quality.readabilitySource === "engine" ? "Readability" : "Estimated Readability"} value={`${quality.readability}%`} description={quality.readabilitySource === "engine" ? "Readability score dari OCR engine response." : "Skor internal middleware, dihitung dari confidence dan kelengkapan field."} />
        <ScoreCard label={quality.usabilitySource === "engine" ? "Usability" : "Estimated Usability"} value={`${quality.usability}%`} description={quality.usabilitySource === "engine" ? "Usability score dari OCR engine response." : "Skor internal kesiapan review operasional."} />
        <ScoreCard label="Total Pages" value={quality.pageCount === null ? "-" : String(quality.pageCount)} description={`Field captured: ${quality.capturedFields.toLocaleString("id-ID")}.`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">OCR Job</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">OCR Reference</p>
              <p className="mt-1 break-words text-sm font-semibold text-slate-950">{job.id}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">Middleware Job ID</p>
              <p className="mt-1 break-words text-sm font-semibold text-slate-950">{job.id}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 md:col-span-2">
              <p className="text-xs font-medium text-slate-500">PDF URL</p>
              <a href={job.pdfUrl} target="_blank" rel="noreferrer" className="mt-1 block break-words text-sm font-semibold text-sky-800 hover:text-sky-950">
                {job.pdfUrl}
              </a>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">File size</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{job.fileSize.toLocaleString("id-ID")} bytes</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">File hash</p>
              <p className="mt-1 break-words text-sm font-semibold text-slate-950">{job.fileHash}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Related Email</h2>
          {message ? (
            <div className="mt-4 grid gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">Subject</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{message.subject || "No subject"}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500">From</p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-950">{message.fromEmail}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500">To</p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-950">{message.toEmail}</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500">Received</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{formatDate(message.receivedAt)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500">Mailbox / Category</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{message.sourceMailbox} / {message.matchedCategory ?? "Uncategorized"}</p>
                </div>
              </div>
              {message.matchReason ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500">Match reason</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{message.matchReason}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
              Email metadata tidak tersedia untuk job ini.
            </p>
          )}
        </div>
      </section>

      {result ? (
        <OcrPageReviewPanel data={result} pdfUrl={job.pdfUrl} filename={job.filename} />
      ) : (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          OCR result belum tersedia untuk job ini.
        </section>
      )}
    </div>
  );
}
