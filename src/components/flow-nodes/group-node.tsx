import type { Node, NodeProps } from "@xyflow/react";
import type { GroupNodeData } from "@/core/graph/digraph-to-flow";

export type GroupFlowNode = Node<GroupNodeData, "group">;

export function GroupNode({ data }: NodeProps<GroupFlowNode>) {
  const isModule = data.level === "module";

  return (
    <div
      className="relative h-full w-full rounded-lg border"
      style={{
        borderStyle: isModule ? "dashed" : "solid",
        borderColor: isModule
          ? "var(--color-border)"
          : "color-mix(in srgb, var(--color-border) 60%, transparent)",
        backgroundColor: isModule
          ? "color-mix(in srgb, var(--color-muted) 30%, transparent)"
          : "color-mix(in srgb, var(--color-muted) 15%, transparent)",
      }}
    >
      <span
        className="absolute top-0 left-2 -translate-y-1/2 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold"
        style={{
          backgroundColor: "var(--color-background)",
          color: "var(--color-muted-foreground)",
        }}
      >
        {data.label}
      </span>
    </div>
  );
}
