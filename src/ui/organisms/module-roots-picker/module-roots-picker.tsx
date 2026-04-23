import { Trans, useLingui } from "@lingui/react/macro";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { useLocalStorage } from "usehooks-ts";

type TreeNode = {
  name: string;
  path: string; // slash notation, no leading/trailing slash (e.g. "src/components")
  children: TreeNode[];
};

function toSegments(path: string): string[] {
  return path.split("/").filter(Boolean);
}

function depthOf(path: string): number {
  return toSegments(path).length;
}

function slashToDot(path: string): string {
  return toSegments(path).join(".");
}

function dotToSlash(path: string): string {
  return path.split(".").filter(Boolean).join("/");
}

function uniqueDirsFromFiles(filePaths: readonly string[]): string[] {
  const out = new Set<string>();
  for (const p of filePaths) {
    const idx = p.lastIndexOf("/");
    if (idx <= 0) continue;
    const dir = p.slice(0, idx);
    if (dir) out.add(dir);
  }
  return Array.from(out);
}

function buildDirectoryTree(
  dirs: readonly string[],
  displayDepth: number,
): TreeNode[] {
  const rootChildrenByKey = new Map<string, TreeNode>();
  const nodesByPath = new Map<string, TreeNode>();

  const ensureNode = (path: string): TreeNode => {
    const existing = nodesByPath.get(path);
    if (existing) return existing;
    const segs = toSegments(path);
    const name = segs[segs.length - 1] ?? path;
    const node: TreeNode = { name, path, children: [] };
    nodesByPath.set(path, node);
    return node;
  };

  const attachChild = (parent: TreeNode | null, child: TreeNode) => {
    const list = parent ? parent.children : Array.from(rootChildrenByKey.values());
    if (parent) {
      if (!parent.children.some((c) => c.path === child.path)) {
        parent.children.push(child);
      }
    } else {
      if (!rootChildrenByKey.has(child.path)) rootChildrenByKey.set(child.path, child);
    }
    void list;
  };

  for (const fullDir of dirs) {
    const segs = toSegments(fullDir);
    const upto = Math.min(segs.length, displayDepth);
    for (let i = 1; i <= upto; i += 1) {
      const curPath = segs.slice(0, i).join("/");
      const cur = ensureNode(curPath);
      if (i === 1) {
        attachChild(null, cur);
      } else {
        const parentPath = segs.slice(0, i - 1).join("/");
        const parent = ensureNode(parentPath);
        attachChild(parent, cur);
      }
    }
  }

  const sortRec = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const n of nodes) sortRec(n.children);
  };

  const roots = Array.from(rootChildrenByKey.values());
  sortRec(roots);
  return roots;
}

function clampInt(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, Math.round(v)));
}

function normalizeRange(a: number, b: number): [number, number] {
  return a <= b ? [a, b] : [b, a];
}

const MODULE_TREE_DISPLAY_DEPTH_STORAGE_KEY =
  "visualizer-module-tree-display-depth";

function dotCount(s: string): number {
  return (s.match(/\./g) ?? []).length;
}

function sortModuleRootsMostSpecificFirst(list: readonly string[]): string[] {
  return [...list].sort((a, b) => {
    const dc = dotCount(b) - dotCount(a);
    if (dc !== 0) return dc;
    return a.localeCompare(b);
  });
}

