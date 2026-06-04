import { Database, Inbox, RefreshCw, Server, Unplug } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { disconnectMailServerAction, syncMailMessagesAction } from "./actions";
import { MailServerForm } from "./mail-server-form";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null): string {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

async function getConnections(): Promise<{
  connections: Array<{
    id: string;
    name: string;
    host: string;
    port: number;
    username: string;
    mailbox: string;
    secure: boolean;
    status: string;
    lastError: string | null;
    lastSyncAt: Date | null;
    messageCount: number;
  }>;
  error?: string;
}> {
  try {
    const connections = await prisma.mailServerConnection.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    return {
      connections: connections.map((connection) => ({
        id: connection.id,
        name: connection.name,
        host: connection.host,
        port: connection.port,
        username: connection.username,
        mailbox: connection.mailbox,
        secure: connection.secure,
        status: connection.status,
        lastError: connection.lastError,
        lastSyncAt: connection.lastSyncAt,
        messageCount: connection._count.messages,
      })),
    };
  } catch {
    return {
      connections: [],
      error: "Database belum siap. Tambahkan DATABASE_URL dan DIRECT_URL, lalu jalankan prisma migrate.",
    };
  }
}

export default async function MailServerPage(): Promise<React.JSX.Element> {
  const { connections, error } = await getConnections();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">Mail Server</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Mail Server Connection</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Connect ke IMAP server untuk memonitor pesan masuk. Pesan baru yang ditemukan akan disimpan ke message list dengan flag OCR false.
        </p>
      </header>

      {error ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 size-5" aria-hidden />
            <div>
              <p className="font-semibold">Supabase database belum terhubung</p>
              <p className="mt-1 leading-6">{error}</p>
            </div>
          </div>
        </section>
      ) : null}

      <MailServerForm />

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-slate-950">Saved connections</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Gunakan Sync inbox untuk mengambil pesan unseen terbaru dari mail server.</p>
        </div>

        <div className="divide-y divide-slate-100">
          {connections.length === 0 ? (
            <div className="p-8 text-center">
              <Server className="mx-auto size-10 text-slate-400" aria-hidden />
              <p className="mt-3 font-semibold text-slate-950">No mail server connected</p>
              <p className="mt-1 text-sm text-slate-600">Tambahkan koneksi IMAP pertama untuk mulai monitoring.</p>
            </div>
          ) : (
            connections.map((connection) => (
              <article key={connection.id} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_130px_180px] lg:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Inbox className="size-4 text-slate-500" aria-hidden />
                    <p className="truncate font-semibold text-slate-950">{connection.name}</p>
                  </div>
                  <p className="mt-1 break-words text-sm text-slate-600">{connection.host}:{connection.port} / {connection.mailbox}</p>
                  <p className="mt-1 break-words text-xs text-slate-500">{connection.username}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">Last sync</p>
                  <p className="mt-1 text-sm text-slate-600">{formatDate(connection.lastSyncAt)}</p>
                  {connection.lastError ? <p className="mt-1 text-xs text-red-700">{connection.lastError}</p> : null}
                </div>
                <div>
                  <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${connection.status === "CONNECTED" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : connection.status === "ERROR" ? "border-red-200 bg-red-50 text-red-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                    {connection.status}
                  </span>
                  <p className="mt-2 text-xs text-slate-500">{connection.messageCount} messages</p>
                </div>
                <div className="flex gap-2 lg:justify-end">
                  <form action={syncMailMessagesAction}>
                    <input type="hidden" name="connectionId" value={connection.id} />
                    <button type="submit" className="inline-flex h-9 items-center gap-2 rounded-md bg-sky-800 px-3 text-xs font-semibold text-white transition hover:bg-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-200">
                      <RefreshCw className="size-3.5" aria-hidden />
                      Sync inbox
                    </button>
                  </form>
                  <form action={disconnectMailServerAction}>
                    <input type="hidden" name="connectionId" value={connection.id} />
                    <button type="submit" className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-200">
                      <Unplug className="size-3.5" aria-hidden />
                      Disconnect
                    </button>
                  </form>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
