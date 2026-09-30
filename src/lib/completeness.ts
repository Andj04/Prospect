import type { Company } from "@/lib/types";

export type FieldCheck = { key: string; label: string; test: (c: Company) => boolean };

const filled = (v: string | undefined | null) => !!v && v.trim() !== "";

// Une fiche est "complète" quand ces 10 informations sont renseignées — le
// socle minimum pour qu'un admin puisse prospecter l'entreprise sans devoir
// d'abord aller chercher l'info ailleurs. Tout le reste est un bonus.
export const REQUIRED_CHECKS: FieldCheck[] = [
  { key: "nom", label: "Nom de l'entreprise", test: (c) => filled(c.nom) },
  { key: "paysOrigine", label: "Pays d'origine", test: (c) => filled(c.paysOrigine) },
  { key: "secteur", label: "Secteur d'activité", test: (c) => filled(c.secteur) },
  { key: "modeAcces", label: "Mode d'accès au financement", test: (c) => filled(c.modeAcces) },
  {
    key: "descriptif",
    label: "Descriptif des activités",
    test: (c) => filled(c.descriptifActivites),
  },
  {
    key: "programmes",
    label: "Programmes ou projets déjà financés",
    test: (c) => filled(c.programmes) || filled(c.projetsFinances),
  },
  {
    key: "alignement",
    label: "Alignement thématique",
    test: (c) => filled(c.alignementThematique),
  },
  { key: "contacts", label: "Contacts", test: (c) => c.contacts.length > 0 },
  { key: "projets", label: "Projets Amal Biladi liés", test: (c) => c.projets.length > 0 },
  {
    key: "sousComposantes",
    label: "Sous-composantes liées",
    test: (c) => c.sousComposantes.length > 0,
  },
];

// Champs "bonus" : utiles quand ils existent, jamais comptés dans le score.
export const BONUS_CHECKS: FieldCheck[] = [
  { key: "groupe", label: "Groupe / maison mère", test: (c) => filled(c.groupe) },
  { key: "budgetRSE", label: "Budget RSE", test: (c) => filled(c.budgetRSE) },
  { key: "typeEngagement", label: "Type d'engagement", test: (c) => filled(c.typeEngagement) },
  {
    key: "structureDediee",
    label: "Structure dédiée (oui/non renseigné)",
    test: (c) => c.structureDediee !== null && c.structureDediee !== undefined,
  },
  { key: "precedentFort", label: "Précédent le plus fort", test: (c) => filled(c.precedentFort) },
  {
    key: "propositionConcrete",
    label: "Proposition concrète",
    test: (c) => filled(c.propositionConcrete),
  },
  { key: "notes", label: "Notes complémentaires", test: (c) => filled(c.notesComplementaires) },
  { key: "logo", label: "Logo", test: (c) => filled(c.logoUrl) },
];

export function missingRequired(c: Company): string[] {
  return REQUIRED_CHECKS.filter((f) => !f.test(c)).map((f) => f.label);
}

export function missingBonus(c: Company): string[] {
  return BONUS_CHECKS.filter((f) => !f.test(c)).map((f) => f.label);
}

export function completionScore(c: Company): { filled: number; total: number } {
  const total = REQUIRED_CHECKS.length;
  return { filled: total - missingRequired(c).length, total };
}
