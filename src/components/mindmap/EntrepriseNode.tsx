import { memo, useState } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

export type EntrepriseNodeData = {
  entrepriseId: string;
  projetId: string;
  nom: string;
  secteur?: string;
  logoUrl?: string;
  matched?: boolean;
  dimmed?: boolean;
};

export type EntrepriseFlowNode = Node<EntrepriseNodeData, "entreprise">;

function initials(nom: string) {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function EntrepriseNodeImpl({ data }: NodeProps<EntrepriseFlowNode>) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={cn(
        "flex w-[170px] items-center gap-2 rounded-full border-2 border-border bg-card px-2.5 py-1.5 shadow-sm transition-all duration-150",
        data.matched && "z-10 scale-110 border-amber-400 shadow-lg ring-2 ring-amber-300",
        data.dimmed && "opacity-30",
      )}
      title={data.nom}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      {data.logoUrl && !imgError ? (
        <img
          src={data.logoUrl}
          alt=""
          loading="lazy"
          onError={() => setImgError(true)}
          className="h-7 w-7 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
          {initials(data.nom) || "?"}
        </span>
      )}
      <span className="min-w-0 truncate text-xs font-medium">{data.nom}</span>
      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </div>
  );
}

export const EntrepriseNode = memo(EntrepriseNodeImpl);
