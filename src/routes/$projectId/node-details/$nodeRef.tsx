import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@ui/molecules/button/button";
import { ArrowLeft } from "lucide-react";
import { type ReactNode, useCallback, useEffect } from "react";
import { useNodeRouteContext } from "@/contexts/use-node-route-context";
import { useProjectAnalysis } from "@/contexts/use-project-analysis";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

export function NodeDetailsPage() {
  const { nodeRef: nodeRefParam } = Route.useParams();
  const navigate = useNavigate();
  const {
    projectId: ctxProjectId,
    analysisLoading,
    analysisError,
  } = useProjectAnalysis();
  const { decodedRef, element } = useNodeRouteContext(nodeRefParam);

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    void navigate({ to: "/$projectId", params: { projectId: ctxProjectId } });
  }, [navigate, ctxProjectId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goBack]);

  let body: ReactNode;
  if (analysisLoading) {
    body = (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <p className="text-sm text-muted-foreground">
          <Trans>Загрузка…</Trans>
        </p>
      </div>
    );
  } else if (analysisError) {
    body = (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="max-w-md text-sm text-destructive">{analysisError}</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/$projectId/settings" params={{ projectId: ctxProjectId }}>
            <Trans>Настройки</Trans>
          </Link>
        </Button>
      </div>
    );
  } else if (!element) {
    body = (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="max-w-md text-sm text-muted-foreground">
          <Trans>
            Узел не найден в графе проекта или ссылка некорректна.
          </Trans>
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/$projectId" params={{ projectId: ctxProjectId }}>
            <Trans>К графу</Trans>
          </Link>
        </Button>
        <div className="max-w-xl text-left text-[10px] text-muted-foreground">
          <div className="font-medium text-foreground">
            <Trans>Ref</Trans>
          </div>
          <code className="break-all">{decodedRef}</code>
        </div>
      </div>
    );
  } else {
    body = (
      <div className="min-h-0 flex-1 overflow-auto px-4 py-6">
        <div className="mx-auto w-full max-w-3xl">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="text-xs text-muted-foreground">
              <Trans>Заглушка</Trans>
            </div>
            <div className="mt-2 text-lg font-semibold text-foreground">
              {element.name}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={goBack}
          >
            <ArrowLeft className="size-4" />
            <Trans>Назад</Trans>
          </Button>
          <div className="min-w-0 truncate text-xs text-muted-foreground">
            {decodedRef}
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link
            to="/$projectId/node-debug-details/$nodeRef"
            params={{ projectId: ctxProjectId, nodeRef: nodeRefParam }}
          >
            <Trans>Debug</Trans>
          </Link>
        </Button>
      </header>
      <div className="min-h-0 flex-1">{body}</div>
    </div>
  );
}

export const Route = createFileRoute("/$projectId/node-details/$nodeRef")({
  component: NodeDetailsPage,
});
