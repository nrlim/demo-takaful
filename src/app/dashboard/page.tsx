import { Activity, AlertCircle, CheckCircle, FileText, Mail, Server } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface DashboardMetric {
  label: string;
  value: string;
  detail: string;
  color: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

interface RecentMessageView {
  id: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  document: string;
  status: string;
  badge: string;
  receivedAt: Date;
  matchedCategory: string | null;
}

interface SystemLogView {
  time: string;
  type: string;
  color: string;
  message: string;
}

interface DashboardData {
  metrics: DashboardMetric[];
  recentMessages: RecentMessageView[];
  logs: SystemLogView[];
  error?: string;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatTime(value: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

function getStatusBadge(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "FAILED":
      return "border-red-200 bg-red-50 text-red-800";
    case "PROCESSING":
      return "border-sky-200 bg-sky-50 text-sky-800";
    default:
      return "border-amber-200 bg-amber-50 text-amber-800";
  }
}

function createLogs(input: {
  connectedMailServers: number;
  totalMessages: number;
  pendingOcr: number;
  failedOcrJobs: number;
  snaptextEnabled: boolean;
  lastSyncAt: Date | null;
}): SystemLogView[] {
  const now = new Date();
  const logs: SystemLogView[] = [
    {
      time: formatTime(now),
      type: "INFO",
      color: "text-sky-700",
      message: `${input.connectedMailServers} mail server connection(s) active`,
    },
    {
      time: formatTime(now),
      type: "INFO",
      color: "text-sky-700",
      message: `${input.totalMessages} message(s) stored in OCR queue`,
    },
    {
      time: formatTime(now),
      type: input.pendingOcr > 0 ? "QUEUE" : "OK",
      color: input.pendingOcr > 0 ? "text-amber-700" : "text-emerald-700",
      message: `${input.pendingOcr} message(s) waiting for OCR`,
    },
    {
      time: formatTime(now),
      type: input.snaptextEnabled ? "OK" : "WARN",
      color: input.snaptextEnabled ? "text-emerald-700" : "text-amber-700",
      message: input.snaptextEnabled ? "Snaptext OCR integration enabled" : "Snaptext OCR integration is not enabled",
    },
  ];

  if (input.failedOcrJobs > 0) {
    logs.push({
      time: formatTime(now),
      type: "ERROR",
      color: "text-red-700",
      message: `${input.failedOcrJobs} OCR job(s) failed and require review`,
    });
  }

  if (input.lastSyncAt) {
    logs.push({
      time: formatTime(input.lastSyncAt),
      type: "SYNC",
      color: "text-indigo-700",
      message: "Last mailbox synchronization completed",
    });
  }

  return logs;
}

async function getDashboardData(): Promise<DashboardData> {
  try {
    const [
      connectedMailServers,
      totalMailServers,
      totalMessages,
      pendingOcr,
      completedOcr,
      failedOcrJobs,
      processingOcrJobs,
      recentMessages,
      lastConnection,
      snaptextConfig,
    ] = await Promise.all([
      prisma.mailServerConnection.count({ where: { status: "CONNECTED" } }),
      prisma.mailServerConnection.count(),
      prisma.emailMessage.count(),
      prisma.emailMessage.count({ where: { ocr: false } }),
      prisma.emailMessage.count({ where: { ocrStatus: "COMPLETED" } }),
      prisma.ocrJob.count({ where: { status: "FAILED" } }),
      prisma.ocrJob.count({ where: { status: "PROCESSING" } }),
      prisma.emailMessage.findMany({
        orderBy: { receivedAt: "desc" },
        take: 8,
        select: {
          id: true,
          fromEmail: true,
          toEmail: true,
          subject: true,
          attachmentNames: true,
          ocrStatus: true,
          receivedAt: true,
          matchedCategory: true,
        },
      }),
      prisma.mailServerConnection.findFirst({
        orderBy: { lastSyncAt: "desc" },
        select: { lastSyncAt: true },
      }),
      prisma.integrationConfiguration.findUnique({
        where: { provider: "snaptext" },
        select: { enabled: true },
      }),
    ]);

    const successRate = totalMessages > 0 ? (completedOcr / totalMessages) * 100 : 0;

    return {
      metrics: [
        {
          label: "Active IMAP Monitors",
          value: formatNumber(connectedMailServers),
          detail: `${formatNumber(totalMailServers)} saved connection(s)`,
          color: "text-sky-600",
          icon: Mail,
        },
        {
          label: "Messages Captured",
          value: formatNumber(totalMessages),
          detail: "Stored from monitored mailboxes",
          color: "text-indigo-600",
          icon: FileText,
        },
        {
          label: "OCR Success Rate",
          value: formatPercent(successRate),
          detail: `${formatNumber(completedOcr)} completed message(s)`,
          color: "text-emerald-600",
          icon: CheckCircle,
        },
        {
          label: "Current Queue",
          value: formatNumber(pendingOcr + processingOcrJobs),
          detail: `${formatNumber(pendingOcr)} OCR false, ${formatNumber(processingOcrJobs)} processing`,
          color: "text-amber-600",
          icon: Activity,
        },
      ],
      recentMessages: recentMessages.map((message) => ({
        id: message.id,
        fromEmail: message.fromEmail,
        toEmail: message.toEmail,
        subject: message.subject,
        document: message.attachmentNames[0] ?? "No attachment captured",
        status: message.ocrStatus,
        badge: getStatusBadge(message.ocrStatus),
        receivedAt: message.receivedAt,
        matchedCategory: message.matchedCategory,
      })),
      logs: createLogs({
        connectedMailServers,
        totalMessages,
        pendingOcr,
        failedOcrJobs,
        snaptextEnabled: Boolean(snaptextConfig?.enabled),
        lastSyncAt: lastConnection?.lastSyncAt ?? null,
      }),
    };
  } catch {
    return {
      metrics: [
        { label: "Active IMAP Monitors", value: "0", detail: "Database unavailable", color: "text-sky-600", icon: Mail },
        { label: "Messages Captured", value: "0", detail: "Database unavailable", color: "text-indigo-600", icon: FileText },
        { label: "OCR Success Rate", value: "0.0%", detail: "Database unavailable", color: "text-emerald-600", icon: CheckCircle },
        { label: "Current Queue", value: "0", detail: "Database unavailable", color: "text-amber-600", icon: Activity },
      ],
      recentMessages: [],
      logs: [],
      error: "Database belum siap atau migration belum lengkap. Jalankan prisma migrate deploy sebelum membuka overview.",
    };
  }
}

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const data = await getDashboardData();

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">Dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Middleware Overview</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Real-time monitoring berdasarkan data mail server, message queue, dan OCR jobs di database.
          </p>
        </div>
      </header>

      {data.error ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Overview data unavailable</p>
          <p className="mt-1 leading-6">{data.error}</p>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="OCR metrics">
        {data.metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                <Icon className={`size-5 ${metric.color}`} aria-hidden />
              </div>
              <p className="text-3xl font-semibold tracking-tight text-slate-950">{metric.value}</p>
              <p className="mt-2 text-sm text-slate-600">{metric.detail}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Recent Messages</h2>
              <p className="mt-1 text-sm text-slate-600">Pesan terbaru yang berhasil masuk ke message list.</p>
            </div>
            <AlertCircle className="size-5 text-amber-600" aria-hidden />
          </div>
          <div className="divide-y divide-slate-100">
            {data.recentMessages.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="mx-auto size-10 text-slate-400" aria-hidden />
                <p className="mt-3 font-semibold text-slate-950">No messages captured</p>
                <p className="mt-1 text-sm text-slate-600">Connect mail server, configure catch rules, then sync inbox.</p>
              </div>
            ) : (
              data.recentMessages.map((message) => (
                <article key={message.id} className="grid gap-4 p-5 transition hover:bg-slate-50 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_130px] lg:items-center">
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-slate-950">{message.subject}</p>
                    <p className="mt-1 break-words text-sm text-slate-600">From {message.fromEmail}</p>
                    <p className="mt-1 break-words text-xs text-slate-500">To {message.toEmail}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium text-slate-800">{message.document}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatTime(message.receivedAt)} {message.matchedCategory ? `• ${message.matchedCategory}` : ""}</p>
                  </div>
                  <div>
                    <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${message.badge}`}>
                      {message.status}
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <aside className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
            <Server className="size-5 text-slate-500" aria-hidden />
            <h2 className="text-lg font-semibold text-slate-950">System Signals</h2>
          </div>
          <div className="flex h-80 flex-col gap-2 overflow-y-auto bg-slate-50 p-4 font-mono text-xs text-slate-600">
            {data.logs.length === 0 ? (
              <p className="leading-5 text-slate-500">No system signals available.</p>
            ) : (
              data.logs.map((log) => (
                <p key={`${log.time}-${log.message}`} className="leading-5">
                  <span className="text-slate-400">[{log.time}]</span> <span className={log.color}>{log.type}</span> {log.message}
                </p>
              ))
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
