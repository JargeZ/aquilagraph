import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@ui/molecules/button/button";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { GraphView } from "@/components/graph-view";
import { GraphViewSkeleton } from "@/components/graph-view-skeleton";
import { useProjectAnalysis } from "@/contexts/use-project-analysis";
import { buildModuleFilteredGraphResult } from "@/core/graph/build-module-filtered-graph-result";
import type { ExecutableElement } from "@/core/model/executable-element";
import { getModuleNameWithRoots } from "@/core/model/reference-builder";
import {
  ModuleFilterOverlay,
  type ModuleFilterItem,
} from "@ui/organisms/module-filter-overlay/module-filter-overlay";

export function FullGraphPage() {
  const navigate = useNavigate();
  const {
    projectId,
    rootPath,
    analysisResult,
    analysisLoading,
    analysisError,
    analysisConfig,
  } = useProjectAnalysis();

  const elementSet = useMemo(() => {
    return analysisResult ? new Set(analysisResult.elements) : null;
  }, [analysisResult]);

  const allModules = useMemo(() => {
    if (!analysisResult) return [] as string[];
    const s = new Set<string>();
    for (const el of analysisResult.elements) {
      s.add(
        getModuleNameWithRoots(
          el.reference,
          analysisConfig.moduleDepth,
          analysisConfig.moduleRoots,
        ),
      );
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [
    analysisResult,
    analysisConfig.moduleDepth,
    analysisConfig.moduleRoots,
  ]);

  const moduleStats = useMemo(() => {
    const incoming = new Map<string, Set<string>>();
    const outgoing = new Map<string, Set<string>>();
    if (!analysisResult || !elementSet) return { incoming, outgoing };

    const ensure = (m: Map<string, Set<string>>, k: string) => {
      let s = m.get(k);
      if (!s) {
        s = new Set<string>();
        m.set(k, s);
      }
      return s;
    };

    for (const el of analysisResult.elements) {
      const fromMod = getModuleNameWithRoots(
        el.reference,
        analysisConfig.moduleDepth,
        analysisConfig.moduleRoots,
      );
      for (const target of el.uses) {
        if (!elementSet.has(target)) continue;
        const toMod = getModuleNameWithRoots(
          target.reference,
          analysisConfig.moduleDepth,
          analysisConfig.moduleRoots,
        );
        if (toMod === fromMod) continue;
        ensure(outgoing, fromMod).add(toMod);
        ensure(incoming, toMod).add(fromMod);
      }
    }
    return { incoming, outgoing };
  }, [
    analysisResult,
    analysisConfig.moduleDepth,
    analysisConfig.moduleRoots,
    elementSet,
  ]);

  const moduleItems: ModuleFilterItem[] = useMemo(() => {
    return allModules.map((name) => ({
      name,
      incomingCount: moduleStats.incoming.get(name)?.size ?? 0,
      outgoingCount: moduleStats.outgoing.get(name)?.size ?? 0,
    }));
  }, [allModules, moduleStats]);

  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!analysisResult) return;
    setSelectedModules(new Set(allModules));
  }, [analysisResult, allModules]);

  const filtered = useMemo(() => {
    if (!analysisResult) return null;
    if (selectedModules.size === allModules.length) return analysisResult;
    return buildModuleFilteredGraphResult(analysisResult, selectedModules, analysisConfig);
  }, [analysisResult, selectedModules, analysisConfig, allModules.length]);

  let body: ReactNode;
  if (analysisLoading) {
    body = <GraphViewSkeleton />;
  } else if (filtered) {
    body = (
      <GraphView
        elements={filtered.elements}
        graph={filtered.graph}
        dot={filtered.dot}
        topRightOverlay={
          <ModuleFilterOverlay
            items={moduleItems}
            selected={selectedModules}
            onSelectedChange={setSelectedModules}
          />
        }
        onNodeDoubleClick={(el: ExecutableElement) => {
          void navigate({
            to: "/$projectId/node-sub-graph/$nodeRef",
            params: {
              projectId,
              nodeRef: encodeURIComponent(el.reference),
            },
          });
        }}
      />
    );
  } else if (analysisError) {
    body = (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="max-w-md text-sm text-destructive">{analysisError}</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/$projectId/settings" params={{ projectId }}>
            <Trans>Настройки</Trans>
          </Link>
        </Button>
      </div>
    );
  } else if (!rootPath) {
    body = (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div className="flex flex-col gap-2">
          <p className="text-lg font-medium text-foreground">
            <Trans>Каталог не выбран</Trans>
          </p>
          <p className="text-sm text-muted-foreground">
            <Trans>
              Укажите папку проекта в настройках — анализ запустится
              автоматически.
            </Trans>
          </p>
        </div>
        <Button asChild>
          <Link to="/$projectId/settings" params={{ projectId }}>
            <Trans>Открыть настройки</Trans>
          </Link>
        </Button>
      </div>
    );
  } else {
    body = <GraphViewSkeleton />;
  }

  return <div className="h-full">{body}</div>;
}

export const Route = createFileRoute("/$projectId/view/full-graph")({
  component: FullGraphPage,
});
