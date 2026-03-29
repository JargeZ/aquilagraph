export type Project = {
  id: string;
  name: string;
  createdAt: number;
};

export const PROJECTS_STORAGE_KEY = "visualizer-projects";
export const PROJECT_PATHS_STORAGE_KEY = "visualizer-project-paths";

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}
