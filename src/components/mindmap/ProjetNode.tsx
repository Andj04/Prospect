import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

export type ProjetNodeData = {
  projetId: string;
  nom: string;
  count: number;
  matched?: boolean;
  dimmed?: boolean;
};

export type ProjetFlowNode = Node<ProjetNodeData, "projet">;

function ProjetNodeImpl({ data }: NodeProps<ProjetFlowNode>) {
  return (
    <div
      className={cn(
        "brand-gradient flex w-[200px] flex-col items-center gap-1 rounded-2xl border-2 border-transparent px-4 py-3 text-center text-primary-foreground shadow-md transition-all duration-150",
        data.matched && "z-10 scale-110 border-amber-400 shadow-lg ring-4 ring-amber-300",
        data.dimmed && "opacity-30",
      )}
      title={data.nom}
    >
      <Handle type="target" position={Position.Top} className="!bg-white" />
      <span className="text-sm font-bold leading-tight">{data.nom}</span>
      <span className="text-[11px] opacity-90">
        {data.count} entreprise{data.count > 1 ? "s" : ""}
      </span>
      <Handle type="source" position={Position.Bottom} className="!bg-white" />
    </div>
  );
}

export const ProjetNode = memo(ProjetNodeImpl);
