import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@ui/molecules/button/button";
import { ArrowLeft } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo } from "react";
import { GraphView } from "@/components/graph-view";
import { GraphViewSkeleton } from "@/components/graph-view-skeleton";
import { useNodeRouteContext } from "@/contexts/use-node-route-context";
import { useProjectAnalysis } from "@/contexts/use-project-analysis";
import { buildNodeSubgraphResult } from "@/core/graph/build-node-subgraph-result";
import type { ExecutableElement } from "@/core/model/executable-element";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

export function NodeSubGraphPage() {
  const { nodeRef: nodeRefParam } = Route.useParams();
  const navigate = useNavigate();
  const {
    projectId: ctxProjectId,
    rootPath,
    analysisResult,
    analysisLoading,
    analysisError,
    analysisConfig,
  } = useProjectAnalysis();

  const { decodedRef } = useNodeRouteContext(nodeRefParam);

  const goBack = useCallback(() => {
    // Prefer browser history (so user can go to previous subgraph).
    // Fallback to the full project graph if there's nowhere to go back.
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    void navigate({ to: "/$projectId", params: { projectId: ctxProjectId } });
  }, [navigate, ctxProjectId]);

  const goFullGraph = useCallback(() => {
    void navigate({ to: "/$projectId", params: { projectId: ctxProjectId } });
  }, [navigate, ctxProjectId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goBack]);

  const subgraph = useMemo(() => {
    if (!analysisResult) return null;
    return buildNodeSubgraphResult(analysisResult, decodedRef, analysisConfig);
  }, [analysisResult, decodedRef, analysisConfig]);

  let body: ReactNode;
  if (analysisLoading) {
    body = <GraphViewSkeleton />;
  } else if (analysisResult && subgraph) {
    body = (
      <GraphView
        elements={subgraph.elements}
        graph={subgraph.graph}
        dot={subgraph.dot}
        initialSelectedRef={decodedRef}
        compositeLayout={false}
        onNodeDoubleClick={(el: ExecutableElement) => {
          void navigate({
            to: "/$projectId/node-sub-graph/$nodeRef",
            params: {
              projectId: ctxProjectId,
              nodeRef: encodeURIComponent(el.reference),
            },
          });
        }}
      />
    );
  } else if (analysisResult && !subgraph) {
    body = (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="max-w-md text-sm text-muted-foreground">
          <Trans>
            Узел не найден в графе проекта или ссылка некорректна.
          </Trans>
        </p>
        <Button type="button" variant="outline" size="sm" onClick={goBack}>
          <Trans>Назад к графу</Trans>
        </Button>
      </div>
    );
  } else if (analysisError) {
    body = (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="max-w-md text-sm text-destructive">{analysisError}</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/$projectId/settings" params={{ projectId: ctxProjectId }}>
            <Trans>Настройки</Trans>
          </Link>
        </Button>
      </div>
    );
  } else if (!rootPath) {
    body = (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-muted-foreground">
          <Trans>
            Сначала выберите каталог проекта и дождитесь анализа на главной
            вкладке графа.
          </Trans>
        </p>
        <Button asChild>
          <Link to="/$projectId/settings" params={{ projectId: ctxProjectId }}>
            <Trans>Настройки</Trans>
          </Link>
        </Button>
      </div>
    );
  } else {
    body = <GraphViewSkeleton />;
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={goBack}
          >
            <ArrowLeft className="size-4" />
            <Trans>Назад</Trans>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={goFullGraph}
          >
            <Trans>Фулл граф</Trans>
          </Button>
        </div>
      </header>
      <div className="min-h-0 flex-1">{body}</div>
    </div>
  );
}

export const Route = createFileRoute("/$projectId/node-sub-graph/$nodeRef")({
  component: NodeSubGraphPage,
});
