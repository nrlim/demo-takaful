"use client";

import { useMemo, useState } from "react";
import type { JsonValue } from "@prisma/client/runtime/client";
import { ResultFormRenderer } from "./result-form-renderer";

interface OcrPageReviewPanelProps {
  data: JsonValue;
  pdfUrl: string;
  filename: string;
}

interface PageReviewItem {
  id: string;
  pageNumber: number;
  label: string;
  extractedData: JsonValue | null;
  feedback: JsonValue | null;
  capturedFields: number;
}

function isRecord(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatLabel(value: string): string {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
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

function getNumericPage(value: JsonValue | undefined, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(1, Math.round(value));
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(1, Math.round(parsed)) : fallback;
  }

  return fallback;
}

function getPageNumber(item: JsonValue, fallback: number): number {
  if (!isRecord(item)) return fallback;
  return getNumericPage(item.page_number ?? item.pageNumber ?? item.page ?? item.page_index ?? item.pageIndex, fallback);
}

function getPageLabel(item: JsonValue | null, pageNumber: number): string {
  if (!isRecord(item)) return `Page ${pageNumber}`;

  const label = item.page_label ?? item.pageLabel ?? item.page_type ?? item.pageType ?? item.title;
  if (typeof label === "string" && label.trim()) {
    return `Page ${pageNumber}: ${formatLabel(label.trim())}`;
  }

  return `Page ${pageNumber}`;
}

function getPageFeedbackItems(data: JsonValue): JsonValue[] {
  if (!isRecord(data) || !isRecord(data.ocr_feedback)) {
    return [];
  }

  return Array.isArray(data.ocr_feedback.page_feedback) ? data.ocr_feedback.page_feedback : [];
}

function buildReviewItems(data: JsonValue): PageReviewItem[] {
  if (!isRecord(data)) {
    return [];
  }

  const pages = Array.isArray(data.pages) ? data.pages : [];
  const feedbackItems = getPageFeedbackItems(data);
  const feedbackByPage = new Map<number, JsonValue>();

  feedbackItems.forEach((feedback, index) => {
    feedbackByPage.set(getPageNumber(feedback, index + 1), feedback);
  });

  const pageItems = pages.map<PageReviewItem>((page, index) => {
    const pageNumber = getPageNumber(page, index + 1);
    return {
      id: `page-${pageNumber}`,
      pageNumber,
      label: getPageLabel(page, pageNumber),
      extractedData: page,
      feedback: feedbackByPage.get(pageNumber) ?? null,
      capturedFields: countCapturedFields(page),
    };
  });

  const pageNumbers = new Set(pageItems.map((page) => page.pageNumber));
  const feedbackOnlyItems = feedbackItems
    .map<PageReviewItem | null>((feedback, index) => {
      const pageNumber = getPageNumber(feedback, index + 1);
      if (pageNumbers.has(pageNumber)) return null;

      return {
        id: `page-${pageNumber}`,
        pageNumber,
        label: getPageLabel(feedback, pageNumber),
        extractedData: null,
        feedback,
        capturedFields: countCapturedFields(feedback),
      };
    })
    .filter((item): item is PageReviewItem => item !== null);

  return [...pageItems, ...feedbackOnlyItems].sort((first, second) => first.pageNumber - second.pageNumber);
}

function buildPdfPageUrl(pdfUrl: string, pageNumber: number): string {
  const [baseUrl] = pdfUrl.split("#");
  return `${baseUrl}#page=${pageNumber}&view=FitH`;
}

export function OcrPageReviewPanel({
  data,
  pdfUrl,
  filename,
}: OcrPageReviewPanelProps): React.JSX.Element {
  const pages = useMemo(() => buildReviewItems(data), [data]);
  const [selectedPageNumber, setSelectedPageNumber] = useState<number>(() => pages[0]?.pageNumber ?? 1);
  const [showFeedback, setShowFeedback] = useState(true);
  const [showExtractedFields, setShowExtractedFields] = useState(true);

  const selectedPage = pages.find((page) => page.pageNumber === selectedPageNumber) ?? pages[0] ?? null;

  if (!selectedPage) {
    return (
      <section className="grid gap-5 xl:grid-cols-2 xl:items-start">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-4">
          <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Source PDF</h2>
              <p className="mt-1 text-sm text-slate-600">Dokumen asli untuk dibandingkan dengan hasil OCR.</p>
            </div>
            <a href={pdfUrl} target="_blank" rel="noreferrer" className="rounded-md border border-slate-300 px-3 py-2 text-center text-xs font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-200">
              Open PDF
            </a>
          </div>
          <iframe title={`PDF preview for ${filename}`} src={pdfUrl} className="h-screen w-full rounded-lg border border-slate-200 bg-slate-50" />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 border-b border-slate-100 pb-4">
            <h2 className="text-lg font-semibold text-slate-950">Extracted OCR Fields</h2>
            <p className="mt-1 text-sm text-slate-600">Result belum memiliki struktur page-level. Menampilkan output lengkap.</p>
          </div>
          <ResultFormRenderer data={data} />
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:items-start">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-hidden">
        <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Source PDF</h2>
            <p className="mt-1 text-sm text-slate-600">Preview mengikuti page yang dipilih untuk comparison OCR.</p>
          </div>
          <a href={buildPdfPageUrl(pdfUrl, selectedPage.pageNumber)} target="_blank" rel="noreferrer" className="rounded-md border border-slate-300 px-3 py-2 text-center text-xs font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-200">
            Open selected page
          </a>
        </div>
        <iframe
          key={selectedPage.pageNumber}
          title={`PDF preview for ${filename}, page ${selectedPage.pageNumber}`}
          src={buildPdfPageUrl(pdfUrl, selectedPage.pageNumber)}
          className="h-[calc(100vh-12rem)] min-h-[640px] w-full rounded-lg border border-slate-200 bg-slate-50"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
        <div className="mb-5 border-b border-slate-100 pb-4">
          <h2 className="text-lg font-semibold text-slate-950">Page OCR Review</h2>
          <p className="mt-1 text-sm text-slate-600">Pilih page PDF, lalu review feedback OCR dan field ekstraksi untuk page yang sama.</p>
        </div>

        <div className="sticky top-0 z-10 -mx-1 mb-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {pages.map((page) => {
              const isSelected = page.pageNumber === selectedPage.pageNumber;
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => setSelectedPageNumber(page.pageNumber)}
                  className={`h-9 shrink-0 rounded-md border px-3 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-200 ${isSelected ? "border-sky-700 bg-sky-800 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  Page {page.pageNumber}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected PDF page</p>
          <h3 className="mt-2 text-base font-semibold text-slate-950">{selectedPage.label}</h3>
          <p className="mt-1 text-sm text-slate-600">{selectedPage.capturedFields.toLocaleString("id-ID")} captured fields on this page.</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowFeedback((current) => !current)}
            aria-expanded={showFeedback}
            className="h-9 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            {showFeedback ? "Hide OCR feedback" : "Show OCR feedback"}
          </button>
          <button
            type="button"
            onClick={() => setShowExtractedFields((current) => !current)}
            aria-expanded={showExtractedFields}
            className="h-9 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            {showExtractedFields ? "Hide extracted fields" : "Show extracted fields"}
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 p-4">
              <h4 className="text-sm font-semibold text-slate-950">OCR Feedback for Page {selectedPage.pageNumber}</h4>
              <p className="mt-1 text-xs text-slate-500">Feedback ini harus mereferensikan page PDF yang sedang tampil di kiri.</p>
            </div>
            {showFeedback ? (
              <div className="p-4">
                {selectedPage.feedback ? (
                  <ResultFormRenderer data={selectedPage.feedback} prefix={`Page ${selectedPage.pageNumber} Feedback`} />
                ) : (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">Feedback per page tidak tersedia dari OCR engine.</p>
                )}
              </div>
            ) : (
              <div className="p-4 text-sm text-slate-500">OCR feedback disembunyikan sementara.</div>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 p-4">
              <h4 className="text-sm font-semibold text-slate-950">Extracted Fields for Page {selectedPage.pageNumber}</h4>
              <p className="mt-1 text-xs text-slate-500">Field OCR yang dikaitkan dengan page PDF ini.</p>
            </div>
            {showExtractedFields ? (
              <div className="p-4">
                {selectedPage.extractedData ? (
                  <ResultFormRenderer data={selectedPage.extractedData} prefix={`Page ${selectedPage.pageNumber} Fields`} />
                ) : (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">Field ekstraksi page ini tidak tersedia.</p>
                )}
              </div>
            ) : (
              <div className="p-4 text-sm text-slate-500">Extracted fields disembunyikan sementara.</div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
