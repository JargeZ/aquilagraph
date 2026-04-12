import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@ui/molecules/button/button";
import { useState } from "react";

interface ProjectDeleteSectionProps {
  projectName: string | undefined;
  onDelete: () => Promise<void>;
}

export function ProjectDeleteSection({
  projectName,
  onDelete,
}: ProjectDeleteSectionProps) {
  const { t } = useLingui();
  const projectLabel = projectName ?? t`проект`;
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      await onDelete();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t`Не удалось удалить проект`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-3 border-t border-border pt-4">
      <div>
        <h2 className="text-sm font-medium text-foreground">
          <Trans>Опасная зона</Trans>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          <Trans>
            Удалить «{projectLabel}» из приложения. Папка на диске не
            затрагивается; восстановить проект в списке будет нельзя.
          </Trans>
        </p>
      </div>
      {!confirming ? (
        <div>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              setConfirming(true);
              setError(null);
            }}
          >
            <Trans>Удалить проект</Trans>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-foreground">
            <Trans>Удалить проект без возможности отмены?</Trans>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              <Trans>Отмена</Trans>
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => void handleConfirmDelete()}
            >
              {busy ? (
                <Trans>Удаляем…</Trans>
              ) : (
                <Trans>Удалить навсегда</Trans>
              )}
            </Button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
