import type {
  AuditAction,
  AuditLogEntry,
  AuditTable,
  Company,
  Contact,
  ContactFonction,
  HistoriqueEntry,
  PipelineItem,
  Priorite,
  PipelineStatut,
  Projet,
} from "./types";

export type ContactRow = {
  id: string;
  fonction: ContactFonction;
  nom: string;
  linkedin: string | null;
  email: string | null;
  telephone: string | null;
};

export function mapContact(row: ContactRow): Contact {
  return {
    id: row.id,
    fonction: row.fonction,
    nom: row.nom,
    ...(row.linkedin ? { linkedin: row.linkedin } : {}),
    ...(row.email ? { email: row.email } : {}),
    ...(row.telephone ? { telephone: row.telephone } : {}),
  };
}

export type EntrepriseRow = {
  id: string;
  nom: string;
  groupe: string;
  secteur: string;
  structure_dediee: boolean | null;
  comment_mode_acces: string;
  comment_budget: string;
  comment_type_engagement: string;
  quoi_descriptif: string;
  quoi_programmes: string;
  quoi_projets_finances: string;
  quoi_notes_complementaires: string;
  pourquoi_alignement: string;
  pourquoi_precedent_fort: string;
  pourquoi_proposition: string;
  exclue: boolean;
  raison_exclusion: string;
  entreprise_contacts?: ContactRow[];
  entreprise_projets?: { projet_id: string }[];
};

export function mapCompany(row: EntrepriseRow): Company {
  return {
    id: row.id,
    nom: row.nom,
    groupe: row.groupe,
    secteur: row.secteur,
    structureDediee: row.structure_dediee,
    modeAcces: row.comment_mode_acces,
    budgetRSE: row.comment_budget,
    typeEngagement: (row.comment_type_engagement as Company["typeEngagement"]) || "",
    descriptifActivites: row.quoi_descriptif,
    programmes: row.quoi_programmes,
    projetsFinances: row.quoi_projets_finances,
    notesComplementaires: row.quoi_notes_complementaires,
    alignementThematique: row.pourquoi_alignement,
    precedentFort: row.pourquoi_precedent_fort,
    propositionConcrete: row.pourquoi_proposition,
    contacts: (row.entreprise_contacts ?? []).map(mapContact),
    projets: (row.entreprise_projets ?? []).map((p) => p.projet_id),
    exclue: row.exclue,
    raisonExclusion: row.raison_exclusion,
  };
}

export type PipelineRow = {
  entreprise_id: string;
  statut: PipelineStatut;
  motif_sans_suite: string | null;
  priorite: Priorite;
  responsable: string;
  dernier_contact: string;
  prochaine_action: string;
};

export function mapPipeline(row: PipelineRow, historique: HistoriqueEntry[] = []): PipelineItem {
  return {
    companyId: row.entreprise_id,
    statut: row.statut,
    ...(row.motif_sans_suite ? { motifSansSuite: row.motif_sans_suite } : {}),
    priorite: row.priorite,
    responsable: row.responsable,
    dernierContact: row.dernier_contact,
    prochaineAction: row.prochaine_action,
    historique,
  };
}

export type HistoriqueRow = {
  id: string;
  date: string;
  type: string;
  resume: string;
  auteur: string;
};

export function mapHistorique(row: HistoriqueRow): HistoriqueEntry {
  return { id: row.id, date: row.date, type: row.type, resume: row.resume, auteur: row.auteur };
}

export type ProjetRow = { id: string; nom: string; ordre: number };

export function mapProjet(row: ProjetRow): Projet {
  return { id: row.id, nom: row.nom, ordre: row.ordre };
}

export type AuditLogRow = {
  id: string;
  actor_id: string | null;
  actor_name: string;
  table_name: AuditTable;
  action: AuditAction;
  record_id: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
};

export function mapAuditLogEntry(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    tableName: row.table_name,
    action: row.action,
    recordId: row.record_id,
    oldData: row.old_data,
    newData: row.new_data,
    createdAt: row.created_at,
  };
}
