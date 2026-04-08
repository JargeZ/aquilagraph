import { Button } from "@ui/molecules/button/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@ui/molecules/tabs/tabs";
import { useEffect, useState } from "react";
import type { RootGraphModel } from "ts-graphviz";
import type { ExecutableElement } from "@/core/model/executable-element";
import { DotSvgCanvas } from "./dot-svg-canvas";
import { NodeSearchCommand } from "./node-search-command";

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

type FlowRenderable = {
  readonly graph: RootGraphModel;
  readonly elements: readonly ExecutableElement[];
};

function renderFlow(_renderable: FlowRenderable) {
  // Важно: раньше тут был рендер через React Flow, но способ рендера должен оставаться сменяемым.
  // В будущем должен быть возможен другой движок (SVG/Canvas/WebGL/DOM), поэтому держим Flow как
  // пример «рендер-функции», которая принимает входные данные и возвращает UI.
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
      Flow renderer placeholder (extensible render pipeline).
    </div>
  );
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
  selectedElement,
  onSelectElement,
  followSelectionInViewport,
}: {
  dot: string;
  graph: RootGraphModel;
  elements: ExecutableElement[];
  selectedElement: ExecutableElement | null;
  onSelectElement: (element: ExecutableElement | null) => void;
  followSelectionInViewport: boolean;
}) {
  return (
    <div className="flex h-full gap-3">
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <DotSvgCanvas
          dot={dot}
          graph={graph}
          elements={elements}
          selectedRef={selectedElement?.reference ?? null}
          onSelectElement={onSelectElement}
          followSelectionInViewport={followSelectionInViewport}
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

export function GraphView({ elements, graph, dot }: GraphViewProps) {
  const [copied, setCopied] = useState(false);
  const [selectedElement, setSelectedElement] =
    useState<ExecutableElement | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(dot);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const followViewport = searchOpen;

  return (
    <Tabs defaultValue="graph" className="flex h-full flex-col">
      <NodeSearchCommand
        elements={elements}
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onActiveElementChange={setSelectedElement}
      />

      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-1">
        <TabsList>
          <TabsTrigger value="graph">Граф ({elements.length})</TabsTrigger>
          <TabsTrigger value="flow">Flow</TabsTrigger>
          <TabsTrigger value="dot">DOT</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="graph" className="min-h-0 flex-1">
        <DotGraphCanvas
          dot={dot}
          graph={graph}
          elements={elements}
          selectedElement={selectedElement}
          onSelectElement={setSelectedElement}
          followSelectionInViewport={followViewport}
        />
      </TabsContent>

      <TabsContent value="flow" className="min-h-0 flex-1">
        <div className="flex h-full gap-3">
          <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
            {renderFlow({ graph, elements })}
          </div>
          {selectedElement && (
            <div className="w-64 shrink-0">
              <NodeDetailsPanel element={selectedElement} />
            </div>
          )}
        </div>
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
