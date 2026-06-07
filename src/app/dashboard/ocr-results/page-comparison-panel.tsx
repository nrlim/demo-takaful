"use client";

import { useMemo, useState } from "react";
import type { JsonValue } from "@prisma/client/runtime/client";
import { ResultFormRenderer } from "./result-form-renderer";

interface PageComparisonPanelProps {
  data: JsonValue;
}

interface ExtractedPage {
  id: string;
  label: string;
  pageNumber: number | null;
  data: JsonValue;
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

function countCapturedFields(value: JsonValue): number {
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

function getPageNumber(page: JsonValue, fallback: number): number | null {
  if (!isRecord(page)) {
    return fallback;
  }

  const pageValue = page.page_number ?? page.pageNumber ?? page.page ?? page.page_index ?? page.pageIndex;

  if (typeof pageValue === "number" && Number.isFinite(pageValue)) {
    return Math.round(pageValue);
  }

  if (typeof pageValue === "string") {
    const parsed = Number(pageValue);
    return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
  }

  return fallback;
}

function getPageTitle(page: JsonValue, pageNumber: number | null, fallback: number): string {
  if (!isRecord(page)) {
    return `Page ${pageNumber ?? fallback}`;
  }

  const pageLabel = page.page_label ?? page.pageLabel ?? page.title ?? page.page_type ?? page.pageType;
  if (typeof pageLabel === "string" && pageLabel.trim()) {
    return `Page ${pageNumber ?? fallback}: ${formatLabel(pageLabel.trim())}`;
  }

  return `Page ${pageNumber ?? fallback}`;
}

function extractPages(data: JsonValue): ExtractedPage[] {
  if (!isRecord(data) || !Array.isArray(data.pages)) {
    return [];
  }

  return data.pages.map((page, index) => {
    const pageNumber = getPageNumber(page, index + 1);

    return {
      id: `page-${pageNumber ?? index + 1}-${index}`,
      label: getPageTitle(page, pageNumber, index + 1),
      pageNumber,
      data: page,
      capturedFields: countCapturedFields(page),
    };
  });
}

export function PageComparisonPanel({ data }: PageComparisonPanelProps): React.JSX.Element {
  const pages = useMemo(() => extractPages(data), [data]);
  const [hiddenPageIds, setHiddenPageIds] = useState<Set<string>>(() => new Set());

  function togglePage(pageId: string): void {
    setHiddenPageIds((current) => {
      const next = new Set(current);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  }

  function hideAllPages(): void {
    setHiddenPageIds(new Set(pages.map((page) => page.id)));
  }

  function showAllPages(): void {
    setHiddenPageIds(new Set());
  }

  if (pages.length === 0) {
    return <ResultFormRenderer data={data} />;
  }

  const visiblePageCount = pages.length - hiddenPageIds.size;

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-10 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">Page detail visibility</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {visiblePageCount} dari {pages.length} page detail sedang ditampilkan. Hide page yang tidak sedang direview agar comparison tetap dekat dengan PDF.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={showAllPages}
              className="h-9 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              Show all
            </button>
            <button
              type="button"
              onClick={hideAllPages}
              className="h-9 rounded-md bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              Hide all details
            </button>
          </div>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {pages.map((page) => {
            const isHidden = hiddenPageIds.has(page.id);
            return (
              <a
                key={page.id}
                href={`#${page.id}`}
                className={`shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-200 ${isHidden ? "border-slate-200 bg-slate-50 text-slate-500" : "border-sky-200 bg-sky-50 text-sky-800"}`}
              >
                Page {page.pageNumber ?? "-"}
              </a>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {pages.map((page) => {
          const isHidden = hiddenPageIds.has(page.id);

          return (
            <section id={page.id} key={page.id} className="scroll-mt-24 rounded-lg border border-slate-200 bg-white">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">{page.label}</h3>
                  <p className="mt-1 text-xs text-slate-500">{page.capturedFields.toLocaleString("id-ID")} captured fields</p>
                </div>
                <button
                  type="button"
                  onClick={() => togglePage(page.id)}
                  aria-expanded={!isHidden}
                  aria-controls={`${page.id}-content`}
                  className="h-9 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-200"
                >
                  {isHidden ? "Show detail" : "Hide detail"}
                </button>
              </div>

              {isHidden ? (
                <div className="p-4 text-sm text-slate-500">Detail page disembunyikan sementara.</div>
              ) : (
                <div id={`${page.id}-content`} className="p-4">
                  <ResultFormRenderer data={page.data} prefix={page.label} />
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
