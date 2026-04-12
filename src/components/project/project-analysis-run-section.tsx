import { Trans } from "@lingui/react/macro";
import { Button } from "@ui/molecules/button/button";

interface ProjectAnalysisRunSectionProps {
  disabled: boolean;
  loading: boolean;
  error: string | null;
  onRun: () => void;
}

export function ProjectAnalysisRunSection({
  disabled,
  loading,
  error,
  onRun,
}: ProjectAnalysisRunSectionProps) {
  return (
    <section className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={onRun} disabled={disabled}>
          {loading ? (
            <Trans>Анализируем…</Trans>
          ) : (
            <Trans>Анализировать</Trans>
          )}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
