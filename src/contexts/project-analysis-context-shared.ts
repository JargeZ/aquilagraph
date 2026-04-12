import { createContext, type SetStateAction } from "react";
import type { AnalysisResult } from "@/core/analyze";
import type { AnalysisConfig } from "@/core/config/analysis-config";
import type { Project } from "@/types/project";

export interface ProjectAnalysisContextValue {
  projectId: string;
  project: Project | undefined;
  rootPath: string | null;
  pickDirectory: () => Promise<void>;
  /** Браузер: true, пока открыт диалог выбора папки (нельзя вызывать showDirectoryPicker повторно). */
  pickDirectoryLoading: boolean;
  /** Браузер: в IndexedDB есть папка, но после перезагрузки нет разрешения — нужен клик «Разрешить доступ». */
  browserDirectoryNeedsUserPermission: boolean;
  grantStoredDirectoryAccess: () => Promise<void>;
  /** Есть рабочий корень для чтения файлов (в браузере — после query/grant, не только подпись в UI). */
  hasAnalysisRoot: boolean;
  fileCount: number | null;
  countLoading: boolean;
  countError: string | null;
  refreshCount: () => Promise<void>;
  analysisConfig: AnalysisConfig;
  setAnalysisConfig: (value: SetStateAction<AnalysisConfig>) => void;
  analysisResult: AnalysisResult | null;
  analysisLoading: boolean;
  analysisError: string | null;
  runAnalysis: () => Promise<void>;
}

export const ProjectAnalysisContext =
  createContext<ProjectAnalysisContextValue | null>(null);
