import {
  STATUTS_EN_COURS,
  STATUT_PROBABILITE,
  type Company,
  type Contact,
  type PipelineItem,
  type Projet,
  type SousComposante,
} from "@/lib/types";

export const JOURS_INACTIVITE = 30;

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string) {
  return Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86_400_000);
}

export type RelanceBucket = "retard" | "aujourdhui" | "semaine" | "plus-tard" | "sans-date";

export const BUCKET_LABEL: Record<RelanceBucket, string> = {
  retard: "En retard",
  aujourdhui: "Aujourd'hui",
  semaine: "Cette semaine",
  "plus-tard": "Plus tard",
  "sans-date": "Sans échéance",
};

export function relanceBucket(p: PipelineItem, today = todayIso()): RelanceBucket {
  if (!p.prochaineActionDate) return "sans-date";
  const d = daysBetween(today, p.prochaineActionDate);
  if (d < 0) return "retard";
  if (d === 0) return "aujourdhui";
  if (d <= 7) return "semaine";
  return "plus-tard";
}

export function isOverdue(p: PipelineItem, today = todayIso()) {
  return (
    Boolean(p.prochaineActionDate) &&
    p.prochaineActionDate! < today &&
    p.statut !== "partenariat-signe" &&
    p.statut !== "sans-suite"
  );
}

// Dossier en cours sans aucun échange (ni changement d'étape) depuis 30 jours.
export function isInactive(p: PipelineItem, today = todayIso()) {
  if (!STATUTS_EN_COURS.includes(p.statut)) return false;
  const last = [p.dernierContact, p.statutDepuis.slice(0, 10)].filter(Boolean).sort().pop()!;
  return daysBetween(last, today) >= JOURS_INACTIVITE;
}

export function daysSince(iso: string | undefined, today = todayIso()) {
  return iso ? daysBetween(iso.slice(0, 10), today) : null;
}

export function weightedAmount(p: PipelineItem) {
  return (p.montantVise ?? 0) * STATUT_PROBABILITE[p.statut];
}

const MAD = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
export function formatMAD(n: number | undefined | null) {
  if (n === undefined || n === null) return "—";
  return `${MAD.format(n)} MAD`;
}

/* ------------------------- Modèles d'emails ------------------------- */

export type EmailDraft = { objet: string; corps: string };

// Brouillon de premier contact, prérempli avec l'entreprise, le contact et
// le projet Amal Biladi visé. Pensé pour être copié puis ajusté à la main.
export function buildProspectionEmail({
  company,
  contact,
  projet,
  sousComposantes,
  signature,
}: {
  company: Company;
  contact?: Contact | undefined;
  projet?: Projet | undefined;
  sousComposantes: SousComposante[];
  signature: string;
}): EmailDraft {
  const civilite =
    contact?.nom && contact.nom.length < 60 ? `Bonjour ${contact.nom},` : "Madame, Monsieur,";
  const scs = projet
    ? sousComposantes
        .filter((s) => s.projetId === projet.id && company.sousComposantes.includes(s.id))
        .map((s) => s.nom.toLowerCase())
    : [];
  const projetPhrase = projet
    ? `Nous portons actuellement le projet « ${projet.nom} »${
        projet.description ? `, ${projet.description.replace(/\.$/, "")}` : ""
      }.`
    : "Nous portons plusieurs projets de développement territorial en milieu rural.";
  const pistes = scs.length
    ? `\n\nConcrètement, votre soutien pourrait porter sur : ${scs.join(", ")}.`
    : "";
  const lien = company.precedentFort
    ? `\n\nVotre engagement nous a particulièrement marqués, notamment : ${company.precedentFort.replace(/\.$/, "")}. C'est pourquoi nous pensons qu'un partenariat aurait du sens.`
    : company.alignementThematique
      ? `\n\nVos engagements rejoignent directement notre action, ce qui nous fait penser qu'un partenariat aurait du sens.`
      : "";

  return {
    objet: `Amal Biladi × ${company.nom} — proposition de partenariat${projet ? ` : ${projet.nom}` : ""}`,
    corps: `${civilite}

Je me permets de vous contacter au nom de l'association Amal Biladi, qui agit pour le développement des territoires ruraux et montagneux du Maroc.

${projetPhrase}${pistes}${lien}

Seriez-vous disponible pour un échange de 20 minutes dans les prochaines semaines ? Je serais ravi(e) de vous présenter le projet plus en détail et d'étudier avec vous la forme de soutien la plus adaptée.

Bien cordialement,
${signature}
Amal Biladi`,
  };
}
