import { Graph, layout } from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import type { NodeModel, RootGraphModel, SubgraphModel } from "ts-graphviz";
import type { ElementType } from "../model/executable-element";

export interface ElementNodeData extends Record<string, unknown> {
  label: string;
  elementType: ElementType;
  color: string;
  reference: string;
}

export interface GroupNodeData extends Record<string, unknown> {
  label: string;
  level: "module" | "class";
}

export type FlowNode =
  | Node<ElementNodeData, "element">
  | Node<GroupNodeData, "group">;

export interface FlowGraph {
  nodes: FlowNode[];
  edges: Edge[];
}

const NODE_WIDTH = 160;
const NODE_HEIGHT = 40;
const GROUP_PADDING = 40;
const MODULE_SPACING = 60;

const COLOR_BY_TYPE: Record<ElementType, string> = {
  controlling: "#4A90D9",
  businessLogic: "#50C878",
  sideEffect: "#FFB347",
  unclassified: "#D3D3D3",
};

function getNodeAttr(node: NodeModel, key: string): string {
  const val = node.attributes.get(key as never);
  return val != null ? String(val) : "";
}

function getSubgraphAttr(sg: SubgraphModel, key: string): string {
  const val = sg.get(key as never);
  return val != null ? String(val) : "";
}

function inferElementType(node: NodeModel): ElementType {
  const color = getNodeAttr(node, "fillcolor") || getNodeAttr(node, "color");
  for (const [type, c] of Object.entries(COLOR_BY_TYPE)) {
    if (color === c) return type as ElementType;
  }
  return "unclassified";
}

export function digraphToFlow(graph: RootGraphModel): FlowGraph {
  const flowNodes: FlowNode[] = [];
  const flowEdges: Edge[] = [];
  const childToParent = new Map<string, string>();
  const moduleGroupIds: string[] = [];

  function walkSubgraph(sg: SubgraphModel, parentId: string | undefined) {
    const sgId = sg.id ?? `sg_${flowNodes.length}`;
    const label = getSubgraphAttr(sg, "label") || sgId.replace(/^cluster_/, "");
    const isModule = parentId === undefined || !parentId.startsWith("cluster_");
    const level: "module" | "class" = isModule ? "module" : "class";

    if (isModule) moduleGroupIds.push(sgId);

    flowNodes.push({
      id: sgId,
      type: "group",
      position: { x: 0, y: 0 },
      data: { label, level },
      ...(parentId ? { parentId } : {}),
      style: { width: 1, height: 1 },
    } as FlowNode);

    for (const child of sg.subgraphs) {
      walkSubgraph(child, sgId);
    }

    for (const node of sg.nodes) {
      const elType = inferElementType(node);
      childToParent.set(node.id, sgId);

      flowNodes.push({
        id: node.id,
        type: "element",
        position: { x: 0, y: 0 },
        parentId: sgId,
        data: {
          label: getNodeAttr(node, "label") || node.id,
          elementType: elType,
          color: COLOR_BY_TYPE[elType],
          reference: node.id,
        },
      } as FlowNode);
    }
  }

  for (const sg of graph.subgraphs) {
    walkSubgraph(sg, undefined);
  }

  for (const node of graph.nodes) {
    const elType = inferElementType(node);
    flowNodes.push({
      id: node.id,
      type: "element",
      position: { x: 0, y: 0 },
      data: {
        label: getNodeAttr(node, "label") || node.id,
        elementType: elType,
        color: COLOR_BY_TYPE[elType],
        reference: node.id,
      },
    } as FlowNode);
  }

  for (const edge of graph.edges) {
    const targets = edge.targets;
    for (let i = 0; i < targets.length - 1; i++) {
      const source = "id" in targets[i] ? (targets[i] as NodeModel).id : "";
      const target =
        "id" in targets[i + 1] ? (targets[i + 1] as NodeModel).id : "";
      if (source && target) {
        flowEdges.push({
          id: `e-${source}-${target}`,
          source,
          target,
          type: "smoothstep",
        });
      }
    }
  }

  applyDagreLayout(flowNodes, flowEdges, childToParent, moduleGroupIds);

  return { nodes: flowNodes, edges: flowEdges };
}

