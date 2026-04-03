import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { open } from "@tauri-apps/plugin-dialog";
import { readDir, readTextFile } from "@tauri-apps/plugin-fs";
import { Button } from "@ui/molecules/button/button";
import { useCallback, useEffect, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { AnalysisConfigPanel } from "@/components/analysis-config-panel";
import { GraphView } from "@/components/graph-view";
import { type AnalysisResult, analyzeProject } from "@/core/analyze";
import {
  type AnalysisConfig,
  DEFAULT_ANALYSIS_CONFIG,
  getAnalysisConfigKey,
} from "@/core/config/analysis-config";
import type { FileSystemAdapter } from "@/core/parser/project-scanner";
import { countFilesRecursive } from "@/lib/count-project-files";
import { isTauriRuntime } from "@/lib/is-tauri";
import {
  PROJECT_PATHS_STORAGE_KEY,
  PROJECTS_STORAGE_KEY,
  type Project,
} from "@/types/project";

const routeApi = getRouteApi("/$projectId");

function createTauriFsAdapter(basePath: string): FileSystemAdapter {
  return {
    readFile: (filePath: string) =>
      readTextFile(basePath ? `${basePath}/${filePath}` : filePath),
    listDir: async (dirPath: string) => {
      const fullPath = basePath
        ? dirPath
          ? `${basePath}/${dirPath}`
          : basePath
        : dirPath;
      const entries = await readDir(fullPath);
      return entries.map((e) => ({
        name: e.name,
        isDirectory: e.isDirectory,
      }));
    },
  };
}

export default function ProjectIdPage(): React.ReactNode {
  const { projectId } = routeApi.useParams();
  const navigate = useNavigate();
  const [projects] = useLocalStorage<Project[]>(PROJECTS_STORAGE_KEY, []);
  const [pathsByProject, setPathsByProject] = useLocalStorage<
    Record<string, string>
  >(PROJECT_PATHS_STORAGE_KEY, {});
  const [fileCount, setFileCount] = useState<number | null>(null);
  const [countError, setCountError] = useState<string | null>(null);
  const [countLoading, setCountLoading] = useState(false);

  const [analysisConfig, setAnalysisConfig] = useLocalStorage<AnalysisConfig>(
    getAnalysisConfigKey(projectId),
    DEFAULT_ANALYSIS_CONFIG,
  );
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null,
  );
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

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

  const runAnalysis = useCallback(async () => {
    if (!rootPath) return;
    if (!isTauriRuntime()) {
      setAnalysisError("Анализ доступен в приложении Tauri.");
      return;
    }
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const fs = createTauriFsAdapter(rootPath);
      const result = await analyzeProject("", analysisConfig, fs);
      setAnalysisResult(result);
    } catch (e) {
      console.error("[runAnalysis] failed:", e);
      const msg =
        e instanceof Error ? e.message : typeof e === "string" ? e : String(e);
      setAnalysisError(msg || "Неизвестная ошибка анализа");
      setAnalysisResult(null);
    } finally {
      setAnalysisLoading(false);
    }
  }, [rootPath, analysisConfig]);

  const project = projects.find((p) => p.id === projectId);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
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

      <section className="border-t border-border pt-4">
        <AnalysisConfigPanel
          config={analysisConfig}
          onChange={setAnalysisConfig}
        />
      </section>

      <section className="flex flex-col gap-3 border-t border-border pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => void runAnalysis()}
            disabled={!rootPath || analysisLoading}
          >
            {analysisLoading ? "Анализируем…" : "Анализировать"}
          </Button>
        </div>
        {analysisError && (
          <p className="text-sm text-destructive">{analysisError}</p>
        )}
      </section>

      {analysisResult && (
        <section className="border-t border-border pt-4">
          <GraphView
            elements={analysisResult.elements}
            graph={analysisResult.graph}
            dot={analysisResult.dot}
          />
        </section>
      )}
    </div>
  );
}
