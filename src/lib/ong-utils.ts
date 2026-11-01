import {
  ECHELLES,
  MILIEUX,
  STATUTS_ONG,
  TYPE_STRUCTURE_OPTIONS,
  type Echelle,
  type Milieu,
  type OngPipelineItem,
  type OngPipelineStatut,
  type TypeStructure,
} from "@/lib/types";
import { type RelanceBucket, todayIso } from "@/lib/pipeline-utils";
import { STATUTS_ONG_CLOS } from "@/lib/queries/pipeline-ong";

export const typeStructureLabel = (t: TypeStructure) =>
  TYPE_STRUCTURE_OPTIONS.find((o) => o.value === t)?.label ?? t;
export const ongStatutLabel = (s: OngPipelineStatut) =>
  STATUTS_ONG.find((o) => o.value === s)?.label ?? s;
export const echelleLabel = (e: Echelle) => ECHELLES.find((o) => o.value === e)?.label ?? e;
export const milieuLabel = (m: Milieu) => MILIEUX.find((o) => o.value === m)?.label ?? m;

// Même progression visuelle que le pipeline entreprises : gris → bleu → orange → vert.
export const ONG_STATUT_CLASS: Record<OngPipelineStatut, string> = {
  "a-contacter": "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
  "contact-pris": "bg-primary/10 text-primary-deep",
  "en-discussion": "bg-primary/20 text-primary-deep",
  "convention-en-preparation": "bg-brand-orange/30 text-warning-foreground",
  "partenaire-actif": "bg-success text-primary-foreground",
  "sans-suite": "bg-destructive/10 text-destructive",
};

export const ONG_STATUT_DOT: Record<OngPipelineStatut, string> = {
  "a-contacter": "bg-muted-foreground/50",
  "contact-pris": "bg-primary-soft",
  "en-discussion": "bg-primary",
  "convention-en-preparation": "bg-brand-orange",
  "partenaire-actif": "bg-success",
  "sans-suite": "bg-destructive",
};

function daysBetween(fromIso: string, toIso: string) {
  return Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86_400_000);
}

export function ongRelanceBucket(p: OngPipelineItem, today = todayIso()): RelanceBucket {
  if (!p.prochaineActionDate) return "sans-date";
  const d = daysBetween(today, p.prochaineActionDate);
  if (d < 0) return "retard";
  if (d === 0) return "aujourdhui";
  if (d <= 7) return "semaine";
  return "plus-tard";
}

export function isOngOverdue(p: OngPipelineItem, today = todayIso()) {
  return (
    Boolean(p.prochaineActionDate) &&
    p.prochaineActionDate! < today &&
    !STATUTS_ONG_CLOS.includes(p.statut)
  );
}

/** Texte brut sans accent ni casse, pour la recherche et le rapprochement de noms. */
export function normaliser(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Export CSV minimal (séparateur « ; », BOM UTF-8 pour Excel). */
export function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const body = [header, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
  const blob = new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
