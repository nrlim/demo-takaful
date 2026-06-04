import Link from "next/link";
import { notFound } from "next/navigation";
import type { JsonValue } from "@prisma/client/runtime/client";
import { prisma } from "@/lib/prisma";
import { ResultFormRenderer } from "../result-form-renderer";

export const dynamic = "force-dynamic";

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

  return (
    <div className="flex flex-col gap-8">
      <header>
        <Link href="/dashboard/ocr-results" className="text-sm font-semibold text-sky-800 hover:text-sky-950">
          Back to OCR Results
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{job.filename}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Result JSON dirender sebagai form read-only agar lebih mudah dibaca dan diaudit.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">Job ID</p>
            <p className="mt-1 break-words text-sm font-semibold text-slate-950">{job.providerJobId ?? job.id}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">Status</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">{job.status}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">File hash</p>
            <p className="mt-1 break-words text-sm font-semibold text-slate-950">{job.fileHash}</p>
          </div>
        </div>

        {job.result ? (
          <ResultFormRenderer data={job.result as JsonValue} />
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            OCR result belum tersedia untuk job ini.
          </div>
        )}
      </section>
    </div>
  );
}
