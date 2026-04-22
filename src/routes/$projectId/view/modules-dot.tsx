import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@ui/molecules/button/button";
import { useMemo, useState } from "react";
import { useProjectAnalysis } from "@/contexts/use-project-analysis";
import { buildModuleGraphResult } from "@/core/graph/graph-builder";

export function ModulesDotPage() {
  const { analysisResult, analysisLoading, analysisConfig } =
    useProjectAnalysis();
  const [copied, setCopied] = useState(false);

  const moduleGraph = useMemo(() => {
    if (!analysisResult) return null;
    return buildModuleGraphResult(analysisResult.elements, analysisConfig);
  }, [analysisResult, analysisConfig]);

  if (analysisLoading || !moduleGraph) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <Trans>Загрузка…</Trans>
      </div>
    );
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(moduleGraph.dot);
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
        {moduleGraph.dot}
      </pre>
    </div>
  );
}

export const Route = createFileRoute("/$projectId/view/modules-dot")({
  component: ModulesDotPage,
});
