import type { JsonValue } from "@prisma/client/runtime/client";

function isRecord(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatLabel(value: string): string {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function stringifyPrimitive(value: JsonValue): string {
  if (value === null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function getPageLabel(item: JsonValue, fallback: string): string {
  if (!isRecord(item)) {
    return fallback;
  }

  const pageValue = item.page ?? item.page_number ?? item.pageNumber ?? item.page_index ?? item.pageIndex;
  if (typeof pageValue === "number" || typeof pageValue === "string") {
    return `Page ${pageValue}`;
  }

  return fallback;
}

function primitiveFieldClass(value: JsonValue): string {
  if (typeof value === "string" && value.length > 80) {
    return "md:col-span-2";
  }

  return "";
}

function PrimitiveValue({ value }: { value: JsonValue }): React.JSX.Element {
  if (typeof value === "boolean") {
    return (
      <span className={`inline-flex h-9 items-center rounded-md border px-3 text-sm font-semibold ${value ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
        {value ? "Yes" : "No"}
      </span>
    );
  }

  if (typeof value === "string" && value.length > 80) {
    return (
      <textarea
        readOnly
        value={value}
        rows={Math.min(8, Math.max(3, Math.ceil(value.length / 90)))}
        className="min-h-24 w-full resize-y rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
      />
    );
  }

  return (
    <div className="min-h-10 w-full overflow-x-auto rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-900">
      {stringifyPrimitive(value) || <span className="text-slate-400">Not available</span>}
    </div>
  );
}

export function ResultFormRenderer({
  data,
  prefix = "Result",
  level = 0,
}: {
  data: JsonValue;
  prefix?: string;
  level?: number;
}): React.JSX.Element {
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">No items captured.</p>;
    }

    return (
      <div className="flex flex-col gap-3">
        {data.map((item, index) => {
          const fallbackLabel = `${formatLabel(prefix)} ${index + 1}`;
          const sectionLabel = getPageLabel(item, fallbackLabel);

          return (
            <section key={`${prefix}-${index}`} className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">{sectionLabel}</h3>
              <ResultFormRenderer data={item} prefix={`${prefix} ${index + 1}`} level={level + 1} />
            </section>
          );
        })}
      </div>
    );
  }

  if (isRecord(data)) {
    const entries = Object.entries(data);

    if (entries.length === 0) {
      return <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">No fields captured.</p>;
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {entries.map(([key, value]) => {
          const isNested = typeof value === "object" && value !== null;
          return (
            <div key={key} className={isNested ? "md:col-span-2" : primitiveFieldClass(value)}>
              {isNested ? (
                <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h2 className={`${level === 0 ? "text-base" : "text-sm"} mb-3 font-semibold text-slate-950`}>
                    {formatLabel(key)}
                  </h2>
                  <ResultFormRenderer data={value} prefix={key} level={level + 1} />
                </section>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">{formatLabel(key)}</label>
                  <PrimitiveValue value={value} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return <PrimitiveValue value={data} />;
}