function applyDagreLayout(
  nodes: FlowNode[],
  edges: Edge[],
  childToParent: Map<string, string>,
  moduleGroupIds: string[],
) {
  const g = new Graph({ compound: true });
  g.setGraph({
    rankdir: "LR",
    ranksep: 80,
    nodesep: 40,
    marginx: 20,
    marginy: 20,
  });

  const groupIds = new Set(
    nodes.filter((n) => n.type === "group").map((n) => n.id),
  );

  for (const node of nodes) {
    if (node.type === "group") {
      g.setNode(node.id, { width: 1, height: 1 });
    } else {
      g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    }
  }

  for (const node of nodes) {
    if (node.parentId && groupIds.has(node.parentId)) {
      g.setParent(node.id, node.parentId);
    }
    const parent = childToParent.get(node.id);
    if (parent && groupIds.has(parent)) {
      g.setParent(node.id, parent);
    }
  }

  for (const node of nodes) {
    if (node.type === "group" && node.parentId && groupIds.has(node.parentId)) {
      g.setParent(node.id, node.parentId);
    }
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target, {});
  }

  layout(g);

  const absolutePositions = new Map<string, { x: number; y: number }>();
  for (const node of nodes) {
    const dagreNode = g.node(node.id);
    if (dagreNode) {
      absolutePositions.set(node.id, {
        x: dagreNode.x - (node.type === "group" ? 0 : NODE_WIDTH / 2),
        y: dagreNode.y - (node.type === "group" ? 0 : NODE_HEIGHT / 2),
      });
    }
  }

  const groupChildren = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.parentId) {
      if (!groupChildren.has(node.parentId)) {
        groupChildren.set(node.parentId, []);
      }
      groupChildren.get(node.parentId)?.push(node.id);
    }
  }

  computeGroupBounds(nodes, absolutePositions, groupChildren, groupIds);
  ensureModuleSpacing(nodes, absolutePositions, groupChildren);
  repositionByType(nodes, moduleGroupIds, absolutePositions);
  computeGroupBounds(nodes, absolutePositions, groupChildren, groupIds);

  for (const node of nodes) {
    const abs = absolutePositions.get(node.id);
    if (!abs) continue;

    if (node.parentId) {
      const parentAbs = absolutePositions.get(node.parentId);
      if (parentAbs) {
        node.position = {
          x: abs.x - parentAbs.x,
          y: abs.y - parentAbs.y,
        };
        continue;
      }
    }
    node.position = abs;
  }
}

function computeGroupBounds(
  nodes: FlowNode[],
  absolutePositions: Map<string, { x: number; y: number }>,
  groupChildren: Map<string, string[]>,
  groupIds: Set<string>,
) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  function computeBounds(
    groupId: string,
  ): { minX: number; minY: number; maxX: number; maxY: number } | null {
    const children = groupChildren.get(groupId) ?? [];
    if (children.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const childId of children) {
      const pos = absolutePositions.get(childId);
      if (!pos) continue;
      const child = nodeMap.get(childId);
      if (!child) continue;

      if (groupIds.has(childId)) {
        const childBounds = computeBounds(childId);
        if (childBounds) {
          minX = Math.min(minX, pos.x);
          minY = Math.min(minY, pos.y);
          const cw = (child.style?.width as number) ?? 1;
          const ch = (child.style?.height as number) ?? 1;
          maxX = Math.max(maxX, pos.x + cw);
          maxY = Math.max(maxY, pos.y + ch);
        }
      } else {
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + NODE_WIDTH);
        maxY = Math.max(maxY, pos.y + NODE_HEIGHT);
      }
    }

    if (!Number.isFinite(minX)) return null;

    const group = nodeMap.get(groupId);
    if (group) {
      const newX = minX - GROUP_PADDING;
      const newY = minY - GROUP_PADDING - 20;
      const newW = maxX - minX + GROUP_PADDING * 2;
      const newH = maxY - minY + GROUP_PADDING * 2 + 20;

      absolutePositions.set(groupId, { x: newX, y: newY });
      group.style = { ...group.style, width: newW, height: newH };
    }

    return { minX, minY, maxX, maxY };
  }

  for (const node of nodes) {
    if (node.type === "group" && !node.parentId) {
      computeBounds(node.id);
    }
  }
}

