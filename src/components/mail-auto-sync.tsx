"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { syncMailMessagesAction } from "@/app/dashboard/mail-server/actions";

interface MailAutoSyncProps {
  connectionIds: string[];
  intervalMs?: number;
  initialDelayMs?: number;
}

const AUTO_SYNC_LOCK_KEY = "takaful-mail-auto-sync-lock";
const AUTO_SYNC_LOCK_TTL_MS = 90000;

function acquireSyncLock(startedAt: number): boolean {
  const currentLock = window.localStorage.getItem(AUTO_SYNC_LOCK_KEY);
  const lockedAt = Number(currentLock);

  if (currentLock && Number.isFinite(lockedAt) && startedAt - lockedAt < AUTO_SYNC_LOCK_TTL_MS) {
    return false;
  }

  window.localStorage.setItem(AUTO_SYNC_LOCK_KEY, String(startedAt));
  return true;
}

function releaseSyncLock(startedAt: number): void {
  const currentLock = Number(window.localStorage.getItem(AUTO_SYNC_LOCK_KEY));
  if (currentLock === startedAt) {
    window.localStorage.removeItem(AUTO_SYNC_LOCK_KEY);
  }
}

export function MailAutoSync({
  connectionIds,
  intervalMs = 30000,
  initialDelayMs = 4000,
}: MailAutoSyncProps): React.JSX.Element {
  const router = useRouter();
  const [enabled, setEnabled] = useState(connectionIds.length > 0);
  const [isPending, startTransition] = useTransition();
  const isRunningRef = useRef(false);
  const connectionKey = connectionIds.join(":");
  const syncConnectionIds = useMemo(
    () => connectionKey.split(":").filter((connectionId) => connectionId.length > 0),
    [connectionKey],
  );
  const isAutoSyncEnabled = enabled && syncConnectionIds.length > 0;

  useEffect(() => {
    if (!isAutoSyncEnabled) {
      return undefined;
    }

    const syncConnections = (): void => {
      if (isRunningRef.current || document.hidden) {
        return;
      }

      const startedAt = Date.now();
      if (!acquireSyncLock(startedAt)) {
        return;
      }

      isRunningRef.current = true;
      startTransition(async () => {
        try {
          for (const connectionId of syncConnectionIds) {
            const formData = new FormData();
            formData.set("connectionId", connectionId);
            await syncMailMessagesAction(formData);
          }
          router.refresh();
        } finally {
          isRunningRef.current = false;
          releaseSyncLock(startedAt);
        }
      });
    };

    const timeout = window.setTimeout(syncConnections, initialDelayMs);
    const interval = window.setInterval(syncConnections, intervalMs);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [initialDelayMs, intervalMs, isAutoSyncEnabled, router, syncConnectionIds]);

  return (
    <button
      type="button"
      disabled={syncConnectionIds.length === 0}
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
