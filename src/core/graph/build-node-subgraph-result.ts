import {
  type EdgeModel,
  fromDot,
  type NodeModel,
  type SubgraphModel,
} from "ts-graphviz";
import type { AnalysisResult } from "@/core/analyze";
import type { AnalysisConfig } from "@/core/config/analysis-config";
import { graphToDot } from "@/core/graph/graph-builder";
import { graphModelEdgePairs } from "@/core/graph/graph-model-edge-pairs";
import { computeLinkReachSets } from "@/core/graph/link-highlight";

type GraphContainer = {
  readonly nodes: readonly NodeModel[];
  readonly edges: readonly EdgeModel[];
  readonly subgraphs: readonly SubgraphModel[];
  removeNode: (node: NodeModel | string) => void;
  removeEdge: (edge: EdgeModel) => void;
  removeSubgraph: (subgraph: SubgraphModel) => void;
};

function collectAllNodeIds(container: GraphContainer): Set<string> {
  const ids = new Set<string>();
  for (const n of container.nodes) ids.add(n.id);
  for (const sg of container.subgraphs) {
    for (const id of collectAllNodeIds(sg)) ids.add(id);
  }
  return ids;
}

function edgeNodeIds(edge: EdgeModel): [string, string] | null {
  const t = edge.targets;
  if (t.length < 2) return null;
  const src = "id" in t[0] ? String((t[0] as NodeModel).id) : "";
  const tgt = "id" in t[1] ? String((t[1] as NodeModel).id) : "";
  if (!src || !tgt) return null;
  return [src, tgt];
}

function removeNodesRecursive(
  container: GraphContainer,
  keep: Set<string>,
): void {
  for (const node of [...container.nodes]) {
    if (!keep.has(node.id)) container.removeNode(node);
  }
  for (const sg of container.subgraphs) {
    removeNodesRecursive(sg, keep);
  }
}

function removeEdgesRecursive(
  container: GraphContainer,
  keep: Set<string>,
): void {
  for (const edge of [...container.edges]) {
    const ids = edgeNodeIds(edge);
    if (!ids || !keep.has(ids[0]) || !keep.has(ids[1])) {
      container.removeEdge(edge);
    }
  }
  for (const sg of container.subgraphs) {
    removeEdgesRecursive(sg, keep);
  }
}

function pruneEmptySubgraphs(container: GraphContainer): void {
  for (const sg of [...container.subgraphs]) {
    pruneEmptySubgraphs(sg);
    if (
      sg.nodes.length === 0 &&
      sg.edges.length === 0 &&
      sg.subgraphs.length === 0
    ) {
      container.removeSubgraph(sg);
    }
  }
}

/**
 * Resolve element reference to the actual node id used in the DOT graph.
 * When a class is collapsed, individual method references don't appear as graph nodes;
 * instead the collapsed class reference (without the method name suffix) is used.
 */
function resolveGraphNodeId(
  elementRef: string,
  graphNodeIds: Set<string>,
): string {
  if (graphNodeIds.has(elementRef)) return elementRef;
  const dotIdx = elementRef.lastIndexOf(".");
  if (dotIdx > 0) {
    const classRef = elementRef.slice(0, dotIdx);
    if (graphNodeIds.has(classRef)) return classRef;
  }
  return elementRef;
}

/**
 * Подграф из узлов, подсвечиваемых при выборе centerRef (forward ∪ backward по рёбрам uses).
 * Вырезается из исходного DOT, чтобы сохранить идентичную структуру (коллапс классов, кластеры).
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
  const allGraphNodeIds = collectAllNodeIds(full.graph);
  const graphCenterRef = resolveGraphNodeId(centerRef, allGraphNodeIds);

  const { forward, backward } = computeLinkReachSets(edgePairs, graphCenterRef);
  const nodeSet = new Set<string>([...forward, ...backward]);

  const elements = full.elements.filter((e) => {
    const nodeId = resolveGraphNodeId(e.reference, allGraphNodeIds);
    return nodeSet.has(nodeId);
  });
  if (elements.length === 0) return null;

  const graph = fromDot(full.dot);

  removeEdgesRecursive(graph, nodeSet);
  removeNodesRecursive(graph, nodeSet);

  const degree = new Map<string, number>();
  const remainingIds = collectAllNodeIds(graph);
  for (const id of remainingIds) degree.set(id, 0);

  for (const edge of graph.edges) {
    const ids = edgeNodeIds(edge);
    if (!ids) continue;
    degree.set(ids[0], (degree.get(ids[0]) ?? 0) + 1);
    degree.set(ids[1], (degree.get(ids[1]) ?? 0) + 1);
  }

  const connected = new Set<string>();
  for (const [id, d] of degree) {
    if (d > 0) connected.add(id);
  }

  removeNodesRecursive(graph, connected);
  pruneEmptySubgraphs(graph);

  const dot = graphToDot(graph);
  return { elements, graph, dot };
}
