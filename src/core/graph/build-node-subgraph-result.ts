import type { AnalysisResult } from "@/core/analyze";
import type { AnalysisConfig } from "@/core/config/analysis-config";
import { buildGraph, graphToDot } from "@/core/graph/graph-builder";
import { graphModelEdgePairs } from "@/core/graph/graph-model-edge-pairs";
import { computeLinkReachSets } from "@/core/graph/link-highlight";

/**
 * Подграф из узлов, подсвечиваемых при выборе centerRef (forward ∪ backward по рёбрам uses).
 */
export function buildNodeSubgraphResult(
  full: AnalysisResult,
  centerRef: string,
  config: AnalysisConfig,
): AnalysisResult | null {
  if (!full.elements.some((e) => e.reference === centerRef)) {
    return null;
  }

  const edgePairs = graphModelEdgePairs(full.graph);
  const { forward, backward } = computeLinkReachSets(edgePairs, centerRef);
  const nodeSet = new Set<string>([...forward, ...backward]);

  const elements = full.elements.filter((e) => nodeSet.has(e.reference));
  if (elements.length === 0) return null;

  const graph = buildGraph(elements, config);
  const dot = graphToDot(graph);
  return { elements, graph, dot };
}
