import { Database } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { RecipientCatchManager, type RecipientCatchRuleView } from "./email-sender-manager";

export const dynamic = "force-dynamic";

function toCategory(value: string): RecipientCatchRuleView["category"] {
  if (
    value === "spaj" ||
    value === "uw" ||
    value === "claim" ||
    value === "policy" ||
    value === "premium" ||
    value === "medical" ||
    value === "endorsement" ||
    value === "finance"
  ) {
    return value;
  }

  if (value === "claims") {
    return "claim";
  }

  return "spaj";
}

async function getRecipientRules(): Promise<{
  rules: RecipientCatchRuleView[];
  error?: string;
}> {
  try {
    const rules = await prisma.recipientCatchRule.findMany({
      orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }],
    });

    return {
      rules: rules.map((rule) => ({
        id: rule.id,
        email: rule.email,
        label: rule.label,
        category: toCategory(rule.category),
        enabled: rule.enabled,
        priority: rule.priority,
        requireAttachment: rule.requireAttachment,
        subjectKeywords: rule.subjectKeywords,
        bodyKeywords: rule.bodyKeywords,
        attachmentKeywords: rule.attachmentKeywords,
        matchedToday: rule.matchedToday,
      })),
    };
  } catch {
    return {
      rules: [],
      error: "Database belum siap. Tambahkan DATABASE_URL dan DIRECT_URL, lalu jalankan prisma migrate.",
    };
  }
}

export default async function EmailSendersPage(): Promise<React.JSX.Element> {
  const { rules, error } = await getRecipientRules();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">OCR Inboxes</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Manage Recipient Catch Rules</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Atur alamat tujuan atau alias inbox yang dipantau middleware. Rule aktif tersimpan permanen di Supabase dan menjadi filter awal sebelum dokumen diteruskan ke Core OCR Engine.
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

      <RecipientCatchManager rules={rules} />
    </div>
  );
}
