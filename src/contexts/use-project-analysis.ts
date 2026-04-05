import { useContext } from "react";
import {
  ProjectAnalysisContext,
  type ProjectAnalysisContextValue,
} from "./project-analysis-context-shared";

export function useProjectAnalysis(): ProjectAnalysisContextValue {
  const ctx = useContext(ProjectAnalysisContext);
  if (!ctx) {
    throw new Error(
      "useProjectAnalysis must be used within ProjectAnalysisProvider",
    );
  }
  return ctx;
}
