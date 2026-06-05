"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function LogsAutoRefresh(): React.JSX.Element {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const interval = window.setInterval(() => {
      router.refresh();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [enabled, router]);

  return (
    <button
      type="button"
      onClick={() => setEnabled((current) => !current)}
      className={`rounded-md border px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-200 ${
        enabled
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      Auto refresh {enabled ? "on" : "off"}
    </button>
  );
}
