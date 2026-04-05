import type { RootGraphModel } from "ts-graphviz";
import type { AnalysisConfig } from "./config/analysis-config";
import type { ExecutableElement } from "./model/executable-element";
import { initParser } from "./parser/python-parser";
import { scanProject, type FileSystemAdapter } from "./parser/project-scanner";
import { createElementsFromAnalyses } from "./model/element-factory";
import { classifyElements } from "./model/element-classifier";
import { resolveUses } from "./model/uses-resolver";
import { buildGraph, graphToDot } from "./graph/graph-builder";
import {
  filterIsolatedNodes,
  filterUnclassifiedNodes,
} from "./graph/graph-filter";

export interface AnalysisResult {
  elements: ExecutableElement[];
  graph: RootGraphModel;
  dot: string;
}

export async function analyzeProject(
  rootPath: string,
  config: AnalysisConfig,
  fs: FileSystemAdapter,
): Promise<AnalysisResult> {
  await initParser();

  const analyses = await scanProject(rootPath, fs);
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
