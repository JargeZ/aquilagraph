import type { Edge, Viewport } from "@xyflow/react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  type NodeMouseHandler,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Button } from "@ui/molecules/button/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@ui/molecules/tabs/tabs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RootGraphModel } from "ts-graphviz";
import {
  digraphToFlow,
  type ElementNodeData,
  type FlowNode,
} from "@/core/graph/digraph-to-flow";
import { computeLinkReachSets } from "@/core/graph/link-highlight";
import type { ExecutableElement } from "@/core/model/executable-element";
import { DotSvgCanvas } from "./dot-svg-canvas";
import { ElementNode } from "./flow-nodes/element-node";
import { GroupNode } from "./flow-nodes/group-node";

const nodeTypes = {
  element: ElementNode,
  group: GroupNode,
} as const;

const TYPE_LABELS: Record<string, string> = {
  controlling: "Controlling",
  businessLogic: "Business Logic",
  sideEffect: "Side Effect",
  unclassified: "Unclassified",
};

interface GraphViewProps {
  elements: ExecutableElement[];
  graph: RootGraphModel;
  dot: string;
}

function NodeDetailsPanel({ element }: { element: ExecutableElement }) {
  const color =
    element.type === "controlling"
      ? "#4A90D9"
      : element.type === "businessLogic"
        ? "#50C878"
        : element.type === "sideEffect"
          ? "#FFB347"
          : "#D3D3D3";

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 text-xs">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="font-semibold text-foreground">
          {TYPE_LABELS[element.type] ?? element.type}
        </span>
      </div>

      <div className="space-y-1 text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Name: </span>
          {element.name}
        </p>
        <p>
          <span className="font-medium text-foreground">Reference: </span>
          <code className="break-all text-[10px]">{element.reference}</code>
        </p>
        <p>
          <span className="font-medium text-foreground">Module: </span>
          {element.module}
        </p>
        {element.className && (
          <p>
            <span className="font-medium text-foreground">Class: </span>
            {element.className}
          </p>
        )}
        {element.decorators.length > 0 && (
          <p>
            <span className="font-medium text-foreground">Decorators: </span>
            {element.decorators.join(", ")}
          </p>
        )}
        {element.parentClasses.length > 0 && (
          <p>
            <span className="font-medium text-foreground">Inherits: </span>
            {element.parentClasses.join(", ")}
          </p>
        )}
        <p>
          <span className="font-medium text-foreground">Source: </span>
          {element.sourceFile}:{element.startLine}-{element.endLine}
        </p>
        {element.uses.length > 0 && (
          <div>
            <span className="font-medium text-foreground">Uses: </span>
            <ul className="mt-0.5 list-inside list-disc">
              {element.uses.map((u) => (
                <li key={u.reference} className="truncate">
                  {u.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function DotGraphCanvas({
  dot,
  graph,
  elements,
}: {
  dot: string;
  graph: RootGraphModel;
  elements: ExecutableElement[];
}) {
  const [selectedElement, setSelectedElement] =
    useState<ExecutableElement | null>(null);

  return (
    <div className="flex h-full gap-3">
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <DotSvgCanvas
          dot={dot}
          graph={graph}
          elements={elements}
          selectedRef={selectedElement?.reference ?? null}
          onSelectElement={setSelectedElement}
        />
      </div>
      {selectedElement && (
        <div className="w-64 shrink-0">
          <NodeDetailsPanel element={selectedElement} />
        </div>
      )}
    </div>
  );
}

function FlowCanvas({
  graph,
  elements,
}: {
  graph: RootGraphModel;
  elements: ExecutableElement[];
}) {
  const [selectedElement, setSelectedElement] =
    useState<ExecutableElement | null>(null);

  const { nodes, edges } = useMemo(() => digraphToFlow(graph), [graph]);

  const elementsByRef = useMemo(() => {
    const map = new Map<string, ExecutableElement>();
    for (const el of elements) {
      map.set(el.reference, el);
    }
    return map;
  }, [elements]);

  const selectedRef = selectedElement?.reference ?? null;

  const flowWrapRef = useRef<HTMLDivElement>(null);
  const skipPaneClearAfterViewportChangeRef = useRef(false);
  const viewportAtMoveStartRef = useRef<Viewport | null>(null);

  /** Новый жест: сбросить «после панорамы», иначе следующий короткий клик по фону ошибочно проигнорируется. */
  useEffect(() => {
    const el = flowWrapRef.current;
    if (!el) return;
    const reset = () => {
      skipPaneClearAfterViewportChangeRef.current = false;
    };
    el.addEventListener("pointerdown", reset, true);
    return () => el.removeEventListener("pointerdown", reset, true);
  }, []);

  const onMoveStart = useCallback((_e: unknown, vp: Viewport) => {
    viewportAtMoveStartRef.current = { x: vp.x, y: vp.y, zoom: vp.zoom };
  }, []);

  /** Pointer на обёртке при pan часто не двигается (capture у React Flow) — смотрим сдвиг viewport. */
  const onMoveEnd = useCallback((_e: unknown, vp: Viewport) => {
    const start = viewportAtMoveStartRef.current;
    viewportAtMoveStartRef.current = null;
    if (!start) return;
    if (start.x !== vp.x || start.y !== vp.y) {
      skipPaneClearAfterViewportChangeRef.current = true;
    }
  }, []);

  const onPaneClick = useCallback(() => {
    if (skipPaneClearAfterViewportChangeRef.current) {
      skipPaneClearAfterViewportChangeRef.current = false;
      return;
    }
    setSelectedElement(null);
  }, []);

  const { flowNodes, flowEdges } = useMemo(() => {
    if (!selectedRef) {
      return { flowNodes: nodes, flowEdges: edges };
    }

    const edgePairs = edges.map((e) => ({
      source: e.source,
      target: e.target,
    }));
    const { forward, backward } = computeLinkReachSets(edgePairs, selectedRef);

    const flowNodes = nodes.map((n) => {
      if (n.type !== "element") return n;
      const data = n.data as ElementNodeData;
      const r = data.reference;
      if (r === selectedRef) {
        return {
          ...n,
          selected: true,
          data: { ...data, linkHighlight: "selected" as const },
        };
      }
      const inF = forward.has(r);
      const inB = backward.has(r);
      if (inF && inB) {
        return {
          ...n,
          selected: false,
          data: { ...data, linkHighlight: "both" as const },
        };
      }
      if (inF) {
        return {
          ...n,
          selected: false,
          data: { ...data, linkHighlight: "uses" as const },
        };
      }
      if (inB) {
        return {
          ...n,
          selected: false,
          data: { ...data, linkHighlight: "usedBy" as const },
        };
      }
      return {
        ...n,
        selected: false,
        data: { ...data, linkHighlight: "dimmed" as const },
        style: { ...n.style, opacity: 0.32 },
      };
    });

    const flowEdges: Edge[] = edges.map((e) => {
      const inF = forward.has(e.source) && forward.has(e.target);
      const inB = backward.has(e.source) && backward.has(e.target);
      if (!inF && !inB) {
        return {
          ...e,
          style: { ...e.style, opacity: 0.12 },
          interactionWidth: 0,
        };
      }
      const stroke = inF && inB ? "#8b5cf6" : inF ? "#0ea5e9" : "#f59e0b";
      return {
        ...e,
        style: {
          ...e.style,
          strokeWidth: 3.5,
          stroke,
        },
        zIndex: 1000,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 22,
          height: 22,
          color: stroke,
        },
      };
    });

    return { flowNodes, flowEdges };
  }, [nodes, edges, selectedRef]);

  const onNodeClick: NodeMouseHandler<FlowNode> = useCallback(
    (_event, node) => {
      skipPaneClearAfterViewportChangeRef.current = false;
      if (node.type === "element") {
        const data = node.data as ElementNodeData;
        const el = elementsByRef.get(data.reference);
        setSelectedElement(el ?? null);
      }
    },
    [elementsByRef],
  );

  return (
    <div className="flex h-full gap-3">
      <div ref={flowWrapRef} className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onMoveStart={onMoveStart}
          onMoveEnd={onMoveEnd}
          onPaneClick={onPaneClick}
          fitView
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
        >
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            nodeColor={(node) => {
              if (node.type === "element") {
                return (node.data as ElementNodeData).color;
              }
              return "transparent";
            }}
          />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        </ReactFlow>
      </div>
      {selectedElement && (
        <div className="w-64 shrink-0">
          <NodeDetailsPanel element={selectedElement} />
        </div>
      )}
    </div>
  );
}

export function GraphView({ elements, graph, dot }: GraphViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(dot);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Tabs defaultValue="graph" className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-1">
        <TabsList>
          <TabsTrigger value="graph">Граф ({elements.length})</TabsTrigger>
          <TabsTrigger value="flow">Flow</TabsTrigger>
          <TabsTrigger value="dot">DOT</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="graph" className="min-h-0 flex-1">
        <DotGraphCanvas dot={dot} graph={graph} elements={elements} />
      </TabsContent>

      <TabsContent value="flow" className="min-h-0 flex-1">
        <ReactFlowProvider>
          <FlowCanvas graph={graph} elements={elements} />
        </ReactFlowProvider>
      </TabsContent>

      <TabsContent value="dot" className="min-h-0 flex-1 overflow-auto p-4">
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? "Скопировано" : "Копировать DOT"}
            </Button>
          </div>
          <pre className="overflow-auto rounded-lg border border-border bg-muted/30 p-4 font-mono text-xs text-foreground">
            {dot}
          </pre>
        </div>
      </TabsContent>
    </Tabs>
  );
}
