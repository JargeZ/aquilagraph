import { useEffect, useState } from "react";
import {
  getAnalysisScanProgress,
  subscribeAnalysisScanProgress,
} from "@/lib/analysis-scan-progress";

/** Глобальная полоска прогресса парсинга файлов (обновляется из scanProject вне React). */
export function AnalysisScanProgressBar() {
  const [state, setState] = useState(getAnalysisScanProgress);
  useEffect(
    () =>
      subscribeAnalysisScanProgress(() => setState(getAnalysisScanProgress())),
    [],
  );
  if (!state || state.total <= 0) return null;
  const pct = Math.min(100, Math.round((100 * state.current) / state.total));
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-100 h-1 bg-muted"
      aria-hidden
    >
      <div
        className="h-full bg-primary transition-[width] duration-150 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
