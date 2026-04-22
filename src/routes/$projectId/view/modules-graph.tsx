import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@ui/molecules/button/button";
import { useCallback, useMemo } from "react";
import { DotSvgCanvas } from "@/components/dot-svg-canvas";
import { GraphViewSkeleton } from "@/components/graph-view-skeleton";
import { useProjectAnalysis } from "@/contexts/use-project-analysis";
import { buildModuleGraphResult } from "@/core/graph/graph-builder";
import type { ExecutableElement } from "@/core/model/executable-element";

export function ModulesGraphPage() {
  const navigate = useNavigate();
  const {
    projectId,
    rootPath,
    analysisResult,
    analysisLoading,
    analysisError,
    analysisConfig,
  } = useProjectAnalysis();

  const handleModuleDoubleClick = useCallback(
    (el: ExecutableElement) => {
      void navigate({
        to: "/$projectId/module-sub-graph/$moduleName",
        params: {
          projectId,
          moduleName: encodeURIComponent(el.reference),
        },
      });
    },
    [navigate, projectId],
  );

  const moduleGraph = useMemo(() => {
    if (!analysisResult) return null;
    return buildModuleGraphResult(analysisResult.elements, analysisConfig);
  }, [analysisResult, analysisConfig]);

  if (analysisLoading) {
    return <GraphViewSkeleton />;
  }

  if (analysisError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="max-w-md text-sm text-destructive">{analysisError}</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/$projectId/settings" params={{ projectId }}>
            <Trans>Настройки</Trans>
          </Link>
        </Button>
      </div>
    );
  }

  if (!rootPath || !moduleGraph) {
    if (!rootPath) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">
            <Trans>
              Укажите папку проекта в настройках — анализ запустится
              автоматически.
            </Trans>
          </p>
          <Button asChild>
            <Link to="/$projectId/settings" params={{ projectId }}>
              <Trans>Открыть настройки</Trans>
            </Link>
          </Button>
        </div>
      );
    }
    return <GraphViewSkeleton />;
  }

  return (
    <DotSvgCanvas
      dot={moduleGraph.dot}
      graph={moduleGraph.graph}
      elements={moduleGraph.elements}
      analysisConfig={analysisConfig}
      compositeLayout={false}
      onNodeDoubleClick={handleModuleDoubleClick}
    />
  );
}

export const Route = createFileRoute("/$projectId/view/modules-graph")({
  component: ModulesGraphPage,
});
