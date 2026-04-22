import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { ProjectGraphToolbar } from "@/components/project/project-graph-toolbar";
import { useProjectAnalysis } from "@/contexts/use-project-analysis";

const TAB_ACTIVE_CLASS =
  "border-b-2 border-primary px-3 py-1.5 text-sm font-medium text-foreground";
const TAB_INACTIVE_CLASS =
  "border-b-2 border-transparent px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground";

export function ViewLayout() {
  const { projectId, project, analysisLoading } = useProjectAnalysis();
  return (
    <div className="flex h-full flex-col">
      <ProjectGraphToolbar
        projectId={projectId}
        projectName={project?.name}
        analysisLoading={analysisLoading}
      />
      <div className="flex shrink-0 items-end gap-0 border-b border-border px-4">
        <Link
          to="/$projectId/view/modules-graph"
          params={{ projectId }}
          activeProps={{ className: TAB_ACTIVE_CLASS }}
          inactiveProps={{ className: TAB_INACTIVE_CLASS }}
        >
          <Trans>Граф модулей</Trans>
        </Link>
        <Link
          to="/$projectId/view/full-graph"
          params={{ projectId }}
          activeProps={{ className: TAB_ACTIVE_CLASS }}
          inactiveProps={{ className: TAB_INACTIVE_CLASS }}
        >
          <Trans>Граф</Trans>
        </Link>
        <Link
          to="/$projectId/view/flow"
          params={{ projectId }}
          activeProps={{ className: TAB_ACTIVE_CLASS }}
          inactiveProps={{ className: TAB_INACTIVE_CLASS }}
        >
          <Trans>Поток</Trans>
        </Link>
        <Link
          to="/$projectId/view/modules-dot"
          params={{ projectId }}
          activeProps={{ className: TAB_ACTIVE_CLASS }}
          inactiveProps={{ className: TAB_INACTIVE_CLASS }}
        >
          <Trans>DOT модулей</Trans>
        </Link>
        <Link
          to="/$projectId/view/full-dot"
          params={{ projectId }}
          activeProps={{ className: TAB_ACTIVE_CLASS }}
          inactiveProps={{ className: TAB_INACTIVE_CLASS }}
        >
          <Trans>DOT проекта</Trans>
        </Link>
      </div>
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/$projectId/view")({
  component: ViewLayout,
});
