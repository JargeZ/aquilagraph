import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Trans, useLingui } from "@lingui/react/macro";
import { AnalysisConfigPanel } from "@/components/analysis-config-panel";
import { ProjectAnalysisRunSection } from "@/components/project/project-analysis-run-section";
import { ProjectDeleteSection } from "@/components/project/project-delete-section";
import { ProjectDirectorySection } from "@/components/project/project-directory-section";
import { ProjectFileCountSection } from "@/components/project/project-file-count-section";
import { ProjectSettingsToolbar } from "@/components/project/project-settings-toolbar";
import { useProjectAnalysis } from "@/contexts/use-project-analysis";
import { useEffect, useState } from "react";

export function ProjectSettingsPage() {
  const { t } = useLingui();
  const navigate = useNavigate();
  const {
    projectId,
    project,
    setProjectName,
    rootPath,
    pickDirectory,
    pickDirectoryLoading,
    browserDirectoryNeedsUserPermission,
    grantStoredDirectoryAccess,
    hasAnalysisRoot,
    fileCount,
    countLoading,
    countError,
    refreshCount,
    analysisConfig,
    setAnalysisConfig,
    analysisLoading,
    analysisError,
    runAnalysis,
    deleteProject,
  } = useProjectAnalysis();

  const [nameDraft, setNameDraft] = useState(project?.name ?? "");
  useEffect(() => setNameDraft(project?.name ?? ""), [project?.name]);

  useEffect(() => {
    const next = nameDraft.trim();
    if (!project) return;
    if (next === project.name) return;
    const handle = window.setTimeout(() => setProjectName(next), 250);
    return () => window.clearTimeout(handle);
  }, [nameDraft, project, setProjectName]);

  const handleAnalyzeAndView = () => {
    void runAnalysis();
    void navigate({ to: "/$projectId", params: { projectId } });
  };

  const handleDeleteProject = async () => {
    await deleteProject();
    void navigate({ to: "/" });
  };

  return (
    <div className="flex h-full flex-col">
      <ProjectSettingsToolbar
        projectId={projectId}
        projectName={project?.name}
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <section className="space-y-2 rounded-xl border border-border bg-card p-4">
            <div className="space-y-0.5">
              <h2 className="text-sm font-medium text-foreground">
                <Trans>Название проекта</Trans>
              </h2>
              <p className="text-xs text-muted-foreground">
                <Trans>Отображается в табах и в списке проектов.</Trans>
              </p>
            </div>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder={t`Например: Backend`}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
          </section>

          <ProjectDirectorySection
            rootPath={rootPath}
            onPickDirectory={() => void pickDirectory()}
            onRefreshCount={() => void refreshCount()}
            countLoading={countLoading}
            pickDirectoryLoading={pickDirectoryLoading}
            browserDirectoryNeedsUserPermission={
              browserDirectoryNeedsUserPermission
            }
            onGrantDirectoryAccess={() => void grantStoredDirectoryAccess()}
            hasAnalysisRoot={hasAnalysisRoot}
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
            disabled={!hasAnalysisRoot || analysisLoading}
            loading={analysisLoading}
            error={analysisError}
            onRun={handleAnalyzeAndView}
          />

          <ProjectDeleteSection
            projectName={project?.name}
            onDelete={handleDeleteProject}
          />
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/$projectId/settings")({
  component: ProjectSettingsPage,
});
