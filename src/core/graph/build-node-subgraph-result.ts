import { fromDot, type NodeModel } from "ts-graphviz";
import type { AnalysisResult } from "@/core/analyze";
import type { AnalysisConfig } from "@/core/config/analysis-config";
import { graphToDot } from "@/core/graph/graph-builder";
import { graphModelEdgePairs } from "@/core/graph/graph-model-edge-pairs";
import { computeLinkReachSets } from "@/core/graph/link-highlight";

/**
 * Подграф из узлов, подсвечиваемых при выборе centerRef (forward ∪ backward по рёбрам uses).
 */
export function buildNodeSubgraphResult(
  full: AnalysisResult,
  centerRef: string,
  _config: AnalysisConfig,
): AnalysisResult | null {
  if (!full.elements.some((e) => e.reference === centerRef)) {
    return null;
  }

  const edgePairs = graphModelEdgePairs(full.graph);
  const { forward, backward } = computeLinkReachSets(edgePairs, centerRef);
  const nodeSet = new Set<string>([...forward, ...backward]);

  const elements = full.elements.filter((e) => nodeSet.has(e.reference));
  if (elements.length === 0) return null;

  // Важно: строим подграф из исходного DOT/графа, чтобы сохранить
  // идентичную структуру (включая коллапс классов) относительно подсветки.
  // Иначе пересборка через buildGraph может поменять collapsedClassFullRefs
  // на подмножестве и «потерять» рёбра.
  const graph = fromDot(full.dot);

  // Удаляем рёбра, которые выходят за пределы nodeSet.
  for (const edge of [...graph.edges]) {
    const targets = edge.targets;
    let keep = true;
    for (let i = 0; i < targets.length - 1; i++) {
      const source =
        "id" in targets[i] ? String((targets[i] as NodeModel).id) : "";
      const target =
        "id" in targets[i + 1] ? String((targets[i + 1] as NodeModel).id) : "";
      if (!nodeSet.has(source) || !nodeSet.has(target)) {
        keep = false;
        break;
      }
    }
    if (!keep) {
      graph.removeEdge(edge);
    }
  }

  // Удаляем узлы, которые не входят в nodeSet.
  for (const node of [...graph.nodes]) {
    if (!nodeSet.has(node.id)) {
      graph.removeNode(node);
    }
  }

  const dot = graphToDot(graph);
  return { elements, graph, dot };
}
