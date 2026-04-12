import { useLingui } from "@lingui/react/macro";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import {
  type AnalysisResult,
  buildAnalysisResultFromAnalyses,
} from "@/core/analyze";
import {
  type AnalysisConfig,
  DEFAULT_ANALYSIS_CONFIG,
  getAnalysisConfigKey,
  normalizeAnalysisConfig,
} from "@/core/config/analysis-config";
import type { ScopeFileAnalysis } from "@/core/parser/codeparsers-types";
import {
  type FileSystemAdapter,
  scanProject,
} from "@/core/parser/project-scanner";
import { initParsers } from "@/core/parser/universal-parser";
import {
  beginAnalysisProgressTracking,
  finishAnalysisProgressTracking,
  invalidateAnalysisProgressTracking,
  reportAnalysisScanProgress,
} from "@/lib/analysis-scan-progress";
import {
  deleteProjectRootHandle,
  ensureDirectoryReadPermission,
  hasDirectoryReadPermission,
  loadProjectRootHandle,
  saveProjectRootHandle,
} from "@/lib/browser-project-root-storage";
import { countFilesRecursiveFromDirectoryHandle } from "@/lib/count-files-directory-handle";
import { countFilesRecursive } from "@/lib/count-project-files";
import {
  createDirectoryHandleFsAdapter,
  pickProjectDirectory,
} from "@/lib/directory-handle-fs-adapter";
import { isTauriRuntime } from "@/lib/is-tauri";
import {
  PROJECT_PATHS_STORAGE_KEY,
  PROJECT_WEB_ROOT_LABELS_KEY,
  PROJECTS_STORAGE_KEY,
  type Project,
} from "@/types/project";
import { ProjectAnalysisContext } from "./project-analysis-context-shared";

