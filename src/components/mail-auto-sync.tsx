"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { syncMailMessagesAction } from "@/app/dashboard/mail-server/actions";

interface MailAutoSyncProps {
  connectionIds: string[];
  intervalMs?: number;
}

export function MailAutoSync({
  connectionIds,
  intervalMs = 15000,
}: MailAutoSyncProps): React.JSX.Element {
  const router = useRouter();
  const [enabled, setEnabled] = useState(connectionIds.length > 0);
  const [isPending, startTransition] = useTransition();
  const isRunningRef = useRef(false);
  const connectionKey = connectionIds.join(":");
  const isAutoSyncEnabled = enabled && connectionIds.length > 0;

  useEffect(() => {
    if (!isAutoSyncEnabled) {
      return undefined;
    }

    const syncConnections = (): void => {
      if (isRunningRef.current) {
        return;
      }

      isRunningRef.current = true;
      startTransition(async () => {
        try {
          for (const connectionId of connectionIds) {
            const formData = new FormData();
            formData.set("connectionId", connectionId);
            await syncMailMessagesAction(formData);
          }
          router.refresh();
        } finally {
          isRunningRef.current = false;
        }
      });
    };

    syncConnections();
    const interval = window.setInterval(syncConnections, intervalMs);

    return () => window.clearInterval(interval);
  }, [connectionIds, connectionKey, isAutoSyncEnabled, intervalMs, router]);

  return (
    <button
      type="button"
      disabled={connectionIds.length === 0}
      onClick={() => setEnabled((current) => !current)}
      className={`rounded-md border px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-50 ${
        isAutoSyncEnabled
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      Auto sync {isAutoSyncEnabled ? (isPending ? "syncing" : "on") : "off"}
    </button>
  );
}
