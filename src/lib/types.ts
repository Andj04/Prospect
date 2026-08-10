export type Role = "admin" | "user";

export type ContactFonction =
  "dirigeant" | "rh" | "rse-communication" | "fondation" | "marketing" | "autre";

export const CONTACT_FONCTIONS: { value: ContactFonction; label: string }[] = [
  { value: "dirigeant", label: "Dirigeant" },
  { value: "rh", label: "Responsable RH" },
  { value: "rse-communication", label: "RSE / Communication" },
  { value: "fondation", label: "Fondation" },
  { value: "marketing", label: "Marketing" },
  { value: "autre", label: "Autre" },
];

export type Contact = {
  id: string;
  fonction: ContactFonction;
  nom: string;
  linkedin?: string;
  email?: string;
  telephone?: string;
};

// Projets Amal Biladi : table dédiée en base, éditable par un admin.
export type Projet = {
  id: string;
  nom: string;
  ordre: number;
};

export type Company = {
  id: string;
  // 1. Identité
  nom: string;
  groupe?: string;
  secteur?: string;
  structureDediee: boolean | null;
  // 2. Comment
  modeAcces?: string;
  budgetRSE?: string;
  typeEngagement?: "recurrent" | "ponctuel" | "";
  // 3. Quoi
  descriptifActivites?: string;
  programmes?: string;
  projetsFinances?: string;
  notesComplementaires?: string;
  // 4. Pourquoi
  alignementThematique?: string;
  precedentFort?: string;
  propositionConcrete?: string;
  // 5. Contacts
  contacts: Contact[];
  // 6. Projets Amal Biladi concernés (ids)
  projets: string[];
  // 7. Exclusion
  exclue: boolean;
  raisonExclusion?: string;
};

export type PipelineStatut =
  | "identifie"
  | "premier-contact"
  | "en-discussion"
  | "visite-programmee"
  | "proposition-envoyee"
  | "partenariat-signe"
  | "sans-suite";

export const STATUTS: { value: PipelineStatut; label: string }[] = [
  { value: "identifie", label: "Identifié" },
  { value: "premier-contact", label: "Premier contact pris" },
  { value: "en-discussion", label: "En discussion" },
  { value: "visite-programmee", label: "Visite / présentation programmée" },
  { value: "proposition-envoyee", label: "Proposition envoyée" },
  { value: "partenariat-signe", label: "Partenariat signé" },
  { value: "sans-suite", label: "Classé sans suite" },
];

export type Priorite = "haute" | "moyenne" | "basse";

export type HistoriqueEntry = {
  id: string;
  date: string;
  type: string;
  resume: string;
  auteur: string;
};

export type PipelineItem = {
  companyId: string;
  statut: PipelineStatut;
  motifSansSuite?: string;
  priorite: Priorite;
  responsable: string;
  dernierContact: string;
  prochaineAction: string;
  historique: HistoriqueEntry[];
};

export type AppUser = {
  id: string;
  nomComplet: string;
  email: string;
  structure: string;
  role: Role;
  passwordChangeRequired: boolean;
};

export type AuditAction = "INSERT" | "UPDATE" | "DELETE";
export type AuditTable = "entreprises" | "pipeline" | "pipeline_historique" | "projets";

export type AuditLogEntry = {
  id: string;
  actorId: string | null;
  actorName: string;
  tableName: AuditTable;
  action: AuditAction;
  recordId: string;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  createdAt: string;
};
