import { Trans, useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { Button } from "@ui/molecules/button/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@ui/molecules/tabs/tabs";
import { useContext, useEffect, useState } from "react";
import type { RootGraphModel } from "ts-graphviz";
import { ProjectAnalysisContext } from "@/contexts/project-analysis-context-shared";
import { useProjectAnalysis } from "@/contexts/use-project-analysis";
import {
  classificationById,
  DEFAULT_ANALYSIS_CONFIG,
} from "@/core/config/analysis-config";
import type { ExecutableElement } from "@/core/model/executable-element";
import { UNCLASSIFIED_TYPE } from "@/core/model/executable-element";
import { DotSvgCanvas } from "./dot-svg-canvas";
import { NodeSearchCommand } from "./node-search-command";

interface GraphViewProps {
  elements: ExecutableElement[];
  graph: RootGraphModel;
  dot: string;
  /** Синхронизировать выбранный узел (например, центр подграфа по роуту). */
  initialSelectedRef?: string;
  onNodeDoubleClick?: (element: ExecutableElement) => void;
  compositeLayout?: boolean;
}

type FlowRenderable = {
  readonly graph: RootGraphModel;
  readonly elements: readonly ExecutableElement[];
};

function FlowRendererPlaceholder(_renderable: FlowRenderable) {
  // Важно: раньше тут был рендер через React Flow, но способ рендера должен оставаться сменяемым.
  // В будущем должен быть возможен другой движок (SVG/Canvas/WebGL/DOM), поэтому держим Flow как
  // пример «рендер-функции», которая принимает входные данные и возвращает UI.
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
      <Trans>Flow renderer placeholder (extensible render pipeline).</Trans>
    </div>
  );
}

function NodeDetailsPanel({ element }: { element: ExecutableElement }) {
  const { t } = useLingui();
  const { projectId, analysisConfig } = useProjectAnalysis();
  const classified =
    element.type !== UNCLASSIFIED_TYPE
      ? classificationById(analysisConfig, element.type)
      : undefined;
  const color =
    element.type === UNCLASSIFIED_TYPE
      ? "#D3D3D3"
      : (classified?.color ?? "#D3D3D3");
  const typeLabel =
    element.type === UNCLASSIFIED_TYPE
      ? t`Неклассифицировано`
      : (classified?.name ?? element.type);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 text-xs">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="font-semibold text-foreground">{typeLabel}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link
            to="/$projectId/node-debug-details/$nodeRef"
            params={{
              projectId,
              nodeRef: encodeURIComponent(element.reference),
            }}
          >
            <Trans>Debug</Trans>
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link
            to="/$projectId/node-details/$nodeRef"
            params={{
              projectId,
              nodeRef: encodeURIComponent(element.reference),
            }}
          >
            <Trans>Детали</Trans>
          </Link>
        </Button>
      </div>

      <div className="space-y-1 text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">
            <Trans>Name</Trans>:{" "}
          </span>
          {element.name}
        </p>
        <p>
          <span className="font-medium text-foreground">
            <Trans>Reference</Trans>:{" "}
          </span>
          <code className="break-all text-[10px]">{element.reference}</code>
        </p>
        <p>
          <span className="font-medium text-foreground">
            <Trans>Module</Trans>:{" "}
          </span>
          {element.module}
        </p>
        {element.className && (
          <p>
            <span className="font-medium text-foreground">
              <Trans>Class</Trans>:{" "}
            </span>
            {element.className}
          </p>
        )}
        {element.decorators.length > 0 && (
          <p>
            <span className="font-medium text-foreground">
              <Trans>Decorators</Trans>:{" "}
            </span>
            {element.decorators.join(", ")}
          </p>
        )}
        {element.parentClasses.length > 0 && (
          <p>
            <span className="font-medium text-foreground">
              <Trans>Inherits</Trans>:{" "}
            </span>
            {element.parentClasses.join(", ")}
          </p>
        )}
        <p>
          <span className="font-medium text-foreground">
            <Trans>Source</Trans>:{" "}
          </span>
          {element.sourceFile}:{element.startLine}-{element.endLine}
        </p>
        {element.uses.length > 0 && (
          <div>
            <span className="font-medium text-foreground">
              <Trans>Uses</Trans>:{" "}
            </span>
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
  onNodeDoubleClick,
  followSelectionInViewport,
  compositeLayout,
}: {
  dot: string;
  graph: RootGraphModel;
  elements: ExecutableElement[];
  selectedElement: ExecutableElement | null;
  onSelectElement: (element: ExecutableElement | null) => void;
  onNodeDoubleClick?: (element: ExecutableElement) => void;
  followSelectionInViewport: boolean;
  compositeLayout?: boolean;
}) {
  const projectCtx = useContext(ProjectAnalysisContext);
  const analysisConfig =
    projectCtx?.analysisConfig ?? DEFAULT_ANALYSIS_CONFIG;
  return (
    <div className="flex h-full gap-3">
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <DotSvgCanvas
          dot={dot}
          graph={graph}
          elements={elements}
          analysisConfig={analysisConfig}
          selectedRef={selectedElement?.reference ?? null}
          onSelectElement={onSelectElement}
          onNodeDoubleClick={onNodeDoubleClick}
          followSelectionInViewport={followSelectionInViewport}
          compositeLayout={compositeLayout}
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

export function GraphView({
  elements,
  graph,
  dot,
  initialSelectedRef,
  onNodeDoubleClick,
  compositeLayout,
}: GraphViewProps) {
  const { t } = useLingui();
  const [copied, setCopied] = useState(false);
  const [selectedElement, setSelectedElement] =
    useState<ExecutableElement | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (initialSelectedRef === undefined) return;
    const el = elements.find((e) => e.reference === initialSelectedRef) ?? null;
    setSelectedElement(el);
  }, [initialSelectedRef, elements]);

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
          <TabsTrigger value="graph">
            {t`Граф (${elements.length})`}
          </TabsTrigger>
          <TabsTrigger value="flow">
            <Trans>Flow</Trans>
          </TabsTrigger>
          <TabsTrigger value="dot">
            <Trans>DOT</Trans>
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="graph" className="min-h-0 flex-1">
        <DotGraphCanvas
          dot={dot}
          graph={graph}
          elements={elements}
          selectedElement={selectedElement}
          onSelectElement={setSelectedElement}
          onNodeDoubleClick={onNodeDoubleClick}
          followSelectionInViewport={followViewport}
          compositeLayout={compositeLayout}
        />
      </TabsContent>

      <TabsContent value="flow" className="min-h-0 flex-1">
        <div className="flex h-full gap-3">
          <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
            <FlowRendererPlaceholder graph={graph} elements={elements} />
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
              {copied ? (
                <Trans>Скопировано</Trans>
              ) : (
                <Trans>Копировать DOT</Trans>
              )}
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
