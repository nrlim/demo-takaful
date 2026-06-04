import type { JsonValue } from "@prisma/client/runtime/client";

function isRecord(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringifyPrimitive(value: JsonValue): string {
  if (value === null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export function ResultFormRenderer({
  data,
  prefix = "Result",
}: {
  data: JsonValue;
  prefix?: string;
}): React.JSX.Element {
  if (Array.isArray(data)) {
    return (
      <div className="flex flex-col gap-4">
        {data.map((item, index) => (
          <section key={`${prefix}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">{prefix} {index + 1}</h3>
            <ResultFormRenderer data={item} prefix={`${prefix} ${index + 1}`} />
          </section>
        ))}
      </div>
    );
  }

  if (isRecord(data)) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className={typeof value === "object" && value !== null ? "md:col-span-2" : ""}>
            <label className="mb-1 block text-sm font-medium capitalize text-slate-700">
              {key.replace(/[_-]/g, " ")}
            </label>
            {typeof value === "object" && value !== null ? (
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <ResultFormRenderer data={value} prefix={key} />
              </div>
            ) : (
              <input
                readOnly
                value={stringifyPrimitive(value)}
                className="h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 outline-none"
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <input
      readOnly
      value={stringifyPrimitive(data)}
      className="h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 outline-none"
    />
  );
}
