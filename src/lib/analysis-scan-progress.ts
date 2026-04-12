export type AnalysisScanProgressState = {
  current: number;
  total: number;
};

let progress: AnalysisScanProgressState | null = null;
/** Совпадает с generation из runAnalysis — игнорируем обновления от устаревших сканов. */
let activeGeneration = -1;

const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

/** Вызывать в начале runAnalysis с тем же generation, что передаётся в scanProject. */
export function beginAnalysisProgressTracking(generation: number) {
  activeGeneration = generation;
  progress = null;
  notify();
}

/** При смене корня/проекта ref generation увеличивается — отрубаем обновления от старого скана. */
export function invalidateAnalysisProgressTracking(nextGeneration: number) {
  activeGeneration = nextGeneration;
  progress = null;
  notify();
}

export function reportAnalysisScanProgress(
  generation: number,
  state: AnalysisScanProgressState | null,
) {
  if (generation !== activeGeneration) return;
  progress = state;
  notify();
}

/** Сброс полосы; для чужого generation — no-op. */
export function finishAnalysisProgressTracking(generation: number) {
  if (generation !== activeGeneration) return;
  progress = null;
  notify();
}

export function getAnalysisScanProgress(): AnalysisScanProgressState | null {
  return progress;
}

export function subscribeAnalysisScanProgress(
  onChange: () => void,
): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}
