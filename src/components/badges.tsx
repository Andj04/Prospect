import { cn } from "@/lib/utils";
import { STATUTS, type PipelineStatut, type Priorite, type Projet } from "@/lib/types";

export const projetLabel = (projets: Projet[], id: string) =>
  projets.find((p) => p.id === id)?.nom ?? id;

export const statutLabel = (s: PipelineStatut) => STATUTS.find((x) => x.value === s)?.label ?? s;

const STATUT_CLASS: Record<PipelineStatut, string> = {
  identifie: "bg-muted text-muted-foreground",
  "premier-contact": "bg-accent text-accent-foreground",
  "en-discussion": "bg-primary/15 text-primary-deep",
  "visite-programmee": "bg-primary/25 text-primary-deep",
  "proposition-envoyee": "bg-primary/40 text-primary-deep",
  "partenariat-signe": "bg-primary text-primary-foreground",
  "sans-suite": "bg-destructive/10 text-destructive",
};

export function StatutBadge({ statut }: { statut: PipelineStatut }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
        STATUT_CLASS[statut],
      )}
    >
      {statutLabel(statut)}
    </span>
  );
}

const PRIO_CLASS: Record<Priorite, string> = {
  haute: "bg-primary/15 text-primary-deep border-primary/30",
  moyenne: "bg-muted text-muted-foreground border-border",
  basse: "bg-muted/60 text-muted-foreground border-border",
};

export function PrioriteBadge({ priorite }: { priorite: Priorite }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize",
        PRIO_CLASS[priorite],
      )}
    >
      {priorite}
    </span>
  );
}

export function ProjetTag({ nom }: { nom: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
      {nom}
    </span>
  );
}
