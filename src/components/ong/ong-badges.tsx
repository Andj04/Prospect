import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { ONG_STATUT_CLASS, ongStatutLabel, typeStructureLabel } from "@/lib/ong-utils";
import { ODD_LABELS, type OngPipelineStatut, type TypeStructure } from "@/lib/types";

export function OngStatutBadge({ statut }: { statut: OngPipelineStatut }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
        ONG_STATUT_CLASS[statut],
      )}
    >
      {ongStatutLabel(statut)}
    </span>
  );
}

export function TypeStructureBadge({
  type,
  utilitePublique,
}: {
  type: TypeStructure;
  utilitePublique?: boolean | null | undefined;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary-deep dark:text-primary">
        {typeStructureLabel(type)}
      </span>
      {utilitePublique && (
        <span
          title="Reconnue d'utilité publique"
          className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-1 text-xs font-medium text-success"
        >
          <BadgeCheck className="h-3 w-3" />
          Utilité publique
        </span>
      )}
    </span>
  );
}

export function OddBadge({ n }: { n: number }) {
  return (
    <span
      title={`ODD ${n} — ${ODD_LABELS[n] ?? ""}`}
      className="inline-flex items-center gap-1.5 rounded-md bg-brand-orange/25 py-0.5 pl-0.5 pr-2 text-xs font-medium text-warning-foreground"
    >
      <span className="grid h-6 min-w-6 place-items-center rounded bg-brand-orange/40 px-1 font-bold tabular-nums">
        {n}
      </span>
      {ODD_LABELS[n]}
    </span>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
      {children}
    </span>
  );
}