function ensureModuleSpacing(
  nodes: FlowNode[],
  absolutePositions: Map<string, { x: number; y: number }>,
  groupChildren: Map<string, string[]>,
) {
  const topModules = nodes.filter(
    (n) => n.type === "group" && !n.parentId,
  );
  if (topModules.length < 2) return;

  topModules.sort((a, b) => {
    const posA = absolutePositions.get(a.id);
    const posB = absolutePositions.get(b.id);
    return (posA?.x ?? 0) - (posB?.x ?? 0);
  });

  let cumulativeShift = 0;
  for (let i = 1; i < topModules.length; i++) {
    const prev = topModules[i - 1];
    const curr = topModules[i];
    const prevPos = absolutePositions.get(prev.id)!;
    const currPos = absolutePositions.get(curr.id)!;
    const prevWidth = (prev.style?.width as number) ?? 0;

    const gap = currPos.x + cumulativeShift - (prevPos.x + prevWidth);
    if (gap < MODULE_SPACING) {
      cumulativeShift += MODULE_SPACING - gap;
    }

    if (cumulativeShift > 0) {
      shiftSubtree(curr.id, cumulativeShift, absolutePositions, groupChildren);
    }
  }
}

function shiftSubtree(
  nodeId: string,
  dx: number,
  absolutePositions: Map<string, { x: number; y: number }>,
  groupChildren: Map<string, string[]>,
) {
  const pos = absolutePositions.get(nodeId);
  if (pos) {
    absolutePositions.set(nodeId, { x: pos.x + dx, y: pos.y });
  }
  for (const childId of groupChildren.get(nodeId) ?? []) {
    shiftSubtree(childId, dx, absolutePositions, groupChildren);
  }
}

function repositionByType(
  nodes: FlowNode[],
  moduleGroupIds: string[],
  absolutePositions: Map<string, { x: number; y: number }>,
) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (const moduleId of moduleGroupIds) {
    const allModuleElements = collectModuleElements(nodes, moduleId, nodeMap);
    if (allModuleElements.length === 0) continue;

    const controlling = allModuleElements.filter(
      (n) =>
        n.type === "element" &&
        (n.data as ElementNodeData).elementType === "controlling",
    );
    const sideEffect = allModuleElements.filter(
      (n) =>
        n.type === "element" &&
        (n.data as ElementNodeData).elementType === "sideEffect",
    );

    if (controlling.length > 0) {
      const minX = Math.min(
        ...allModuleElements.map((n) => absolutePositions.get(n.id)!.x),
      );
      const sorted = [...controlling].sort(
        (a, b) => absolutePositions.get(a.id)!.y - absolutePositions.get(b.id)!.y,
      );
      for (const node of sorted) {
        const pos = absolutePositions.get(node.id)!;
        absolutePositions.set(node.id, { x: minX, y: pos.y });
      }
    }

    if (sideEffect.length > 0) {
      const minY = Math.min(
        ...allModuleElements.map((n) => absolutePositions.get(n.id)!.y),
      );
      const sorted = [...sideEffect].sort(
        (a, b) => absolutePositions.get(a.id)!.x - absolutePositions.get(b.id)!.x,
      );
      let xOffset = absolutePositions.get(sorted[0].id)!.x;
      for (const node of sorted) {
        absolutePositions.set(node.id, { x: xOffset, y: minY });
        xOffset += NODE_WIDTH + 20;
      }
    }
  }
}

function collectModuleElements(
  nodes: FlowNode[],
  moduleId: string,
  nodeMap: Map<string, FlowNode>,
): FlowNode[] {
  const directChildren = nodes.filter(
    (n) => n.parentId === moduleId && n.type === "element",
  );
  const nestedChildren = nodes
    .filter((n) => n.parentId !== moduleId && n.type === "element")
    .filter((n) => {
      let current = nodeMap.get(n.parentId ?? "");
      while (current) {
        if (current.id === moduleId) return true;
        current = nodeMap.get(current.parentId ?? "");
      }
      return false;
    });
  return [...directChildren, ...nestedChildren];
}
