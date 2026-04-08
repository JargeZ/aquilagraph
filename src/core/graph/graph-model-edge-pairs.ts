import type { NodeModel, RootGraphModel } from "ts-graphviz";

/** Пары узлов рёбер модели графа (совпадают с id в DOT / SVG Graphviz). */
export function graphModelEdgePairs(
  graph: RootGraphModel,
): { source: string; target: string }[] {
  const pairs: { source: string; target: string }[] = [];
  for (const edge of graph.edges) {
    const targets = edge.targets;
    for (let i = 0; i < targets.length - 1; i++) {
      const source = "id" in targets[i] ? (targets[i] as NodeModel).id : "";
      const target =
        "id" in targets[i + 1] ? (targets[i + 1] as NodeModel).id : "";
      if (source && target) pairs.push({ source, target });
    }
  }
  return pairs;
}

