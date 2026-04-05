import { Link } from "@tanstack/react-router";
import { Button } from "@ui/molecules/button/button";

interface ProjectSettingsToolbarProps {
  projectId: string;
  projectName: string | undefined;
}

export function ProjectSettingsToolbar({
  projectId,
  projectName,
}: ProjectSettingsToolbarProps) {
  return (
    <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-1.5">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/$projectId" params={{ projectId }}>
          ← Назад
        </Link>
      </Button>
      <h1 className="truncate text-sm font-medium text-foreground">
        Настройки — {projectName ?? "Проект"}
      </h1>
    </div>
  );
}
