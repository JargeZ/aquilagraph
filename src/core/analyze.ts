import type { Digraph } from "ts-graphviz";
import { toDot } from "ts-graphviz";
import type { AnalysisConfig } from "./config/analysis-config";
import type { ExecutableElement } from "./model/executable-element";
import { initParser } from "./parser/python-parser";
import { scanProject, type FileSystemAdapter } from "./parser/project-scanner";
import { createElementsFromAnalyses } from "./model/element-factory";
import { classifyElements } from "./model/element-classifier";
import { resolveUses } from "./model/uses-resolver";
import { buildGraph } from "./graph/graph-builder";

export interface AnalysisResult {
  elements: ExecutableElement[];
  graph: Digraph;
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

  const graph = buildGraph(classified, config);
  const dot = toDot(graph);

  return { elements: classified, graph, dot };
}
