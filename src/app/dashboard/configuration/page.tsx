import { KeyRound, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SNAPTEXT_DEFAULT_ENDPOINT, SNAPTEXT_PROVIDER } from "@/lib/snaptext";
import { ConfigurationForm } from "./configuration-form";

export const dynamic = "force-dynamic";

async function getSnaptextConfig(): Promise<{
  endpoint: string;
  enabled: boolean;
  hasApiKey: boolean;
  error?: string;
}> {
  try {
    const config = await prisma.integrationConfiguration.findUnique({
      where: { provider: SNAPTEXT_PROVIDER },
    });

    return {
      endpoint: config?.endpoint ?? SNAPTEXT_DEFAULT_ENDPOINT,
      enabled: config?.enabled ?? false,
      hasApiKey: Boolean(config?.apiKey),
    };
  } catch {
    return {
      endpoint: SNAPTEXT_DEFAULT_ENDPOINT,
      enabled: false,
      hasApiKey: false,
      error: "Database belum siap. Jalankan migration sebelum menyimpan konfigurasi.",
    };
  }
}

export default async function ConfigurationPage(): Promise<React.JSX.Element> {
  const config = await getSnaptextConfig();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">Configuration</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Integration Configuration</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Kelola credential provider OCR. API key disimpan terenkripsi dan hanya digunakan server-side.
        </p>
      </header>

      {config.error ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Configuration storage belum terhubung</p>
          <p className="mt-1 leading-6">{config.error}</p>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-sky-200 bg-sky-50 p-5">
          <KeyRound className="size-5 text-sky-800" aria-hidden />
          <p className="mt-4 text-sm font-medium text-sky-900">Snaptext key</p>
          <p className="mt-2 text-2xl font-semibold text-sky-950">{config.hasApiKey ? "Saved" : "Not set"}</p>
        </article>
        <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <ShieldCheck className="size-5 text-emerald-800" aria-hidden />
          <p className="mt-4 text-sm font-medium text-emerald-900">Integration status</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-950">{config.enabled ? "Enabled" : "Disabled"}</p>
        </article>
      </section>

      <ConfigurationForm endpoint={config.endpoint} enabled={config.enabled} hasApiKey={config.hasApiKey} />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">OCR job API</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Gunakan endpoint middleware berikut untuk membuat OCR job dokumen PDF. Semua request wajib memakai bearer token dari environment.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
{`POST /api/v1/ocr/jobs
Authorization: Bearer <API_AUTH_TOKEN>
Content-Type: application/json

{
  "pdfUrl": "https://.../document.pdf",
  "filename": "document.pdf",
  "fileSize": 120000,
  "fileHash": "sha256-file-hash",
  "emailMessageId": "optional-message-id"
}`}
        </pre>
      </section>
    </div>
  );
}
