import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MessagesTable, type MessageSortKey, type MessageTableRow } from "./messages-table";

export const dynamic = "force-dynamic";

interface MessagesSearchParams {
  q?: string;
  status?: string;
  ocr?: string;
  attachment?: string;
  sort?: string;
  direction?: string;
  page?: string;
}

interface MessageListData {
  messages: MessageTableRow[];
  totalItems: number;
  totalPages: number;
  page: number;
  pageSize: number;
  totalStoredMessages: number;
  pendingOcr: number;
  withAttachment: number;
  error?: string;
}

const pageSize = 10;
const sortFields = ["receivedAt", "subject", "fromEmail", "ocrStatus", "attachmentCount"] satisfies MessageSortKey[];

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function normalizePage(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function normalizeSort(value: string | undefined): MessageSortKey {
  if (sortFields.includes(value as MessageSortKey)) {
    return value as MessageSortKey;
  }

  return "receivedAt";
}

function normalizeDirection(value: string | undefined): "asc" | "desc" {
  return value === "asc" ? "asc" : "desc";
}

function buildWhere(params: MessagesSearchParams): Prisma.EmailMessageWhereInput {
  const where: Prisma.EmailMessageWhereInput = {};
  const search = params.q?.trim();

  if (search) {
    where.OR = [
      { subject: { contains: search, mode: "insensitive" } },
      { fromEmail: { contains: search, mode: "insensitive" } },
      { toEmail: { contains: search, mode: "insensitive" } },
      { bodyPreview: { contains: search, mode: "insensitive" } },
      { matchedCategory: { contains: search, mode: "insensitive" } },
      { matchReason: { contains: search, mode: "insensitive" } },
      { attachmentNames: { has: search } },
    ];
  }

  if (
    params.status === "PENDING" ||
    params.status === "PROCESSING" ||
    params.status === "COMPLETED" ||
    params.status === "FAILED"
  ) {
    where.ocrStatus = params.status;
  }

  if (params.ocr === "true") {
    where.ocr = true;
  }

  if (params.ocr === "false") {
    where.ocr = false;
  }

  if (params.attachment === "with") {
    where.hasAttachments = true;
  }

  if (params.attachment === "without") {
    where.hasAttachments = false;
  }

  return where;
}

function buildOrderBy(sort: MessageSortKey, direction: "asc" | "desc"): Prisma.EmailMessageOrderByWithRelationInput {
  return { [sort]: direction } satisfies Prisma.EmailMessageOrderByWithRelationInput;
}

async function getMessages(params: MessagesSearchParams): Promise<MessageListData> {
  const page = normalizePage(params.page);
  const sort = normalizeSort(params.sort);
  const direction = normalizeDirection(params.direction);
  const where = buildWhere(params);

  try {
    const [messages, totalItems, totalStoredMessages, pendingOcr, withAttachment] = await Promise.all([
      prisma.emailMessage.findMany({
        where,
        orderBy: buildOrderBy(sort, direction),
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          connection: {
            select: { name: true },
          },
          attachments: {
            select: {
              filename: true,
              publicUrl: true,
            },
          },
        },
      }),
      prisma.emailMessage.count({ where }),
      prisma.emailMessage.count(),
      prisma.emailMessage.count({ where: { ocr: false } }),
      prisma.emailMessage.count({ where: { hasAttachments: true } }),
    ]);
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    return {
      messages: messages.map((message) => ({
        id: message.id,
        fromEmail: message.fromEmail,
        toEmail: message.toEmail,
        subject: message.subject,
        receivedAtLabel: formatDate(message.receivedAt),
        hasAttachments: message.hasAttachments,
        attachmentCount: message.attachmentCount,
        attachmentNames: message.attachmentNames,
        attachmentLinks: message.attachments,
        bodyPreview: message.bodyPreview,
        matchedCategory: message.matchedCategory,
        matchReason: message.matchReason,
        ocr: message.ocr,
        ocrStatus: message.ocrStatus,
        connectionName: message.connection.name,
      })),
      totalItems,
      totalPages,
      page: Math.min(page, totalPages),
      pageSize,
      totalStoredMessages,
      pendingOcr,
      withAttachment,
    };
  } catch {
    return {
      messages: [],
      totalItems: 0,
      totalPages: 1,
      page: 1,
      pageSize,
      totalStoredMessages: 0,
      pendingOcr: 0,
      withAttachment: 0,
      error: "Database belum siap. Message list akan muncul setelah Supabase dan Prisma migration aktif.",
    };
  }
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<MessagesSearchParams>;
}): Promise<React.JSX.Element> {
  const params = await searchParams;
  const data = await getMessages(params);
  const sort = normalizeSort(params.sort);
  const direction = normalizeDirection(params.direction);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">Messages</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Incoming Message List</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Pesan yang ditemukan dari mail server disimpan di sini. Table ini memakai standar search, filter, sort, dan pagination untuk semua list data berikutnya.
        </p>
      </header>

      {data.error ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Message storage belum terhubung</p>
          <p className="mt-1 leading-6">{data.error}</p>
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-sm font-medium text-sky-900">Stored messages</p>
          <p className="mt-2 text-3xl font-semibold text-sky-950">{data.totalStoredMessages}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">OCR false</p>
          <p className="mt-2 text-3xl font-semibold text-amber-950">{data.pendingOcr}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-900">With attachment</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-950">{data.withAttachment}</p>
        </div>
      </section>

      <MessagesTable
        rows={data.messages}
        search={params.q ?? ""}
        sort={sort}
        direction={direction}
        status={params.status ?? ""}
        ocr={params.ocr ?? ""}
        attachment={params.attachment ?? ""}
        page={data.page}
        pageSize={data.pageSize}
        totalItems={data.totalItems}
        totalPages={data.totalPages}
      />
    </div>
  );
}
