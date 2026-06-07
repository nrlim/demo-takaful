import Link from "next/link";
import { Database, Inbox, RefreshCw, Pencil, Server, TerminalSquare, Unplug } from "lucide-react";
import { MailAutoSync } from "@/components/mail-auto-sync";
import { prisma } from "@/lib/prisma";
import { disconnectMailServerAction, syncMailMessagesAction } from "./actions";
import { LogsAutoRefresh } from "./logs-auto-refresh";
import { MailServerForm } from "./mail-server-form";

export const dynamic = "force-dynamic";

const LOG_PAGE_SIZE = 20;

interface MailServerSearchParams {
  logPage?: string;
}

function normalizePage(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function buildLogPageHref(page: number): string {
  return `/dashboard/mail-server?logPage=${page}`;
}

function formatDate(value: Date | null): string {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

async function getConnections(logPage: number): Promise<{
  connections: Array<{
    id: string;
    name: string;
    host: string;
    port: number;
    username: string;
    mailbox: string;
    secure: boolean;
    onlyUnread: boolean;
    status: string;
    lastError: string | null;
    lastSyncAt: Date | null;
    messageCount: number;
  }>;
  logs: Array<{
    id: string;
    connectionId: string | null;
    level: string;
    event: string;
    message: string;
    createdAt: Date;
    metadata: unknown;
  }>;
  logPagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  error?: string;
}> {
  try {
    const [connections, logs, totalLogs] = await Promise.all([
      prisma.mailServerConnection.findMany({
        orderBy: { updatedAt: "desc" },
        include: {
          _count: {
            select: { messages: true },
          },
        },
      }),
      prisma.emailGatewayLog.findMany({
        orderBy: { createdAt: "desc" },
        skip: (logPage - 1) * LOG_PAGE_SIZE,
        take: LOG_PAGE_SIZE,
        select: {
          id: true,
          connectionId: true,
          level: true,
          event: true,
          message: true,
          createdAt: true,
          metadata: true,
        },
      }),
      prisma.emailGatewayLog.count(),
    ]);
    const totalPages = Math.max(1, Math.ceil(totalLogs / LOG_PAGE_SIZE));

    return {
      connections: connections.map((connection) => ({
        id: connection.id,
        name: connection.name,
        host: connection.host,
        port: connection.port,
        username: connection.username,
        mailbox: connection.mailbox,
        secure: connection.secure,
        onlyUnread: connection.onlyUnread,
        status: connection.status,
        lastError: connection.lastError,
        lastSyncAt: connection.lastSyncAt,
        messageCount: connection._count.messages,
      })),
      logs,
      logPagination: {
        page: Math.min(logPage, totalPages),
        pageSize: LOG_PAGE_SIZE,
        totalItems: totalLogs,
        totalPages,
      },
    };
  } catch {
    return {
      connections: [],
      logs: [],
      logPagination: {
        page: 1,
        pageSize: LOG_PAGE_SIZE,
        totalItems: 0,
        totalPages: 1,
      },
      error: "Database belum siap. Tambahkan DATABASE_URL dan DIRECT_URL, lalu jalankan prisma migrate.",
    };
  }
}

export default async function MailServerPage({
  searchParams,
}: {
  searchParams: Promise<MailServerSearchParams>;
}): Promise<React.JSX.Element> {
  const params = await searchParams;
  const logPage = normalizePage(params.logPage);
  const { connections, logs, logPagination, error } = await getConnections(logPage);
  const connectedConnectionIds = connections
    .filter((connection) => connection.status === "CONNECTED")
    .map((connection) => connection.id);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">Mail Server</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Mail Server Connection</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Connect ke satu konfigurasi IMAP gateway untuk memonitor pesan masuk. Catch rules menentukan email tujuan mana yang diproses OCR.
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
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Saved connections</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Auto sync mengambil pesan baru secara berkala dari satu gateway IMAP. Catch rules menjadi filter alamat email tujuan yang diproses.</p>
          </div>
          <MailAutoSync connectionIds={connectedConnectionIds} />
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
                  <p className="mt-1 text-xs font-medium text-slate-500">Mode: {connection.onlyUnread ? "Unread only" : "Latest messages"}</p>
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
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Link href={`/dashboard/mail-server/${connection.id}/edit`} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-200">
                    <Pencil className="size-3.5" aria-hidden />
                    Edit
                  </Link>
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

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <TerminalSquare className="mt-0.5 size-5 text-slate-500" aria-hidden />
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Email Gateway Logs</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Progress IMAP sync dari connect, fetch unseen message, rule matching, upload PDF, sampai message tersimpan ke queue.
              </p>
            </div>
          </div>
          <LogsAutoRefresh />
        </div>
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-600">
          Showing {logPagination.totalItems === 0 ? 0 : ((logPagination.page - 1) * logPagination.pageSize) + 1}-{Math.min(logPagination.page * logPagination.pageSize, logPagination.totalItems)} of {logPagination.totalItems} logs
        </div>
        <div className="max-h-[520px] overflow-y-auto bg-slate-50 p-4 font-mono text-xs">
          {logs.length === 0 ? (
            <p className="text-slate-500">No gateway logs yet. Connect mail server or run Sync inbox to start logging.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {logs.map((log) => (
                <div key={log.id} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-500">[{formatDate(log.createdAt)}]</span>
                    <span className={log.level === "ERROR" ? "text-red-700" : log.level === "WARN" ? "text-amber-700" : log.level === "OK" ? "text-emerald-700" : log.level === "MATCH" ? "text-indigo-700" : "text-sky-700"}>
                      {log.level}
                    </span>
                    <span className="text-slate-700">{log.event}</span>
                  </div>
                  <p className="mt-1 leading-5 text-slate-900">{log.message}</p>
                  {log.connectionId ? <p className="mt-1 text-slate-500">connection: {log.connectionId}</p> : null}
                  {log.metadata ? (
                    <pre className="mt-2 overflow-x-auto rounded border border-slate-200 bg-slate-50 p-2 text-[11px] leading-5 text-slate-600">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <p>Page {logPagination.page} of {logPagination.totalPages}</p>
          <div className="flex items-center gap-2">
            <Link
              href={buildLogPageHref(Math.max(1, logPagination.page - 1))}
              aria-disabled={logPagination.page <= 1}
              className={`h-9 rounded-md border border-slate-300 px-3 py-2 font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-200 ${logPagination.page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-slate-50"}`}
            >
              Previous
            </Link>
            <Link
              href={buildLogPageHref(Math.min(logPagination.totalPages, logPagination.page + 1))}
              aria-disabled={logPagination.page >= logPagination.totalPages}
              className={`h-9 rounded-md border border-slate-300 px-3 py-2 font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-200 ${logPagination.page >= logPagination.totalPages ? "pointer-events-none opacity-50" : "hover:bg-slate-50"}`}
            >
              Next
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
