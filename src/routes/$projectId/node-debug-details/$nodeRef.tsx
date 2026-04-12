import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@ui/molecules/button/button";
import { ArrowLeft } from "lucide-react";
import { type ReactNode, useCallback, useEffect } from "react";
import { AddSelectorFilterAction } from "@/components/classification/add-selector-filter-action";
import { useNodeRouteContext } from "@/contexts/use-node-route-context";
import { useProjectAnalysis } from "@/contexts/use-project-analysis";
import type { ExecutableElement } from "@/core/model/executable-element";
import { cn } from "@/lib/utils";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

function UsesList({
  projectId,
  items,
}: {
  projectId: string;
  items: ExecutableElement[];
}) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-1 space-y-1">
      {items.map((u) => (
        <li key={u.reference} className="min-w-0">
          <Link
            className="block truncate text-xs text-primary hover:underline"
            to="/$projectId/node-debug-details/$nodeRef"
            params={{
              projectId,
              nodeRef: encodeURIComponent(u.reference),
            }}
          >
            {u.name}
          </Link>
          <div className="truncate text-[10px] text-muted-foreground">
            {u.reference}
          </div>
        </li>
      ))}
    </ul>
  );
}

function DebugLineItem({
  kind,
  value,
}: {
  kind: "reference" | "decorator" | "parentClass";
  value: string;
}) {
  return (
    <div
      className={cn(
        "group flex min-w-0 items-start justify-between gap-2 rounded-md border border-border bg-muted/20 px-2 py-1.5",
        "hover:bg-muted/30",
      )}
    >
      <code className="min-w-0 flex-1 break-all font-mono text-[11px] text-foreground">
        {value}
      </code>
      <div className="shrink-0 opacity-80 transition-opacity group-hover:opacity-100">
        <AddSelectorFilterAction kind={kind} value={value} />
      </div>
    </div>
  );
}

function NodeDebugHeaderActions({
  projectId,
  element,
}: {
  projectId: string;
  element: ExecutableElement | null;
}) {
  if (!element) return null;
  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <Link
          to="/$projectId/node-sub-graph/$nodeRef"
          params={{
            projectId,
            nodeRef: encodeURIComponent(element.reference),
          }}
        >
          <Trans>Подграф</Trans>
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link
          to="/$projectId/node-details/$nodeRef"
          params={{
            projectId,
            nodeRef: encodeURIComponent(element.reference),
          }}
        >
          <Trans>Детали</Trans>
        </Link>
      </Button>
    </div>
  );
}

export function NodeDebugDetailsPage() {
  const { nodeRef: nodeRefParam } = Route.useParams();
  const navigate = useNavigate();
  const {
    projectId: ctxProjectId,
    rootPath,
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
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-muted-foreground">
          <Trans>Загрузка анализа…</Trans>
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
  } else if (!rootPath) {
    body = (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="max-w-md text-sm text-muted-foreground">
          <Trans>
            Сначала выберите каталог проекта и дождитесь анализа на главной
            вкладке графа.
          </Trans>
        </p>
        <Button asChild>
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
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/$projectId" params={{ projectId: ctxProjectId }}>
              <Trans>К графу</Trans>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link
              to="/$projectId/node-sub-graph/$nodeRef"
              params={{ projectId: ctxProjectId, nodeRef: nodeRefParam }}
            >
              <Trans>Подграф</Trans>
            </Link>
          </Button>
        </div>
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
      <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">
                  {element.name}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {element.module}
                  {element.className ? ` · ${element.className}` : ""}
                </div>
              </div>
              <div className="shrink-0 rounded-md border border-border bg-muted/30 px-2 py-1 text-[10px] text-foreground">
                {element.type}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs font-medium text-foreground">
              <Trans>Reference</Trans>
            </div>
            <div className="mt-2">
              <DebugLineItem kind="reference" value={element.reference} />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs font-medium text-foreground">
                  <Trans>Decorators</Trans>
                </div>
                {element.decorators.length === 0 ? (
                  <div className="mt-1 text-xs text-muted-foreground">—</div>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {element.decorators.map((d) => (
                      <li key={d}>
                        <DebugLineItem kind="decorator" value={d} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <div className="text-xs font-medium text-foreground">
                  <Trans>Parent classes</Trans>
                </div>
                {element.parentClasses.length === 0 ? (
                  <div className="mt-1 text-xs text-muted-foreground">—</div>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {element.parentClasses.map((p) => (
                      <li key={p}>
                        <DebugLineItem kind="parentClass" value={p} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs font-medium text-foreground">
              <Trans>Source</Trans>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {element.sourceFile}:{element.startLine}-{element.endLine}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs font-medium text-foreground">
              <Trans>Uses</Trans>
            </div>
            <UsesList projectId={ctxProjectId} items={element.uses} />
            {element.uses.length === 0 && (
              <div className="mt-1 text-xs text-muted-foreground">—</div>
            )}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
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
        <NodeDebugHeaderActions projectId={ctxProjectId} element={element} />
      </header>
      <div className="min-h-0 flex-1">{body}</div>
    </div>
  );
}

export const Route = createFileRoute("/$projectId/node-debug-details/$nodeRef")(
  {
    component: NodeDebugDetailsPage,
  },
);
