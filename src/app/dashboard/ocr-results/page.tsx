import Link from "next/link";
import { FileSearch } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OcrResultsPage(): Promise<React.JSX.Element> {
  const jobs = await prisma.ocrJob.findMany({
    where: { result: { not: undefined } },
    orderBy: { updatedAt: "desc" },
    take: 50,
  }).catch(() => []);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">OCR Results</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Snaptext OCR Results</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Result OCR JSON dari Snaptext disimpan di database dan dapat dibuka sebagai read-only form.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="divide-y divide-slate-100">
          {jobs.length === 0 ? (
            <div className="p-8 text-center">
              <FileSearch className="mx-auto size-10 text-slate-400" aria-hidden />
              <p className="mt-3 font-semibold text-slate-950">No OCR result yet</p>
              <p className="mt-1 text-sm text-slate-600">Result akan muncul setelah Snaptext callback/result API dipanggil.</p>
            </div>
          ) : (
            jobs.map((job) => (
              <article key={job.id} className="grid gap-4 p-5 hover:bg-slate-50 lg:grid-cols-[1fr_180px_120px] lg:items-center">
                <div>
                  <p className="font-semibold text-slate-950">{job.filename}</p>
                  <p className="mt-1 break-words text-sm text-slate-600">{job.providerJobId ?? job.id}</p>
                </div>
                <span className="w-fit rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                  {job.status}
                </span>
                <Link
                  href={`/dashboard/ocr-results/${job.id}`}
                  className="rounded-md bg-sky-800 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-200"
                >
                  Open result
                </Link>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
