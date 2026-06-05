import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateRecipientCatchRuleAction } from "../../actions";

export const dynamic = "force-dynamic";

const categoryOptions = [
  { value: "spaj", label: "SPAJ" },
  { value: "uw", label: "UW / Underwriting" },
  { value: "claim", label: "Claim" },
  { value: "policy", label: "Policy Issuance" },
  { value: "premium", label: "Premium / Payment" },
  { value: "medical", label: "Medical Document" },
  { value: "endorsement", label: "Endorsement" },
  { value: "finance", label: "Finance" },
] satisfies Array<{ value: string; label: string }>;

export default async function EditCatchRulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const rule = await prisma.recipientCatchRule.findUnique({ where: { id } }).catch(() => null);

  if (!rule) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <Link href="/dashboard/catch-rules" className="text-sm font-semibold text-sky-800 hover:text-sky-950">
          Back to OCR Inboxes
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Edit OCR Inbox Rule</h1>
      </header>

      <form action={updateRecipientCatchRuleAction} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <input type="hidden" name="ruleId" value={rule.id} />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-800">Email tujuan / alias inbox</label>
            <input id="email" name="email" type="email" defaultValue={rule.email} className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100" required />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="label" className="text-sm font-medium text-slate-800">Label rule</label>
            <input id="label" name="label" defaultValue={rule.label} className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100" required />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="category" className="text-sm font-medium text-slate-800">Kategori dokumen</label>
            <select id="category" name="category" defaultValue={rule.category} className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100">
              {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="priority" className="text-sm font-medium text-slate-800">Priority</label>
            <input id="priority" name="priority" type="number" min="1" max="99" defaultValue={rule.priority} className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100" />
          </div>
        </div>
        <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-800">
          <input type="checkbox" name="requireAttachment" value="true" defaultChecked={rule.requireAttachment} className="size-4 accent-sky-800" />
          Only catch messages with PDF attachment
        </label>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <label htmlFor="subjectKeywords" className="text-sm font-medium text-slate-800">Subject keywords</label>
            <textarea id="subjectKeywords" name="subjectKeywords" rows={4} defaultValue={rule.subjectKeywords.join(", ")} className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100" />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="bodyKeywords" className="text-sm font-medium text-slate-800">Content keywords</label>
            <textarea id="bodyKeywords" name="bodyKeywords" rows={4} defaultValue={rule.bodyKeywords.join(", ")} className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100" />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="attachmentKeywords" className="text-sm font-medium text-slate-800">Attachment filename keywords</label>
            <textarea id="attachmentKeywords" name="attachmentKeywords" rows={4} defaultValue={rule.attachmentKeywords.join(", ")} className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100" />
          </div>
        </div>
        <div className="flex gap-3">
          <button type="submit" className="h-11 rounded-md bg-sky-800 px-4 text-sm font-semibold text-white transition hover:bg-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-200">
            Save rule
          </button>
          <Link href="/dashboard/catch-rules" className="inline-flex h-11 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
