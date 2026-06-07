"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshSnaptextResultsAction } from "@/app/dashboard/ocr-results/actions";

interface OcrAutoRefreshProps {
  enabled: boolean;
  intervalMs?: number;
}

export function OcrAutoRefresh({
  enabled,
  intervalMs = 5000,
}: OcrAutoRefreshProps): React.JSX.Element | null {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const refresh = (): void => {
      startTransition(async () => {
        await refreshSnaptextResultsAction();
        router.refresh();
      });
    };

    refresh();
    const interval = window.setInterval(refresh, intervalMs);

    return () => window.clearInterval(interval);
  }, [enabled, intervalMs, router]);

  return null;
}
