export type Project = {
  id: string;
  name: string;
  createdAt: number;
};

/** Последний сегмент пути (Windows/macOS/Linux). */
export function basenameFromPath(path: string): string {
  const normalized = path.replace(/[/\\]+$/, "");
  const seg = normalized.split(/[/\\]/).filter(Boolean).pop();
  return seg ?? path;
}

/** Заголовок проекта для UI: в первую очередь сохранённое имя. */
export function getProjectDisplayTitle(
  project: Project,
  _pathsByProject: Record<string, string>,
  _webRootLabels: Record<string, string>,
): string {
  const saved = project.name.trim();
  if (saved) return saved;
  return "Unnamed";
}

export const PROJECTS_STORAGE_KEY = "visualizer-projects";
export const PROJECT_PATHS_STORAGE_KEY = "visualizer-project-paths";
/** Подписи к корню проекта в браузере (имя каталога); сами хэндлы — в IndexedDB. */
export const PROJECT_WEB_ROOT_LABELS_KEY = "visualizer-project-web-root-labels";

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}
