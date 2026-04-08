import { open } from "@tauri-apps/plugin-dialog";
import { readDir, readTextFile } from "@tauri-apps/plugin-fs";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import {
  type AnalysisResult,
  buildAnalysisResultFromAnalyses,
} from "@/core/analyze";
import {
  type AnalysisConfig,
  DEFAULT_ANALYSIS_CONFIG,
  getAnalysisConfigKey,
} from "@/core/config/analysis-config";
import type { ScopeFileAnalysis } from "@/core/parser/codeparsers-types";
import {
  type FileSystemAdapter,
  scanProject,
} from "@/core/parser/project-scanner";
import { initParser } from "@/core/parser/python-parser";
import { countFilesRecursive } from "@/lib/count-project-files";
import { isTauriRuntime } from "@/lib/is-tauri";
import {
  PROJECT_PATHS_STORAGE_KEY,
  PROJECTS_STORAGE_KEY,
  type Project,
} from "@/types/project";
import { ProjectAnalysisContext } from "./project-analysis-context-shared";

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

export function ProjectAnalysisProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: React.ReactNode;
}) {
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
  const [scanCache, setScanCache] = useState<ScopeFileAnalysis[] | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const analysisInFlightRef = useRef(false);
  const analysisGenerationRef = useRef(0);
  const runAnalysisRef = useRef<() => Promise<void>>(async () => {});

  const project = projects.find((p) => p.id === projectId);
  const rootPath = pathsByProject[projectId] ?? null;

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
    if (!path) return;
    setPathsByProject((prev) => ({ ...prev, [projectId]: path }));
  }, [projectId, setPathsByProject]);

  const runAnalysis = useCallback(async () => {
    if (!rootPath) return;
    if (analysisInFlightRef.current) return;
    if (!isTauriRuntime()) {
      setAnalysisError("Анализ доступен в приложении Tauri.");
      return;
    }
    const generation = analysisGenerationRef.current;
    analysisInFlightRef.current = true;
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      await initParser();
      const fs = createTauriFsAdapter(rootPath);
      const analyses = await scanProject("", fs);
      if (analysisGenerationRef.current !== generation) return;
      setScanCache(analyses);
    } catch (e) {
      console.error("[runAnalysis] failed:", e);
      if (analysisGenerationRef.current !== generation) return;
      const msg =
        e instanceof Error ? e.message : typeof e === "string" ? e : String(e);
      setAnalysisError(msg || "Неизвестная ошибка анализа");
      setScanCache(null);
      setAnalysisResult(null);
    } finally {
      analysisInFlightRef.current = false;
      if (analysisGenerationRef.current === generation) {
        setAnalysisLoading(false);
      }
    }
  }, [rootPath]);

  runAnalysisRef.current = runAnalysis;

  useEffect(() => {
    analysisGenerationRef.current += 1;
    analysisInFlightRef.current = false;
    setAnalysisResult(null);
    setScanCache(null);
    setAnalysisError(null);
    if (!rootPath) {
      setAnalysisLoading(false);
    }
  }, [rootPath]);

  useEffect(() => {
    if (scanCache === null || !rootPath || !isTauriRuntime()) return;
    try {
      setAnalysisResult(
        buildAnalysisResultFromAnalyses(scanCache, analysisConfig),
      );
      setAnalysisError(null);
    } catch (e) {
      console.error("[buildAnalysisResultFromAnalyses] failed:", e);
      const msg =
        e instanceof Error ? e.message : typeof e === "string" ? e : String(e);
      setAnalysisError(msg || "Ошибка построения графа");
      setAnalysisResult(null);
    }
  }, [scanCache, analysisConfig, rootPath]);

  useEffect(() => {
    if (!rootPath || !isTauriRuntime()) return;
    void runAnalysisRef.current();
  }, [rootPath]);

  return (
    <ProjectAnalysisContext.Provider
      value={{
        projectId,
        project,
        rootPath,
        pickDirectory,
        fileCount,
        countLoading,
        countError,
        refreshCount,
        analysisConfig,
        setAnalysisConfig,
        analysisResult,
        analysisLoading,
        analysisError,
        runAnalysis,
      }}
    >
      {children}
    </ProjectAnalysisContext.Provider>
  );
}
