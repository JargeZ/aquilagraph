import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@ui/molecules/button/button";
import { useCallback, useEffect, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { countFilesRecursive } from "@/lib/count-project-files";
import { isTauriRuntime } from "@/lib/is-tauri";
import {
  isValidUuid,
  PROJECT_PATHS_STORAGE_KEY,
  PROJECTS_STORAGE_KEY,
  type Project,
} from "@/types/project";

export const Route = createFileRoute("/$projectId")({
  beforeLoad: ({ params }) => {
    if (!isValidUuid(params.projectId)) {
      throw redirect({ to: "/" });
    }
  },
  component: ProjectPage,
});

export function ProjectPage(): React.ReactNode {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const [projects] = useLocalStorage<Project[]>(PROJECTS_STORAGE_KEY, []);
  const [pathsByProject, setPathsByProject] = useLocalStorage<
    Record<string, string>
  >(PROJECT_PATHS_STORAGE_KEY, {});
  const [fileCount, setFileCount] = useState<number | null>(null);
  const [countError, setCountError] = useState<string | null>(null);
  const [countLoading, setCountLoading] = useState(false);

  const rootPath = pathsByProject[projectId] ?? null;

  useEffect(() => {
    const exists = projects.some((p) => p.id === projectId);
    if (!exists) {
      void navigate({ to: "/" });
    }
  }, [projects, projectId, navigate]);

  const refreshCount = useCallback(async () => {
    if (!rootPath) {
      setFileCount(null);
      return;
    }
    if (!isTauriRuntime()) {
      setCountError("Подсчёт файлов доступен в приложении Tauri.");
      setFileCount(null);
      return;
    }
    setCountLoading(true);
    setCountError(null);
    try {
      const n = await countFilesRecursive(rootPath);
      setFileCount(n);
    } catch (e) {
      setFileCount(null);
      setCountError(
        e instanceof Error ? e.message : "Не удалось прочитать каталог",
      );
    } finally {
      setCountLoading(false);
    }
  }, [rootPath]);

  useEffect(() => {
    void refreshCount();
  }, [refreshCount]);

  const pickDirectory = useCallback(async () => {
    if (!isTauriRuntime()) {
      setCountError("Выбор папки доступен в приложении Tauri.");
      return;
    }
    const selected = await open({
      directory: true,
      recursive: true,
      multiple: false,
      title: "Каталог проекта",
    });
    const path =
      selected === null
        ? null
        : Array.isArray(selected)
          ? (selected[0] ?? null)
          : selected;
    if (!path) {
      return;
    }
    setPathsByProject((prev) => ({ ...prev, [projectId]: path }));
  }, [projectId, setPathsByProject]);

  const project = projects.find((p) => p.id === projectId);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
      <div>
        <h1 className="text-lg font-semibold text-foreground">
          {project?.name ?? "Проект"}
        </h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {projectId}
        </p>
      </div>

      <section className="flex flex-col gap-3 border-t border-border pt-4">
        <h2 className="text-sm font-medium text-foreground">Каталог</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" onClick={pickDirectory}>
            Выбрать папку
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void refreshCount()}
            disabled={!rootPath || countLoading}
          >
            Обновить счётчик
          </Button>
        </div>
        {rootPath ? (
          <p className="break-all text-sm text-muted-foreground">{rootPath}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Папка не выбрана — нажмите «Выбрать папку».
          </p>
        )}
      </section>

      <section className="border-t border-border pt-4">
        <h2 className="text-sm font-medium text-foreground">Файлы</h2>
        {countLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Считаем…</p>
        ) : countError ? (
          <p className="mt-2 text-sm text-destructive">{countError}</p>
        ) : fileCount !== null ? (
          <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
            {fileCount}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Выберите каталог, чтобы увидеть число файлов.
          </p>
        )}
      </section>
    </div>
  );
}
