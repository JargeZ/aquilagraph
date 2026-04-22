import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";

export function FlowPage() {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
      <Trans>Flow renderer placeholder (extensible render pipeline).</Trans>
    </div>
  );
}

export const Route = createFileRoute("/$projectId/view/flow")({
  component: FlowPage,
});
