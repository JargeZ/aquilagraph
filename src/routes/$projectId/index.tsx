import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@ui/molecules/button/button";
import type { ReactNode } from "react";
import { GraphView } from "@/components/graph-view";
import { GraphViewSkeleton } from "@/components/graph-view-skeleton";
import { ProjectGraphToolbar } from "@/components/project/project-graph-toolbar";
import { useProjectAnalysis } from "@/contexts/use-project-analysis";
import type { ExecutableElement } from "@/core/model/executable-element";
import { isTauriRuntime } from "@/lib/is-tauri";

export function ProjectGraphPage() {
  const navigate = useNavigate();
  const {
    projectId,
    project,
    rootPath,
    analysisResult,
    analysisLoading,
    analysisError,
  } = useProjectAnalysis();

  let body: ReactNode;
  if (analysisLoading) {
    body = <GraphViewSkeleton />;
  } else if (analysisResult) {
    body = (
      <GraphView
        elements={analysisResult.elements}
        graph={analysisResult.graph}
        dot={analysisResult.dot}
        onNodeDoubleClick={(el: ExecutableElement) => {
          void navigate({
            to: "/$projectId/node-sub-graph/$nodeRef",
            params: {
              projectId,
              nodeRef: encodeURIComponent(el.reference),
            },
          });
        }}
      />
    );
  } else if (analysisError) {
    body = (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="max-w-md text-sm text-destructive">{analysisError}</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/$projectId/settings" params={{ projectId }}>
            Настройки
          </Link>
        </Button>
      </div>
    );
  } else if (!rootPath) {
    body = (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div className="flex flex-col gap-2">
          <p className="text-lg font-medium text-foreground">
            Каталог не выбран
          </p>
          <p className="text-sm text-muted-foreground">
            Укажите папку проекта в настройках — анализ запустится
            автоматически.
          </p>
        </div>
        <Button asChild>
          <Link to="/$projectId/settings" params={{ projectId }}>
            Открыть настройки
          </Link>
        </Button>
      </div>
    );
  } else if (!isTauriRuntime()) {
    body = (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <p className="max-w-md text-sm text-muted-foreground">
          Анализ и просмотр графа доступны в десктоп-приложении Tauri.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/$projectId/settings" params={{ projectId }}>
            Настройки
          </Link>
        </Button>
      </div>
    );
  } else {
    body = <GraphViewSkeleton />;
  }

  return (
    <div className="flex h-full flex-col">
      <ProjectGraphToolbar
        projectId={projectId}
        projectName={project?.name}
        analysisLoading={analysisLoading}
      />

      <div className="min-h-0 flex-1">{body}</div>
    </div>
  );
}

export const Route = createFileRoute("/$projectId/")({
  component: ProjectGraphPage,
});
