"use client";

import type { JsonValue } from "@prisma/client/runtime/client";
import { OcrStructuredForm } from "./ocr-structured-form";

interface OcrPageReviewPanelProps {
  data: JsonValue;
  response?: JsonValue | null;
  pdfUrl: string;
  filename: string;
}

export function OcrPageReviewPanel({
  data,
  response,
  pdfUrl,
  filename,
}: OcrPageReviewPanelProps): React.JSX.Element {
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:items-start">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-hidden">
        <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Source PDF</h2>
            <p className="mt-1 text-sm text-slate-600">Dokumen asli tetap terlihat di kiri untuk comparison dengan OCR data.</p>
          </div>
          <a href={pdfUrl} target="_blank" rel="noreferrer" className="rounded-md border border-slate-300 px-3 py-2 text-center text-xs font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-200">
            Open PDF
          </a>
        </div>
        <iframe
          title={`PDF preview for ${filename}`}
          src={pdfUrl}
          className="h-[calc(100vh-12rem)] min-h-[640px] w-full rounded-lg border border-slate-200 bg-slate-50"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
        <div className="mb-5 border-b border-slate-100 pb-4">
          <h2 className="text-lg font-semibold text-slate-950">OCR Data</h2>
          <p className="mt-1 text-sm text-slate-600">
            Data difokuskan pada hasil scan dokumen. Feedback OCR, metadata job, dan field teknis tidak ditampilkan di panel ini.
          </p>
        </div>
        <OcrStructuredForm data={data} response={response} />
      </div>
    </section>
  );
}
