import { Button } from "@ui/molecules/button/button";

interface ProjectDirectorySectionProps {
  rootPath: string | null;
  onPickDirectory: () => void;
  onRefreshCount: () => void;
  countLoading: boolean;
}

export function ProjectDirectorySection({
  rootPath,
  onPickDirectory,
  onRefreshCount,
  countLoading,
}: ProjectDirectorySectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-foreground">Каталог</h2>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" onClick={onPickDirectory}>
          Выбрать папку
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onRefreshCount}
          disabled={!rootPath || countLoading}
        >
          Обновить счётчик
        </Button>
      </div>
      {rootPath ? (
        <p className="break-all text-sm text-muted-foreground">{rootPath}</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Папка не выбрана — нажмите «Выбрать папку».
        </p>
      )}
    </section>
  );
}
