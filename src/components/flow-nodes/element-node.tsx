import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import type { ElementNodeData } from "@/core/graph/digraph-to-flow";

export type ElementFlowNode = Node<ElementNodeData, "element">;

const USES_RING = "0 0 0 2px #0ea5e9, 0 0 0 4px rgba(14,165,233,0.35)";
const USEDBY_RING = "0 0 0 2px #f59e0b, 0 0 0 4px rgba(245,158,11,0.35)";

export function ElementNode({ data, selected }: NodeProps<ElementFlowNode>) {
  const role = data.linkHighlight;
  const ring =
    selected || role === "selected"
      ? `0 0 0 2px ${data.color}, 0 0 0 4px #fff`
      : role === "uses"
        ? USES_RING
        : role === "usedBy"
          ? USEDBY_RING
          : undefined;

  return (
    <div
      className="flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-medium shadow-sm transition-shadow"
      style={{
        backgroundColor: data.color,
        borderColor:
          selected || role === "selected"
            ? "#fff"
            : role === "uses"
              ? "#0ea5e9"
              : role === "usedBy"
                ? "#f59e0b"
                : "transparent",
        color: "#fff",
        minWidth: 80,
        boxShadow: ring,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="h-2! w-2! border-none! bg-white/50!"
      />
      <span className="truncate">{data.label}</span>
      <Handle
        type="source"
        position={Position.Right}
        className="h-2! w-2! border-none! bg-white/50!"
      />
    </div>
  );
}
