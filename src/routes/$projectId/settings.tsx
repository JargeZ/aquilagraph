import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnalysisConfigPanel } from "@/components/analysis-config-panel";
import { ProjectAnalysisRunSection } from "@/components/project/project-analysis-run-section";
import { ProjectDirectorySection } from "@/components/project/project-directory-section";
import { ProjectFileCountSection } from "@/components/project/project-file-count-section";
import { ProjectSettingsToolbar } from "@/components/project/project-settings-toolbar";
import { useProjectAnalysis } from "@/contexts/use-project-analysis";

export function ProjectSettingsPage() {
  const navigate = useNavigate();
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

  const handleAnalyzeAndView = () => {
    void runAnalysis();
    void navigate({ to: "/$projectId", params: { projectId } });
  };

  return (
    <div className="flex h-full flex-col">
      <ProjectSettingsToolbar
        projectId={projectId}
        projectName={project?.name}
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <ProjectDirectorySection
            rootPath={rootPath}
            onPickDirectory={() => void pickDirectory()}
            onRefreshCount={() => void refreshCount()}
            countLoading={countLoading}
          />

          <ProjectFileCountSection
            fileCount={fileCount}
            countLoading={countLoading}
            countError={countError}
          />

          <section className="border-t border-border pt-4">
            <AnalysisConfigPanel
              config={analysisConfig}
              onChange={setAnalysisConfig}
            />
          </section>

          <ProjectAnalysisRunSection
            disabled={!rootPath || analysisLoading}
            loading={analysisLoading}
            error={analysisError}
            onRun={handleAnalyzeAndView}
          />
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/$projectId/settings")({
  component: ProjectSettingsPage,
});
