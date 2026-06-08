"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshSnaptextResultsAction } from "@/app/dashboard/ocr-results/actions";

interface OcrAutoRefreshProps {
  enabled: boolean;
  intervalMs?: number;
  initialDelayMs?: number;
}

export function OcrAutoRefresh({
  enabled,
  intervalMs = 10000,
  initialDelayMs = 2500,
}: OcrAutoRefreshProps): React.JSX.Element | null {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const refresh = (): void => {
      if (isRunningRef.current || document.hidden) {
        return;
      }

      isRunningRef.current = true;
      startTransition(async () => {
        try {
          await refreshSnaptextResultsAction();
          router.refresh();
        } finally {
          isRunningRef.current = false;
        }
      });
    };

    const timeout = window.setTimeout(refresh, initialDelayMs);
    const interval = window.setInterval(refresh, intervalMs);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [enabled, initialDelayMs, intervalMs, router]);

  return null;
}
