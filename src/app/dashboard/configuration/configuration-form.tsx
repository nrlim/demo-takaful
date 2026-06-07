"use client";

import { useActionState } from "react";
import { SNAPTEXT_OCR_MODEL_IDS } from "@/lib/snaptext-constants";
import type { SnaptextOcrModelId } from "@/lib/validations/snaptext-configuration";
import { saveSnaptextConfigurationAction, type ConfigurationActionState } from "./actions";

interface ConfigurationFormProps {
  endpoint: string;
  enabled: boolean;
  hasApiKey: boolean;
  ocrModelId: SnaptextOcrModelId | null;
}

const initialState: ConfigurationActionState = {};

export function ConfigurationForm({
  endpoint,
  enabled,
  hasApiKey,
  ocrModelId,
}: ConfigurationFormProps): React.JSX.Element {
  const [state, formAction, pending] = useActionState(saveSnaptextConfigurationAction, initialState);

  return (
    <form action={formAction} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" noValidate>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-950">Snaptext OCR API</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Simpan API key secara terenkripsi. Endpoint ini dipakai oleh API middleware saat membuat OCR job.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2 md:col-span-2">
          <label htmlFor="endpoint" className="text-sm font-medium text-slate-800">Endpoint</label>
          <input
            id="endpoint"
            name="endpoint"
            defaultValue={endpoint}
            className="h-11 rounded-md border border-slate-300 px-3 text-base text-slate-950 outline-none transition focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <label htmlFor="apiKey" className="text-sm font-medium text-slate-800">API key</label>
          <input
            id="apiKey"
            name="apiKey"
            type="password"
            className="h-11 rounded-md border border-slate-300 px-3 text-base text-slate-950 outline-none transition focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
            placeholder={hasApiKey ? "Existing key saved. Enter new key to replace." : "Snaptext API key"}
          />
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <label htmlFor="ocrModelId" className="text-sm font-medium text-slate-800">OCR model</label>
          <select
            id="ocrModelId"
            name="ocrModelId"
            defaultValue={ocrModelId ?? ""}
            className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none transition focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
          >
            <option value="">Default Snaptext model</option>
            {SNAPTEXT_OCR_MODEL_IDS.map((modelId) => (
              <option key={modelId} value={modelId}>{modelId}</option>
            ))}
          </select>
          <p className="text-xs leading-5 text-slate-500">
            Nilai ini dikirim sebagai <code className="rounded-sm bg-slate-100 px-1 py-0.5 text-slate-700">ocrModelId</code> pada payload Snaptext. Kosongkan untuk mengirim null.
          </p>
        </div>

        <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-800 md:col-span-2">
          <input type="checkbox" name="enabled" value="true" defaultChecked={enabled} className="size-4 accent-sky-800" />
          Enable Snaptext OCR integration
        </label>
      </div>

      {state.error ? (
        <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.message}</p>
      ) : null}

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-md bg-sky-800 px-4 text-sm font-semibold text-white transition hover:bg-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving" : "Save configuration"}
        </button>
      </div>
    </form>
  );
}
