import { createContext } from "react";
import type { AnalysisResult } from "@/core/analyze";
import type { AnalysisConfig } from "@/core/config/analysis-config";
import type { Project } from "@/types/project";

export interface ProjectAnalysisContextValue {
  projectId: string;
  project: Project | undefined;
  rootPath: string | null;
  pickDirectory: () => Promise<void>;
  fileCount: number | null;
  countLoading: boolean;
  countError: string | null;
  refreshCount: () => Promise<void>;
  analysisConfig: AnalysisConfig;
  setAnalysisConfig: (config: AnalysisConfig) => void;
  analysisResult: AnalysisResult | null;
  analysisLoading: boolean;
  analysisError: string | null;
  runAnalysis: () => Promise<void>;
}

export const ProjectAnalysisContext =
  createContext<ProjectAnalysisContextValue | null>(null);
