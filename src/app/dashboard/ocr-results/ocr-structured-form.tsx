"use client";

import { useMemo } from "react";
import type { JsonValue } from "@prisma/client/runtime/client";
import {
  CheckCircle2,
  FileText,
  User,
  MapPin,
  Briefcase,
  Box,
  Shield,
  CreditCard,
  Users,
  Activity,
  HeartPulse,
  Receipt,
  UserSquare,
  Building,
} from "lucide-react";
import { mapOcrData } from "@/lib/ocr-data-mapper";

function formatLabel(value: string): string {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(value: unknown): string {
  if (typeof value !== "number") return String(value);
  return `IDR ${value.toLocaleString("id-ID")}`;
}

function formatDate(value: unknown): string {
  if (typeof value !== "string") return String(value);
  return value;
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
        <Icon className="h-5 w-5 text-sky-700" />
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function FieldGrid({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {entries.map(([key, value]) => {
        let displayValue: React.ReactNode = String(value);

        if (typeof value === "boolean") {
          displayValue = (
            <span className={`inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-semibold ${value ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
              {value ? "Ya" : "Tidak"}
            </span>
          );
        } else if (key === "amount" || key === "amount_idr" || key.includes("fee")) {
          displayValue = formatCurrency(value);
        } else if (key.includes("date")) {
          displayValue = formatDate(value);
        }

        return (
          <div key={key} className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-500">{formatLabel(key)}</label>
            <div className="text-sm font-medium text-slate-950">{displayValue}</div>
          </div>
        );
      })}
    </div>
  );
}

function DataTable({ data, columns }: { data: Array<Record<string, unknown>>; columns: string[] }) {
  if (data.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            {columns.map((col) => (
              <th key={col} className="whitespace-nowrap px-4 py-3 font-medium">{formatLabel(col)}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50">
              {columns.map((col) => {
                const val = row[col];
                let display = String(val ?? "-");
                if (typeof val === "boolean") display = val ? "Ya" : "Tidak";
                if (col === "amount" && typeof val === "number") display = formatCurrency(val);
                if (col === "percentage" && typeof val === "number") display = `${val}%`;

                return (
                  <td key={col} className="px-4 py-3 text-slate-900">{display}</td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OcrStructuredForm({
  data,
  response,
}: {
  data: JsonValue;
  response?: JsonValue | null;
}) {
  const mapped = useMemo(() => mapOcrData(data, response), [data, response]);

  return (
    <div className="flex flex-col gap-6">
      {Object.keys(mapped.documentInfo).length > 0 && (
        <SectionCard title="Informasi Dokumen" icon={FileText}>
          <FieldGrid data={mapped.documentInfo} />
        </SectionCard>
      )}

      {Object.keys(mapped.personalData).length > 0 && (
        <SectionCard title="Data Pribadi Peserta" icon={User}>
          <FieldGrid data={mapped.personalData} />
        </SectionCard>
      )}

      {Object.keys(mapped.address).length > 0 && (
        <SectionCard title="Alamat" icon={MapPin}>
          <FieldGrid data={mapped.address} />
        </SectionCard>
      )}

      {Object.keys(mapped.employment).length > 0 && (
        <SectionCard title="Pekerjaan" icon={Briefcase}>
          <FieldGrid data={mapped.employment} />
        </SectionCard>
      )}

      {Object.keys(mapped.productDetails).length > 0 && (
        <SectionCard title="Detail Produk" icon={Box}>
          <FieldGrid data={mapped.productDetails} />
        </SectionCard>
      )}

      {Object.keys(mapped.manfaatTakaful).length > 0 && (
        <SectionCard title="Manfaat Takaful" icon={Shield}>
          <FieldGrid data={mapped.manfaatTakaful} />
        </SectionCard>
      )}

      {Object.keys(mapped.paymentMethod).length > 0 && (
        <SectionCard title="Metode Pembayaran" icon={CreditCard}>
          <FieldGrid data={mapped.paymentMethod} />
        </SectionCard>
      )}

      {mapped.beneficiaries.length > 0 && (
        <SectionCard title="Ahli Waris" icon={Users}>
          <DataTable
            data={mapped.beneficiaries}
            columns={Array.from(new Set(mapped.beneficiaries.flatMap(Object.keys)))}
          />
        </SectionCard>
      )}

      {mapped.healthHistory.length > 0 && (
        <SectionCard title="Riwayat Kesehatan" icon={Activity}>
          <DataTable
            data={mapped.healthHistory}
            columns={["question", "yes", "no", "details"]}
          />
        </SectionCard>
      )}

      {mapped.familyHealthHistory.length > 0 && (
        <SectionCard title="Riwayat Kesehatan Keluarga" icon={HeartPulse}>
          <DataTable
            data={mapped.familyHealthHistory}
            columns={Array.from(new Set(mapped.familyHealthHistory.flatMap(Object.keys)))}
          />
        </SectionCard>
      )}

      {mapped.fees.length > 0 && (
        <SectionCard title="Biaya-Biaya" icon={Receipt}>
          <DataTable
            data={mapped.fees}
            columns={Array.from(new Set(mapped.fees.flatMap(Object.keys)))}
          />
        </SectionCard>
      )}

      {Object.keys(mapped.agent).length > 0 && (
        <SectionCard title="Agen" icon={UserSquare}>
          <FieldGrid data={mapped.agent} />
        </SectionCard>
      )}

      {Object.keys(mapped.issuer).length > 0 && (
        <SectionCard title="Penerbit" icon={Building}>
          <FieldGrid data={mapped.issuer} />
        </SectionCard>
      )}
    </div>
  );
}
