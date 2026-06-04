"use client";

import { useState } from "react";
import { CheckCircle, MailPlus, Pause, Play, Trash2, X } from "lucide-react";
import type { InsuranceDocumentCategory } from "@/lib/validations/recipient-catch-rule";
import {
  createRecipientCatchRuleAction,
  deleteRecipientCatchRuleAction,
  toggleRecipientCatchRuleAction,
} from "./actions";

export interface RecipientCatchRuleView {
  id: string;
  email: string;
  label: string;
  category: InsuranceDocumentCategory;
  enabled: boolean;
  priority: number;
  requireAttachment: boolean;
  subjectKeywords: string[];
  bodyKeywords: string[];
  attachmentKeywords: string[];
  matchedToday: number;
}

const categoryOptions = [
  { value: "spaj", label: "SPAJ" },
  { value: "uw", label: "UW / Underwriting" },
  { value: "claim", label: "Claim" },
  { value: "policy", label: "Policy Issuance" },
  { value: "premium", label: "Premium / Payment" },
  { value: "medical", label: "Medical Document" },
  { value: "endorsement", label: "Endorsement" },
  { value: "finance", label: "Finance" },
] satisfies Array<{ value: RecipientCatchRuleView["category"]; label: string }>;

const categoryLabels: Record<RecipientCatchRuleView["category"], string> = {
  spaj: "SPAJ",
  uw: "UW / Underwriting",
  claim: "Claim",
  policy: "Policy Issuance",
  premium: "Premium / Payment",
  medical: "Medical Document",
  endorsement: "Endorsement",
  finance: "Finance",
};

const categoryClasses: Record<RecipientCatchRuleView["category"], string> = {
  spaj: "border-sky-200 bg-sky-50 text-sky-900",
  uw: "border-indigo-200 bg-indigo-50 text-indigo-900",
  claim: "border-red-200 bg-red-50 text-red-900",
  policy: "border-emerald-200 bg-emerald-50 text-emerald-900",
  premium: "border-amber-200 bg-amber-50 text-amber-900",
  medical: "border-teal-200 bg-teal-50 text-teal-900",
  endorsement: "border-violet-200 bg-violet-50 text-violet-900",
  finance: "border-slate-200 bg-slate-50 text-slate-800",
};

interface RecipientCatchManagerProps {
  rules: RecipientCatchRuleView[];
}

