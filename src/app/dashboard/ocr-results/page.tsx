import Link from "next/link";
import { FileSearch } from "lucide-react";
import { OcrAutoRefresh } from "@/components/ocr-auto-refresh";
import { OcrProgressBar } from "@/components/ocr-progress-bar";
import { prisma } from "@/lib/prisma";
import { refreshSnaptextResultsAction } from "./actions";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null | undefined): string {
  if (!value) return "-";
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

export default async function OcrResultsPage(): Promise<React.JSX.Element> {
  const jobs = await prisma.ocrJob.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
  }).catch(() => []);
  const messageIds = jobs
    .map((job) => job.emailMessageId)
    .filter((id): id is string => Boolean(id));
  const messages = messageIds.length > 0
    ? await prisma.emailMessage.findMany({
      where: { id: { in: messageIds } },
      select: {
        id: true,
        fromEmail: true,
        toEmail: true,
        subject: true,
        receivedAt: true,
        sourceMailbox: true,
        matchedCategory: true,
      },
    }).catch(() => [])
    : [];
  const messageById = new Map(messages.map((message) => [message.id, message]));
  const hasProcessingJobs = jobs.some((job) => job.status === "PROCESSING" || job.status === "PENDING");

  return (
    <div className="flex flex-col gap-8">
      <OcrAutoRefresh enabled={hasProcessingJobs} />
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">OCR Results</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">OCR Results</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Result OCR JSON disimpan di database dan dapat dibuka sebagai read-only form.
          </p>
        </div>
        <form action={refreshSnaptextResultsAction}>
          <button type="submit" className="h-11 rounded-md bg-sky-800 px-4 text-sm font-semibold text-white transition hover:bg-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-200">
            Refresh OCR results
          </button>
        </form>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="divide-y divide-slate-100">
          {jobs.length === 0 ? (
            <div className="p-8 text-center">
              <FileSearch className="mx-auto size-10 text-slate-400" aria-hidden />
              <p className="mt-3 font-semibold text-slate-950">No OCR result yet</p>
              <p className="mt-1 text-sm text-slate-600">Result akan muncul setelah callback/result API diterima.</p>
            </div>
          ) : (
            jobs.map((job) => {
              const message = job.emailMessageId ? messageById.get(job.emailMessageId) : undefined;
              return (
                <article key={job.id} className="grid gap-4 p-5 hover:bg-slate-50 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_140px] xl:items-center">
                  <div>
                    <p className="font-semibold text-slate-950">{job.filename}</p>
                    <p className="mt-1 break-words text-xs text-slate-500">OCR reference: {job.id}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Related email</p>
                    {message ? (
                      <div className="mt-1 space-y-1">
                        <p className="line-clamp-2 text-sm font-semibold text-slate-950">{message.subject || "No subject"}</p>
                        <p className="break-words text-xs text-slate-600">From: {message.fromEmail}</p>
                        <p className="break-words text-xs text-slate-600">To: {message.toEmail}</p>
                        <p className="text-xs text-slate-500">{message.sourceMailbox} · {formatDate(message.receivedAt)} · {message.matchedCategory ?? "Uncategorized"}</p>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-slate-500">Email metadata not available</p>
                    )}
                  </div>
                  <div className="flex flex-col items-start gap-2 xl:items-stretch">
                    <span className={`rounded-md border px-2.5 py-1 text-center text-xs font-semibold ${statusClass(job.status)}`}>
                      {job.status}
                    </span>
                    {job.status === "PROCESSING" ? (
                      <OcrProgressBar label="Processing OCR" />
                    ) : null}
                    {job.result ? (
                      <Link
                        href={`/dashboard/ocr-results/${job.id}`}
                        className="rounded-md bg-sky-800 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-200"
                      >
                        Open result
                      </Link>
                    ) : (
                      <span className="rounded-md border border-slate-300 px-3 py-2 text-center text-xs font-semibold text-slate-500">
                        No result yet
                      </span>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
