"use client";

import { FileText, Inbox } from "lucide-react";
import { StandardDataTable, type DataTableColumn, type SortDirection } from "@/components/standard-data-table";

export type MessageSortKey = "receivedAt" | "subject" | "fromEmail" | "ocrStatus" | "attachmentCount";

export interface MessageTableRow {
  id: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  receivedAtLabel: string;
  hasAttachments: boolean;
  attachmentCount: number;
  attachmentNames: string[];
  attachmentLinks: Array<{ filename: string; publicUrl: string }>;
  bodyPreview: string | null;
  matchedCategory: string | null;
  matchReason: string | null;
  ocr: boolean;
  ocrStatus: string;
  connectionName: string;
}

interface MessagesTableProps {
  rows: MessageTableRow[];
  search: string;
  sort: MessageSortKey;
  direction: SortDirection;
  status: string;
  ocr: string;
  attachment: string;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

function getOcrBadgeClass(message: MessageTableRow): string {
  if (message.ocr) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (message.ocrStatus === "FAILED") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (message.ocrStatus === "PROCESSING") {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }

  return "border-amber-200 bg-amber-50 text-amber-800";
}

export function MessagesTable({
  rows,
  search,
  sort,
  direction,
  status,
  ocr,
  attachment,
  page,
  pageSize,
  totalItems,
  totalPages,
}: MessagesTableProps): React.JSX.Element {
  const columns: DataTableColumn<MessageTableRow, MessageSortKey>[] = [
    {
      key: "message",
      header: "Message",
      sortKey: "subject",
      render: (message) => (
        <div className="min-w-0">
          <p className="break-words font-semibold text-slate-950">{message.subject}</p>
          <p className="mt-1 break-words text-sm text-slate-600">From {message.fromEmail}</p>
          <p className="mt-1 break-words text-xs text-slate-500">To {message.toEmail}</p>
          {message.bodyPreview ? (
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{message.bodyPreview}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: "connection",
      header: "Connection",
      sortKey: "receivedAt",
      render: (message) => (
        <div>
          <p className="text-sm font-medium text-slate-800">{message.connectionName}</p>
          <p className="mt-1 text-sm text-slate-600">{message.receivedAtLabel}</p>
          {message.matchReason ? (
            <p className="mt-2 text-xs font-medium text-indigo-700">Matched by {message.matchReason}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: "attachment",
      header: "Attachment",
      sortKey: "attachmentCount",
      render: (message) => (
        <div>
          <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${message.hasAttachments ? "border-indigo-200 bg-indigo-50 text-indigo-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
            <FileText className="mr-1 size-3.5" aria-hidden />
            {message.attachmentCount} files
          </span>
          {message.attachmentLinks.length > 0 ? (
            <div className="mt-2 flex flex-col gap-1">
              {message.attachmentLinks.slice(0, 2).map((attachment) => (
                <a
                  key={attachment.publicUrl}
                  href={attachment.publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="break-words text-xs font-medium text-sky-800 hover:text-sky-950 focus:outline-none focus:ring-2 focus:ring-sky-200"
                >
                  {attachment.filename}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: "ocr",
      header: "OCR",
      sortKey: "ocrStatus",
      render: (message) => (
        <div>
          <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${getOcrBadgeClass(message)}`}>
            OCR {message.ocr ? "true" : "false"}
          </span>
          <p className="mt-2 text-xs text-slate-500">{message.ocrStatus}</p>
          {message.matchedCategory ? (
            <p className="mt-1 text-xs font-medium text-slate-700">{message.matchedCategory}</p>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <StandardDataTable
      title="Captured messages"
      description="List ini menjadi queue awal sebelum dokumen dikirim ke Core OCR Engine. Gunakan search, filter, sort, dan pagination untuk audit data."
      searchValue={search}
      searchPlaceholder="Search subject, sender, recipient, content, attachment..."
      sort={sort}
      direction={direction}
      filters={[
        {
          key: "status",
          label: "Status",
          value: status,
          options: [
            { label: "All status", value: "" },
            { label: "Pending", value: "PENDING" },
            { label: "Processing", value: "PROCESSING" },
            { label: "Completed", value: "COMPLETED" },
            { label: "Failed", value: "FAILED" },
          ],
        },
        {
          key: "ocr",
          label: "OCR flag",
          value: ocr,
          options: [
            { label: "All OCR", value: "" },
            { label: "OCR false", value: "false" },
            { label: "OCR true", value: "true" },
          ],
        },
        {
          key: "attachment",
          label: "Attachment",
          value: attachment,
          options: [
            { label: "All messages", value: "" },
            { label: "With attachment", value: "with" },
            { label: "No attachment", value: "without" },
          ],
        },
      ]}
      columns={columns}
      rows={rows}
      getRowKey={(message) => message.id}
      pagination={{ page, pageSize, totalItems, totalPages }}
      emptyState={(
        <div className="p-8 text-center">
          <Inbox className="mx-auto size-10 text-slate-400" aria-hidden />
          <p className="mt-3 font-semibold text-slate-950">No messages found</p>
          <p className="mt-1 text-sm text-slate-600">Adjust search/filter or connect mail server lalu jalankan Sync inbox.</p>
        </div>
      )}
    />
  );
}
