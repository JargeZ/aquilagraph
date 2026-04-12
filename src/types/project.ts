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

/** Заголовок проекта: имя каталога из пути, иначе подпись веб-корня, иначе сохранённое имя. */
export function getProjectDisplayTitle(
  project: Project,
  pathsByProject: Record<string, string>,
  webRootLabels: Record<string, string>,
): string {
  const diskPath = pathsByProject[project.id];
  if (diskPath) return basenameFromPath(diskPath);
  const web = webRootLabels[project.id];
  if (web) return web;
  return project.name;
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
