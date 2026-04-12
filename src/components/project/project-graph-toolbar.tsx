import { Trans, useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { Button } from "@ui/molecules/button/button";

interface ProjectGraphToolbarProps {
  projectId: string;
  projectName: string | undefined;
  analysisLoading: boolean;
}

export function ProjectGraphToolbar({
  projectId,
  projectName,
  analysisLoading,
}: ProjectGraphToolbarProps) {
  const { t } = useLingui();
  return (
    <div className="flex items-center justify-between border-b border-border bg-card px-4 py-1.5">
      <h1 className="truncate text-sm font-medium text-foreground">
        {projectName ?? t`Проект`}
      </h1>
      <div className="flex items-center gap-2">
        {analysisLoading && (
          <span className="text-xs text-muted-foreground">
            <Trans>Анализируем…</Trans>
          </span>
        )}
        <Button variant="outline" size="sm" asChild>
          <Link to="/$projectId/settings" params={{ projectId }}>
            <Trans>Настройки</Trans>
          </Link>
        </Button>
      </div>
    </div>
  );
}