export function RecipientCatchManager({ rules }: RecipientCatchManagerProps): React.JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const activeRules = rules.filter((rule) => rule.enabled).length;
  const totalMatched = rules.reduce((total, rule) => total + rule.matchedToday, 0);

  return (
    <div className="flex flex-col gap-5">
      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-sm font-medium text-sky-900">Total inboxes</p>
          <p className="mt-2 text-3xl font-semibold text-sky-950">{rules.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-900">Active inboxes</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-950">{activeRules}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-sm font-medium text-indigo-900">Matched today</p>
          <p className="mt-2 text-3xl font-semibold text-indigo-950">{totalMatched}</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Recipient inbox rules</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Tersimpan permanen di Supabase via Prisma ORM.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-sky-800 px-4 text-sm font-semibold text-white transition hover:bg-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            <MailPlus className="size-4" aria-hidden />
            Add new inbox
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {rules.length === 0 ? (
            <div className="p-8 text-center">
              <MailPlus className="mx-auto size-10 text-slate-400" aria-hidden />
              <p className="mt-3 font-semibold text-slate-950">No recipient rule yet</p>
              <p className="mt-1 text-sm text-slate-600">Tambahkan OCR inbox pertama untuk mulai filtering pesan masuk.</p>
            </div>
          ) : (
            rules.map((rule) => (
              <article key={rule.id} className="grid gap-4 p-5 transition hover:bg-slate-50 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.85fr)_120px_minmax(0,1fr)_130px_180px] xl:items-center">
                <div className="min-w-0">
                  <p className="break-words font-semibold text-slate-950">{rule.email}</p>
                  <p className="mt-1 text-sm text-slate-500">Recipient / inbox alias</p>
                </div>
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium text-slate-800">{rule.label}</p>
                  <p className="mt-1 text-xs text-slate-500">Rule label</p>
                </div>
                <div>
                  <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${categoryClasses[rule.category]}`}>
                    {categoryLabels[rule.category]}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {rule.subjectKeywords.length > 0 ? <span className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800">Subject</span> : null}
                  {rule.bodyKeywords.length > 0 ? <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-800">Content</span> : null}
                  {rule.attachmentKeywords.length > 0 ? <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Attachment</span> : null}
                  {rule.requireAttachment ? <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">Require file</span> : null}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-semibold ${rule.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                      <CheckCircle className="size-3.5" aria-hidden />
                      {rule.enabled ? "Enabled" : "Paused"}
                    </span>
                    <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">P{rule.priority}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{rule.matchedToday} matched today</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                  <form action={toggleRecipientCatchRuleAction}>
                    <input type="hidden" name="ruleId" value={rule.id} />
                    <button type="submit" className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-200">
                      {rule.enabled ? <Pause className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
                      {rule.enabled ? "Pause" : "Enable"}
                    </button>
                  </form>
                  <form action={deleteRecipientCatchRuleAction}>
                    <input type="hidden" name="ruleId" value={rule.id} />
                    <button type="submit" className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-800 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-100">
                      <Trash2 className="size-3.5" aria-hidden />
                      Remove
                    </button>
                  </form>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="add-inbox-title">
          <section className="max-h-[calc(100dvh-3rem)] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-10 items-center justify-center rounded-md bg-sky-50 text-sky-800">
                  <MailPlus className="size-5" aria-hidden />
                </span>
                <div>
                  <h2 id="add-inbox-title" className="text-lg font-semibold text-slate-950">Tambah OCR inbox</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Data akan disimpan ke Supabase.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex size-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-200"
                aria-label="Close add inbox dialog"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <form className="flex flex-col gap-4 p-5" action={createRecipientCatchRuleAction}>
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-800">Email tujuan / alias inbox</label>
                <input id="email" name="email" type="email" className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none transition focus:border-sky-700 focus:ring-2 focus:ring-sky-100" placeholder="claims-ocr@takaful.com" required />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="label" className="text-sm font-medium text-slate-800">Label rule</label>
                <input id="label" name="label" className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none transition focus:border-sky-700 focus:ring-2 focus:ring-sky-100" placeholder="Claims OCR inbox" required />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label htmlFor="category" className="text-sm font-medium text-slate-800">Kategori dokumen</label>
                  <select id="category" name="category" className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none transition focus:border-sky-700 focus:ring-2 focus:ring-sky-100" defaultValue="spaj">
                    {categoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="priority" className="text-sm font-medium text-slate-800">Priority</label>
                  <input id="priority" name="priority" type="number" min="1" max="99" defaultValue="10" className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none transition focus:border-sky-700 focus:ring-2 focus:ring-sky-100" />
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-800">
                <input type="checkbox" name="requireAttachment" value="true" defaultChecked className="size-4 accent-sky-800" />
                Only catch messages with attachment
              </label>

              <div className="flex flex-col gap-2">
                <label htmlFor="subjectKeywords" className="text-sm font-medium text-slate-800">Subject keywords</label>
                <textarea id="subjectKeywords" name="subjectKeywords" rows={2} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 outline-none transition focus:border-sky-700 focus:ring-2 focus:ring-sky-100" placeholder="spaj, proposal, aplikasi" />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="bodyKeywords" className="text-sm font-medium text-slate-800">Content keywords</label>
                <textarea id="bodyKeywords" name="bodyKeywords" rows={2} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 outline-none transition focus:border-sky-700 focus:ring-2 focus:ring-sky-100" placeholder="nasabah, polis, underwriting" />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="attachmentKeywords" className="text-sm font-medium text-slate-800">Attachment filename keywords</label>
                <textarea id="attachmentKeywords" name="attachmentKeywords" rows={2} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 outline-none transition focus:border-sky-700 focus:ring-2 focus:ring-sky-100" placeholder="spaj, ktp, medical, invoice" />
              </div>

              <div className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm leading-6 text-indigo-900">
                Rule akan match secara bertingkat: recipient, attachment requirement, subject, content, lalu filename attachment.
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setIsModalOpen(false)} className="h-11 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-200">
                  Cancel
                </button>
                <button type="submit" className="h-11 rounded-md bg-sky-800 px-4 text-sm font-semibold text-white transition hover:bg-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-200">
                  Tambahkan OCR inbox
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
