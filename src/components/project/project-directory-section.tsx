import { Trans } from "@lingui/react/macro";
import { Button } from "@ui/molecules/button/button";

interface ProjectDirectorySectionProps {
  rootPath: string | null;
  onPickDirectory: () => void;
  onRefreshCount: () => void;
  countLoading: boolean;
  pickDirectoryLoading?: boolean;
  browserDirectoryNeedsUserPermission?: boolean;
  onGrantDirectoryAccess?: () => void;
  hasAnalysisRoot?: boolean;
}

export function ProjectDirectorySection({
  rootPath,
  onPickDirectory,
  onRefreshCount,
  countLoading,
  pickDirectoryLoading = false,
  browserDirectoryNeedsUserPermission = false,
  onGrantDirectoryAccess,
  hasAnalysisRoot = false,
}: ProjectDirectorySectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-foreground">
        <Trans>Каталог</Trans>
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onPickDirectory}
          disabled={pickDirectoryLoading}
        >
          {pickDirectoryLoading ? (
            <Trans>Выбор папки…</Trans>
          ) : (
            <Trans>Выбрать папку</Trans>
          )}
        </Button>
        {browserDirectoryNeedsUserPermission && onGrantDirectoryAccess ? (
          <Button
            type="button"
            variant="default"
            onClick={() => void onGrantDirectoryAccess()}
          >
            <Trans>Разрешить доступ</Trans>
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          onClick={onRefreshCount}
          disabled={!hasAnalysisRoot || countLoading}
        >
          <Trans>Обновить счётчик</Trans>
        </Button>
      </div>
      {rootPath ? (
        <p className="break-all text-sm text-muted-foreground">{rootPath}</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          <Trans>Папка не выбрана — нажмите «Выбрать папку».</Trans>
        </p>
      )}
      {browserDirectoryNeedsUserPermission ? (
        <p className="text-sm text-muted-foreground">
          <Trans>
            После перезагрузки страницы браузер требует повторного разрешения
            на чтение каталога.
          </Trans>
        </p>
      ) : null}
    </section>
  );
}
