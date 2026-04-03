import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@ui/molecules/button/button";
import { AnalysisConfigPanel } from "@/components/analysis-config-panel";
import { useProjectAnalysis } from "@/contexts/project-analysis-context";

function ProjectSettingsPage() {
  const {
    projectId,
    project,
    rootPath,
    pickDirectory,
    fileCount,
    countLoading,
    countError,
    refreshCount,
    analysisConfig,
    setAnalysisConfig,
    analysisLoading,
    analysisError,
    runAnalysis,
  } = useProjectAnalysis();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-1.5">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/$projectId" params={{ projectId }}>
            ← Назад
          </Link>
        </Button>
        <h1 className="truncate text-sm font-medium text-foreground">
          Настройки — {project?.name ?? "Проект"}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-foreground">Каталог</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={pickDirectory}
              >
                Выбрать папку
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void refreshCount()}
                disabled={!rootPath || countLoading}
              >
                Обновить счётчик
              </Button>
            </div>
            {rootPath ? (
              <p className="break-all text-sm text-muted-foreground">
                {rootPath}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Папка не выбрана — нажмите «Выбрать папку».
              </p>
            )}
          </section>

          <section className="border-t border-border pt-4">
            <h2 className="text-sm font-medium text-foreground">Файлы</h2>
            {countLoading ? (
              <p className="mt-2 text-sm text-muted-foreground">Считаем…</p>
            ) : countError ? (
              <p className="mt-2 text-sm text-destructive">{countError}</p>
            ) : fileCount !== null ? (
              <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
                {fileCount}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Выберите каталог, чтобы увидеть число файлов.
              </p>
            )}
          </section>

          <section className="border-t border-border pt-4">
            <AnalysisConfigPanel
              config={analysisConfig}
              onChange={setAnalysisConfig}
            />
          </section>

          <section className="flex flex-col gap-3 border-t border-border pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={() => void runAnalysis()}
                disabled={!rootPath || analysisLoading}
              >
                {analysisLoading ? "Анализируем…" : "Анализировать"}
              </Button>
            </div>
            {analysisError && (
              <p className="text-sm text-destructive">{analysisError}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/$projectId/settings")({
  component: ProjectSettingsPage,
});
