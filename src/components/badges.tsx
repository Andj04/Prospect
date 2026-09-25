import { cn } from "@/lib/utils";
import { STATUTS, type PipelineStatut, type Priorite, type Projet } from "@/lib/types";

export const projetLabel = (projets: Projet[], id: string) =>
  projets.find((p) => p.id === id)?.nom ?? id;

export const statutLabel = (s: PipelineStatut) => STATUTS.find((x) => x.value === s)?.label ?? s;

// Progression : gris (identifié) → bleu (échanges) → orange (proposition) → vert (signé).
export const STATUT_CLASS: Record<PipelineStatut, string> = {
  identifie: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
  "premier-contact": "bg-primary/10 text-primary-deep",
  "en-discussion": "bg-primary/20 text-primary-deep",
  "visite-programmee": "bg-brand-orange/20 text-warning-foreground",
  "proposition-envoyee": "bg-brand-orange/35 text-warning-foreground",
  "partenariat-signe": "bg-success text-primary-foreground",
  "sans-suite": "bg-destructive/10 text-destructive",
};

// Couleur d'accentuation par statut (en-têtes de colonnes Kanban, pastilles).
export const STATUT_DOT: Record<PipelineStatut, string> = {
  identifie: "bg-muted-foreground/50",
  "premier-contact": "bg-primary-soft",
  "en-discussion": "bg-primary",
  "visite-programmee": "bg-brand-orange",
  "proposition-envoyee": "bg-warning",
  "partenariat-signe": "bg-success",
  "sans-suite": "bg-destructive",
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
  haute: "bg-brand-orange/20 text-warning-foreground border-brand-orange/50",
  moyenne: "bg-primary/10 text-primary-deep border-primary/20",
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
