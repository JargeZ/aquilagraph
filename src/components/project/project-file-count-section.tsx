import { Trans } from "@lingui/react/macro";

interface ProjectFileCountSectionProps {
  fileCount: number | null;
  countLoading: boolean;
  countError: string | null;
}

export function ProjectFileCountSection({
  fileCount,
  countLoading,
  countError,
}: ProjectFileCountSectionProps) {
  return (
    <section className="border-t border-border pt-4">
      <h2 className="text-sm font-medium text-foreground">
        <Trans>Файлы</Trans>
      </h2>
      {countLoading ? (
        <p className="mt-2 text-sm text-muted-foreground">
          <Trans>Считаем…</Trans>
        </p>
      ) : countError ? (
        <p className="mt-2 text-sm text-destructive">{countError}</p>
      ) : fileCount !== null ? (
        <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
          {fileCount}
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          <Trans>Выберите каталог, чтобы увидеть число файлов.</Trans>
        </p>
      )}
    </section>
  );
}
