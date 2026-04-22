import { Trans, useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { Button } from "@ui/molecules/button/button";
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
  initialSelectedRef?: string;
  onNodeDoubleClick?: (element: ExecutableElement) => void;
  compositeLayout?: boolean;
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

export function GraphView({
  elements,
  graph,
  dot,
  initialSelectedRef,
  onNodeDoubleClick,
  compositeLayout,
}: GraphViewProps) {
  const projectCtx = useContext(ProjectAnalysisContext);
  const analysisConfig = projectCtx?.analysisConfig ?? DEFAULT_ANALYSIS_CONFIG;

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

  return (
    <div className="flex h-full flex-col">
      <NodeSearchCommand
        elements={elements}
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onActiveElementChange={setSelectedElement}
      />
      <div className="flex min-h-0 flex-1 gap-3">
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <DotSvgCanvas
            dot={dot}
            graph={graph}
            elements={elements}
            analysisConfig={analysisConfig}
            selectedRef={selectedElement?.reference ?? null}
            onSelectElement={setSelectedElement}
            onNodeDoubleClick={onNodeDoubleClick}
            followSelectionInViewport={searchOpen}
            compositeLayout={compositeLayout}
          />
        </div>
        {selectedElement && (
          <div className="w-64 shrink-0 overflow-y-auto p-1">
            <NodeDetailsPanel element={selectedElement} />
          </div>
        )}
      </div>
    </div>
  );
}
