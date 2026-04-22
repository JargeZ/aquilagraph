import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@ui/molecules/button/button";
import { useState } from "react";
import { useProjectAnalysis } from "@/contexts/use-project-analysis";

export function FullDotPage() {
  const { analysisResult, analysisLoading } = useProjectAnalysis();
  const [copied, setCopied] = useState(false);

  if (analysisLoading || !analysisResult) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <Trans>Загрузка…</Trans>
      </div>
    );
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(analysisResult.dot);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => void handleCopy()}>
          {copied ? <Trans>Скопировано</Trans> : <Trans>Копировать DOT</Trans>}
        </Button>
      </div>
      <pre className="overflow-auto rounded-lg border border-border bg-muted/30 p-4 font-mono text-xs text-foreground">
        {analysisResult.dot}
      </pre>
    </div>
  );
}

export const Route = createFileRoute("/$projectId/view/full-dot")({
  component: FullDotPage,
});
