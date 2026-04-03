import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@ui/molecules/button/button";
import { useProjectAnalysis } from "@/contexts/project-analysis-context";
import { GraphView } from "@/components/graph-view";

function ProjectGraphPage() {
  const { projectId, project, analysisResult, analysisLoading } =
    useProjectAnalysis();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-1.5">
        <h1 className="truncate text-sm font-medium text-foreground">
          {project?.name ?? "Проект"}
        </h1>
        <div className="flex items-center gap-2">
          {analysisLoading && (
            <span className="text-xs text-muted-foreground">
              Анализируем…
            </span>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link
              to="/$projectId/settings"
              params={{ projectId }}
            >
              Настройки
            </Link>
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {analysisResult ? (
          <GraphView
            elements={analysisResult.elements}
            graph={analysisResult.graph}
            dot={analysisResult.dot}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex flex-col gap-2">
              <p className="text-lg font-medium text-foreground">
                Граф пока не построен
              </p>
              <p className="text-sm text-muted-foreground">
                Перейдите в настройки, выберите каталог проекта и запустите
                анализ.
              </p>
            </div>
            <Button asChild>
              <Link
                to="/$projectId/settings"
                params={{ projectId }}
              >
                Открыть настройки
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/$projectId/")({
  component: ProjectGraphPage,
});
