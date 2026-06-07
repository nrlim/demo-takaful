interface OcrProgressBarProps {
  label?: string;
  value?: number;
  indeterminate?: boolean;
}

function clampProgress(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function OcrProgressBar({
  label = "OCR processing",
  value = 55,
  indeterminate = true,
}: OcrProgressBarProps): React.JSX.Element {
  const progressValue = clampProgress(value);

  return (
    <div className="w-full min-w-32" aria-label={label}>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-sky-900">{label}</span>
        <span className="text-slate-500">In progress</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : progressValue}
        aria-valuetext={indeterminate ? "OCR processing is in progress" : `${progressValue}% complete`}
        className="h-2 overflow-hidden rounded-sm border border-sky-200 bg-sky-50"
      >
        <div
          className={`h-full rounded-sm bg-sky-700 ${indeterminate ? "animate-pulse" : ""}`}
          style={{ width: `${progressValue}%` }}
        />
      </div>
    </div>
  );
}