async function createTauriFsAdapter(
  basePath: string,
): Promise<FileSystemAdapter> {
  const { readDir, readTextFile } = await import("@tauri-apps/plugin-fs");
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
  const { t } = useLingui();
  const [projects, setProjects] = useLocalStorage<Project[]>(
    PROJECTS_STORAGE_KEY,
    [],
  );
  const [pathsByProject, setPathsByProject] = useLocalStorage<
    Record<string, string>
  >(PROJECT_PATHS_STORAGE_KEY, {});
  const [webRootLabels, setWebRootLabels] = useLocalStorage<
    Record<string, string>
  >(PROJECT_WEB_ROOT_LABELS_KEY, {});

  const [browserRootHandle, setBrowserRootHandle] =
    useState<FileSystemDirectoryHandle | null>(null);

  const [fileCount, setFileCount] = useState<number | null>(null);
  const [countError, setCountError] = useState<string | null>(null);
  const [countLoading, setCountLoading] = useState(false);

  const analysisStorageOptions = useMemo(
    () => ({
      deserializer: (v: string) => {
        try {
          return normalizeAnalysisConfig(JSON.parse(v));
        } catch {
          return DEFAULT_ANALYSIS_CONFIG;
        }
      },
    }),
    [],
  );
  const [storedAnalysisConfig, setAnalysisConfigRaw] =
    useLocalStorage<AnalysisConfig>(
      getAnalysisConfigKey(projectId),
      DEFAULT_ANALYSIS_CONFIG,
      analysisStorageOptions,
    );
  /** Без useMemo каждый рендер даёт новый объект → useEffect(analysisConfig) зацикливается. */
  const analysisConfig = useMemo(
    () => normalizeAnalysisConfig(storedAnalysisConfig),
    [storedAnalysisConfig],
  );
  const setAnalysisConfig = useCallback(
    (value: AnalysisConfig | ((prev: AnalysisConfig) => AnalysisConfig)) => {
      setAnalysisConfigRaw((prev) => {
        const base = normalizeAnalysisConfig(prev);
        const next = value instanceof Function ? value(base) : value;
        return normalizeAnalysisConfig(next);
      });
    },
    [setAnalysisConfigRaw],
  );
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null,
  );
  const [scanCache, setScanCache] = useState<ScopeFileAnalysis[] | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const analysisInFlightRef = useRef(false);
  const analysisGenerationRef = useRef(0);
  const directoryPickerInFlightRef = useRef(false);
  const [pickDirectoryLoading, setPickDirectoryLoading] = useState(false);
  const [
    browserDirectoryNeedsUserPermission,
    setBrowserDirectoryNeedsUserPermission,
  ] = useState(false);

  const project = projects.find((p) => p.id === projectId);

  const tauriRootPath = isTauriRuntime()
    ? (pathsByProject[projectId] ?? null)
    : null;
  const rootPath = isTauriRuntime()
    ? tauriRootPath
    : browserRootHandle
      ? (webRootLabels[projectId] ?? browserRootHandle.name)
      : (webRootLabels[projectId] ?? null);

  const hasAnalysisRoot = isTauriRuntime()
    ? Boolean(tauriRootPath)
    : Boolean(browserRootHandle);

  // --- Восстановление хэндла из IndexedDB при монтировании (только браузер) ---
  // requestPermission нельзя вызывать здесь — нужен user activation (клик).
  useEffect(() => {
    if (isTauriRuntime()) {
      setBrowserRootHandle(null);
      setBrowserDirectoryNeedsUserPermission(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const h = await loadProjectRootHandle(projectId);
      if (cancelled) return;
      if (!h) {
        setBrowserRootHandle(null);
        setBrowserDirectoryNeedsUserPermission(false);
        setWebRootLabels((prev) => {
          if (!prev[projectId]) return prev;
          const next = { ...prev };
          delete next[projectId];
          return next;
        });
        return;
      }
      const granted = await hasDirectoryReadPermission(h);
      if (cancelled) return;
      if (!granted) {
        setBrowserRootHandle(null);
        setBrowserDirectoryNeedsUserPermission(true);
        setWebRootLabels((prev) =>
          prev[projectId] ? prev : { ...prev, [projectId]: h.name },
        );
        setCountError(
          t`Нужно снова разрешить доступ к сохранённой папке. Нажмите «Разрешить доступ».`,
        );
        return;
      }
      setBrowserDirectoryNeedsUserPermission(false);
      setBrowserRootHandle(h);
      setWebRootLabels((prev) =>
        prev[projectId] ? prev : { ...prev, [projectId]: h.name },
      );
      setCountError(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, setWebRootLabels, t]);

  const grantStoredDirectoryAccess = useCallback(async () => {
    if (isTauriRuntime()) return;
    try {
      const h = await loadProjectRootHandle(projectId);
      if (!h) {
        setBrowserDirectoryNeedsUserPermission(false);
        return;
      }
      const ok = await ensureDirectoryReadPermission(h);
      if (!ok) {
        setCountError(
          t`Доступ не выдан. Попробуйте снова или выберите папку заново.`,
        );
        return;
      }
      setBrowserRootHandle(h);
      setBrowserDirectoryNeedsUserPermission(false);
      setWebRootLabels((prev) =>
        prev[projectId] ? prev : { ...prev, [projectId]: h.name },
      );
      setCountError(null);
    } catch (e) {
      setCountError(
        e instanceof Error ? e.message : t`Не удалось запросить доступ`,
      );
    }
  }, [projectId, setWebRootLabels, t]);

  // --- Подсчёт файлов ---
  const refreshCount = useCallback(async () => {
    if (!hasAnalysisRoot) {
      setFileCount(null);
      return;
    }
    setCountLoading(true);
    setCountError(null);
    try {
      if (isTauriRuntime()) {
        if (!tauriRootPath) {
          setFileCount(null);
          return;
        }
        const n = await countFilesRecursive(tauriRootPath);
        setFileCount(n);
      } else {
        if (!browserRootHandle) {
          setFileCount(null);
          return;
        }
        const n =
          await countFilesRecursiveFromDirectoryHandle(browserRootHandle);
        setFileCount(n);
      }
    } catch (e) {
      setFileCount(null);
      setCountError(
        e instanceof Error ? e.message : t`Не удалось прочитать каталог`,
      );
    } finally {
      setCountLoading(false);
    }
  }, [hasAnalysisRoot, tauriRootPath, browserRootHandle, t]);

  useEffect(() => {
    void refreshCount();
  }, [refreshCount]);

  // --- Выбор каталога ---
  const pickDirectory = useCallback(async () => {
    if (directoryPickerInFlightRef.current) return;
    directoryPickerInFlightRef.current = true;
    setPickDirectoryLoading(true);
    try {
      if (isTauriRuntime()) {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const selected = await open({
          directory: true,
          recursive: true,
          multiple: false,
          title: t`Каталог проекта`,
        });
        const path =
          selected === null
            ? null
            : Array.isArray(selected)
              ? (selected[0] ?? null)
              : selected;
        if (!path) return;
        setPathsByProject((prev) => ({ ...prev, [projectId]: path }));
        return;
      }

      if (typeof window.showDirectoryPicker !== "function") {
        setCountError(
          t`Этот браузер не поддерживает выбор папки. Используйте Chrome, Edge или другой браузер с File System Access API.`,
        );
        return;
      }

      try {
        const handle = await pickProjectDirectory();
        if (!handle) return;
        await saveProjectRootHandle(projectId, handle);
        setWebRootLabels((prev) => ({ ...prev, [projectId]: handle.name }));
        setBrowserDirectoryNeedsUserPermission(false);
        setBrowserRootHandle(handle);
        setCountError(null);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        const isPickerBusy =
          e instanceof DOMException &&
          (e.name === "InvalidStateError" ||
            e.message.includes("already active"));
        if (isPickerBusy) {
          setCountError(
            t`Диалог выбора папки уже открыт. Закройте его или дождитесь завершения.`,
          );
          return;
        }
        setCountError(
          e instanceof Error ? e.message : t`Не удалось выбрать каталог`,
        );
      }
    } finally {
      directoryPickerInFlightRef.current = false;
      setPickDirectoryLoading(false);
    }
  }, [projectId, setPathsByProject, setWebRootLabels, t]);

  // --- Запуск анализа ---
  const runAnalysis = useCallback(async () => {
    if (analysisInFlightRef.current) return;
    if (!hasAnalysisRoot) return;

    const generation = ++analysisGenerationRef.current;
    analysisInFlightRef.current = true;
    setAnalysisLoading(true);
    setAnalysisError(null);
    beginAnalysisProgressTracking(generation);
    try {
      await initParsers();
      const fs: FileSystemAdapter = isTauriRuntime()
        ? await createTauriFsAdapter(tauriRootPath as string)
        : createDirectoryHandleFsAdapter(
            browserRootHandle as FileSystemDirectoryHandle,
          );
      const analyses = await scanProject("", fs, {
        onParseProgress: (current, total) =>
          reportAnalysisScanProgress(generation, { current, total }),
      });
      if (analysisGenerationRef.current !== generation) return;
      setScanCache(analyses);
    } catch (e) {
      console.error("[runAnalysis] failed:", e);
      if (analysisGenerationRef.current !== generation) return;
      const msg =
        e instanceof Error ? e.message : typeof e === "string" ? e : String(e);
      setAnalysisError(msg || t`Неизвестная ошибка анализа`);
      setScanCache(null);
      setAnalysisResult(null);
    } finally {
      finishAnalysisProgressTracking(generation);
      analysisInFlightRef.current = false;
      if (analysisGenerationRef.current === generation) {
        setAnalysisLoading(false);
      }
    }
  }, [hasAnalysisRoot, tauriRootPath, browserRootHandle, t]);

  // --- Сброс при смене корня; инкремент generation отменяет предыдущий анализ ---
  // biome-ignore lint/correctness/useExhaustiveDependencies: tauriRootPath и browserRootHandle нужны, чтобы сброс произошёл при смене корня
  useEffect(() => {
    analysisGenerationRef.current += 1;
    invalidateAnalysisProgressTracking(analysisGenerationRef.current);
    analysisInFlightRef.current = false;
    setAnalysisResult(null);
    setScanCache(null);
    setAnalysisError(null);
    if (!hasAnalysisRoot) {
      setAnalysisLoading(false);
    }
  }, [projectId, tauriRootPath, browserRootHandle, hasAnalysisRoot]);

  // --- Пересборка результата из кеша при изменении конфига ---
  useEffect(() => {
    if (scanCache === null || !hasAnalysisRoot) return;
    try {
      setAnalysisResult(
        buildAnalysisResultFromAnalyses(scanCache, analysisConfig),
      );
      setAnalysisError(null);
    } catch (e) {
      console.error("[buildAnalysisResultFromAnalyses] failed:", e);
      const msg =
        e instanceof Error ? e.message : typeof e === "string" ? e : String(e);
      setAnalysisError(msg || t`Ошибка построения графа`);
      setAnalysisResult(null);
    }
  }, [scanCache, analysisConfig, hasAnalysisRoot, t]);

  // --- Автозапуск анализа при появлении корня ---
  // Единственный эффект для автозапуска; зависит от hasAnalysisRoot.
  // Для Tauri tauriRootPath → hasAnalysisRoot=true; для браузера browserRootHandle → hasAnalysisRoot=true.
  useEffect(() => {
    if (!hasAnalysisRoot) return;
    void runAnalysis();
  }, [hasAnalysisRoot, runAnalysis]);

  const deleteProject = useCallback(async () => {
    if (!isTauriRuntime()) {
      try {
        await deleteProjectRootHandle(projectId);
      } catch {
        /* игнорируем сбой IDB — проект всё равно убираем из списка */
      }
    }
    try {
      localStorage.removeItem(getAnalysisConfigKey(projectId));
    } catch {
      /* ignore */
    }
    setPathsByProject((prev) => {
      if (!(projectId in prev)) return prev;
      const next = { ...prev };
      delete next[projectId];
      return next;
    });
    setWebRootLabels((prev) => {
      if (!(projectId in prev)) return prev;
      const next = { ...prev };
      delete next[projectId];
      return next;
    });
    setBrowserRootHandle(null);
    setBrowserDirectoryNeedsUserPermission(false);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  }, [projectId, setPathsByProject, setWebRootLabels, setProjects]);

  return (
    <ProjectAnalysisContext.Provider
      value={{
        projectId,
        project,
        rootPath,
        pickDirectory,
        pickDirectoryLoading,
        browserDirectoryNeedsUserPermission: isTauriRuntime()
          ? false
          : browserDirectoryNeedsUserPermission,
        grantStoredDirectoryAccess: isTauriRuntime()
          ? async () => {}
          : grantStoredDirectoryAccess,
        hasAnalysisRoot,
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
        deleteProject,
      }}
    >
      {children}
    </ProjectAnalysisContext.Provider>
  );
}