export function ModuleRootsPicker({
  moduleDepth,
  moduleRoots,
  sourceFiles,
  onModuleDepthChange,
  onModuleRootsChange,
  className,
}: {
  moduleDepth: number;
  moduleRoots: readonly string[];
  sourceFiles: readonly string[];
  onModuleDepthChange: (next: number) => void;
  onModuleRootsChange: (next: string[]) => void;
  className?: string;
}) {
  const { t } = useLingui();
  const [displayDepth, setDisplayDepth] = useLocalStorage<number>(
    MODULE_TREE_DISPLAY_DEPTH_STORAGE_KEY,
    clampInt(moduleDepth || 2, 1, 5),
  );

  const [left, right] = normalizeRange(
    clampInt(moduleDepth || 2, 1, 5),
    clampInt(displayDepth || 2, 1, 5),
  );

  const selectedSlashPaths = useMemo(() => {
    return new Set(moduleRoots.map(dotToSlash).filter(Boolean));
  }, [moduleRoots]);

  const dirs = useMemo(() => uniqueDirsFromFiles(sourceFiles), [sourceFiles]);
  const tree = useMemo(
    () => buildDirectoryTree(dirs, right),
    [dirs, right],
  );

  const toggleDir = (slashPath: string) => {
    const dot = slashToDot(slashPath);
    const next = new Set(moduleRoots);
    if (next.has(dot)) next.delete(dot);
    else next.add(dot);
    onModuleRootsChange(sortModuleRootsMostSpecificFirst(Array.from(next)));
  };

  const hasData = tree.length > 0;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-col gap-1.5">
        <div className="text-xs font-medium text-muted-foreground">
          <Trans>Модули (интерактивно)</Trans>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-background px-3 py-2">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="text-[11px] font-medium text-muted-foreground">
                <Trans>Глубина модуля (дефолт)</Trans>
              </div>
              <div className="font-mono text-[11px] text-foreground tabular-nums">
                {left}
              </div>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={left}
              onChange={(e) => {
                const nextLeft = clampInt(Number(e.target.value), 1, 5);
                const [, nextRight] = normalizeRange(nextLeft, right);
                onModuleDepthChange(nextLeft);
                setDisplayDepth(nextRight);
              }}
              className="h-2 w-full accent-primary"
              aria-label={t`Глубина модуля`}
            />
          </div>

          <div className="rounded-lg border border-border bg-background px-3 py-2">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="text-[11px] font-medium text-muted-foreground">
                <Trans>Показать дерево до глубины</Trans>
              </div>
              <div className="font-mono text-[11px] text-foreground tabular-nums">
                {right}
              </div>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={right}
              onChange={(e) => {
                const nextRight = clampInt(Number(e.target.value), 1, 5);
                const [nextLeft, normalizedRight] = normalizeRange(left, nextRight);
                if (nextLeft !== left) onModuleDepthChange(nextLeft);
                setDisplayDepth(normalizedRight);
              }}
              className="h-2 w-full accent-primary"
              aria-label={t`Глубина дерева`}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-2">
        {!hasData ? (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">
            <Trans>
              Дерево директорий появится после анализа проекта.
            </Trans>
          </div>
        ) : (
          <DirectoryTree
            nodes={tree}
            maxDepth={right}
            selectedSlashPaths={selectedSlashPaths}
            onToggle={toggleDir}
          />
        )}
      </div>

      {moduleRoots.length > 0 ? (
        <div className="text-[11px] text-muted-foreground">
          <Trans>Выбрано:</Trans>{" "}
          <span className="font-mono">
            {moduleRoots.map((d) => `${d}.*`).join(", ")}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function DirectoryTree({
  nodes,
  maxDepth,
  selectedSlashPaths,
  onToggle,
  level = 0,
}: {
  nodes: readonly TreeNode[];
  maxDepth: number;
  selectedSlashPaths: ReadonlySet<string>;
  onToggle: (slashPath: string) => void;
  level?: number;
}) {
  return (
    <div className="flex flex-col">
      {nodes.map((n) => {
        const d = depthOf(n.path);
        const isSelected = selectedSlashPaths.has(n.path);
        const canRenderChildren = d < maxDepth && n.children.length > 0;
        return (
          <div key={n.path}>
            <button
              type="button"
              onClick={() => onToggle(n.path)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs",
                "hover:bg-muted/40",
                isSelected && "bg-muted/60 ring-1 ring-ring",
              )}
              style={{ paddingLeft: 8 + level * 14 }}
              aria-pressed={isSelected}
            >
              <span className="truncate font-mono text-[11px] text-foreground">
                {n.path}
              </span>
            </button>
            {canRenderChildren ? (
              <DirectoryTree
                nodes={n.children}
                maxDepth={maxDepth}
                selectedSlashPaths={selectedSlashPaths}
                onToggle={onToggle}
                level={level + 1}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

