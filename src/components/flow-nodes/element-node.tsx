import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import type { ElementNodeData } from "@/core/graph/digraph-to-flow";

export type ElementFlowNode = Node<ElementNodeData, "element">;

export function ElementNode({ data, selected }: NodeProps<ElementFlowNode>) {
  return (
    <div
      className="flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-medium shadow-sm transition-shadow"
      style={{
        backgroundColor: data.color,
        borderColor: selected ? "#fff" : "transparent",
        color: "#fff",
        minWidth: 80,
        boxShadow: selected
          ? `0 0 0 2px ${data.color}, 0 0 0 4px #fff`
          : undefined,
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
