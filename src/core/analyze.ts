import type { RootGraphModel } from "ts-graphviz";
import type { AnalysisConfig } from "./config/analysis-config";
import { buildGraph, graphToDot } from "./graph/graph-builder";
import {
  filterIsolatedNodes,
  filterUnclassifiedNodes,
} from "./graph/graph-filter";
import { classifyElements } from "./model/element-classifier";
import { createElementsFromAnalyses } from "./model/element-factory";
import type { ExecutableElement } from "./model/executable-element";
import { resolveUses } from "./model/uses-resolver";
import type { ScopeFileAnalysis } from "./parser/codeparsers-types";
import { type FileSystemAdapter, scanProject } from "./parser/project-scanner";
import { initParsers } from "./parser/universal-parser";

export interface AnalysisResult {
  elements: ExecutableElement[];
  graph: RootGraphModel;
  dot: string;
}

/** Построение графа из уже прочитанных и распарсенных файлов (без I/O). */
export function buildAnalysisResultFromAnalyses(
  analyses: ScopeFileAnalysis[],
  config: AnalysisConfig,
): AnalysisResult {
  const rawElements = createElementsFromAnalyses(analyses);
  const classified = classifyElements(rawElements, config);
  resolveUses(classified, analyses);

  const connected = filterIsolatedNodes(classified);
  const visible =
    config.hideUnclassified !== false
      ? filterUnclassifiedNodes(connected)
      : connected;

  const graph = buildGraph(visible, config);
  const dot = graphToDot(graph);

  return { elements: visible, graph, dot };
}

export async function analyzeProject(
  rootPath: string,
  config: AnalysisConfig,
  fs: FileSystemAdapter,
): Promise<AnalysisResult> {
  await initParsers();

  const analyses = await scanProject(rootPath, fs);
  return buildAnalysisResultFromAnalyses(analyses, config);
}
