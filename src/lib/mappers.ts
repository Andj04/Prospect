import type {
  AuditAction,
  AuditLogEntry,
  AuditTable,
  Company,
  CompanyListItem,
  Contact,
  ContactFonction,
  HistoriqueEntry,
  ImportBatch,
  MindmapNodeType,
  MindmapPosition,
  Ong,
  OngContact,
  OngListItem,
  OngPartenaire,
  OngPipelineItem,
  OngPipelineStatut,
  OngProjetLien,
  OngReseau,
  PipelineItem,
  Priorite,
  PipelineStatut,
  Projet,
  SousComposante,
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
  pays_origine: string;
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
  logo_url: string | null;
  import_batch_id: string | null;
  entreprise_contacts?: ContactRow[];
  entreprise_projets?: { projet_id: string }[];
  entreprise_sous_composantes?: { sous_composante_id: string }[];
};

export function mapCompany(row: EntrepriseRow): Company {
  return {
    id: row.id,
    nom: row.nom,
    groupe: row.groupe,
    secteur: row.secteur,
    paysOrigine: row.pays_origine,
    structureDediee: row.structure_dediee,
    ...(row.logo_url ? { logoUrl: row.logo_url } : {}),
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
    sousComposantes: (row.entreprise_sous_composantes ?? []).map((s) => s.sous_composante_id),
    exclue: row.exclue,
    raisonExclusion: row.raison_exclusion,
    ...(row.import_batch_id ? { importBatchId: row.import_batch_id } : {}),
  };
}

export type EntrepriseListeRow = {
  id: string;
  nom: string;
  groupe: string;
  secteur: string;
  pays_origine: string;
  structure_dediee: boolean | null;
  logo_url: string | null;
  exclue: boolean;
  raison_exclusion: string;
  import_batch_id: string | null;
  comment_type_engagement: string;
  a_mode_acces: boolean;
  a_budget: boolean;
  a_descriptif: boolean;
  a_programmes: boolean;
  a_notes: boolean;
  a_alignement: boolean;
  a_precedent: boolean;
  a_proposition: boolean;
  nb_contacts: number;
  projet_ids: string[] | null;
  sous_composante_ids: string[] | null;
  recherche: string | null;
};

export function mapCompanyListItem(row: EntrepriseListeRow): CompanyListItem {
  return {
    id: row.id,
    nom: row.nom,
    groupe: row.groupe,
    secteur: row.secteur,
    paysOrigine: row.pays_origine,
    structureDediee: row.structure_dediee,
    ...(row.logo_url ? { logoUrl: row.logo_url } : {}),
    exclue: row.exclue,
    raisonExclusion: row.raison_exclusion,
    ...(row.import_batch_id ? { importBatchId: row.import_batch_id } : {}),
    typeEngagement: (row.comment_type_engagement as CompanyListItem["typeEngagement"]) || "",
    nbContacts: Number(row.nb_contacts ?? 0),
    projets: row.projet_ids ?? [],
    sousComposantes: row.sous_composante_ids ?? [],
    recherche: row.recherche ?? "",
    a: {
      modeAcces: row.a_mode_acces,
      budget: row.a_budget,
      descriptif: row.a_descriptif,
      programmes: row.a_programmes,
      notes: row.a_notes,
      alignement: row.a_alignement,
      precedent: row.a_precedent,
      proposition: row.a_proposition,
    },
  };
}

export type PipelineRow = {
  entreprise_id: string;
  statut: PipelineStatut;
  motif_sans_suite: string | null;
  priorite: Priorite;
  responsable: string;
  responsable_id?: string | null;
  dernier_contact: string | null;
  prochaine_action: string;
  prochaine_action_date?: string | null;
  montant_vise?: number | string | null;
  montant_obtenu?: number | string | null;
  projet_cible_id?: string | null;
  statut_depuis?: string | null;
  updated_at?: string | null;
};

const num = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === "" ? undefined : Number(v);

export function mapPipeline(row: PipelineRow, historique: HistoriqueEntry[] = []): PipelineItem {
  return {
    companyId: row.entreprise_id,
    statut: row.statut,
    ...(row.motif_sans_suite ? { motifSansSuite: row.motif_sans_suite } : {}),
    priorite: row.priorite,
    responsable: row.responsable === "Non assigné" ? "" : row.responsable,
    ...(row.responsable_id ? { responsableId: row.responsable_id } : {}),
    ...(row.dernier_contact ? { dernierContact: row.dernier_contact } : {}),
    prochaineAction: row.prochaine_action,
    ...(row.prochaine_action_date ? { prochaineActionDate: row.prochaine_action_date } : {}),
    ...(num(row.montant_vise) !== undefined ? { montantVise: num(row.montant_vise)! } : {}),
    ...(num(row.montant_obtenu) !== undefined ? { montantObtenu: num(row.montant_obtenu)! } : {}),
    ...(row.projet_cible_id ? { projetCibleId: row.projet_cible_id } : {}),
    statutDepuis: row.statut_depuis ?? row.updated_at ?? new Date().toISOString(),
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

export type ProjetRow = {
  id: string;
  nom: string;
  description: string | null;
  ordre: number;
  actif: boolean;
};

export function mapProjet(row: ProjetRow): Projet {
  return {
    id: row.id,
    nom: row.nom,
    ...(row.description ? { description: row.description } : {}),
    ordre: row.ordre,
    actif: row.actif,
  };
}

export type SousComposanteRow = {
  id: string;
  projet_id: string;
  nom: string;
  description: string | null;
  icone: string;
  ordre: number;
};

export function mapSousComposante(row: SousComposanteRow): SousComposante {
  return {
    id: row.id,
    projetId: row.projet_id,
    nom: row.nom,
    ...(row.description ? { description: row.description } : {}),
    icone: row.icone,
    ordre: row.ordre,
  };
}

export type ImportBatchRow = {
  id: string;
  label: string;
  created_at: string;
};

export function mapImportBatch(row: ImportBatchRow): ImportBatch {
  return { id: row.id, label: row.label, createdAt: row.created_at };
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

export type MindmapPositionRow = {
  type: MindmapNodeType;
  entite_id: string;
  projet_context_id: string;
  position_x: number;
  position_y: number;
};

export function mapMindmapPosition(row: MindmapPositionRow): MindmapPosition {
  return {
    type: row.type,
    entiteId: row.entite_id,
    projetContextId: row.projet_context_id,
    x: row.position_x,
    y: row.position_y,
  };
}

/* ------------------------------- ONG ------------------------------- */

export type OngContactRow = {
  id: string;
  fonction_categorie: ContactFonction;
  fonction_detail: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  linkedin: string | null;
};

export function mapOngContact(row: OngContactRow): OngContact {
  return {
    id: row.id,
    fonctionCategorie: row.fonction_categorie,
    ...(row.fonction_detail ? { fonctionDetail: row.fonction_detail } : {}),
    nom: row.nom,
    ...(row.email ? { email: row.email } : {}),
    ...(row.telephone ? { telephone: row.telephone } : {}),
    ...(row.linkedin ? { linkedin: row.linkedin } : {}),
  };
}

export type OngPartenaireRow = {
  id: string;
  nom: string;
  type: OngPartenaire["type"];
  entreprise_id: string | null;
};

export function mapOngPartenaire(row: OngPartenaireRow): OngPartenaire {
  return {
    id: row.id,
    nom: row.nom,
    type: row.type,
    ...(row.entreprise_id ? { entrepriseId: row.entreprise_id } : {}),
  };
}

export type OngRow = {
  id: string;
  nom: string;
  acronyme: string;
  type_structure: Ong["typeStructure"];
  annee_creation: number | null;
  utilite_publique: boolean | null;
  logo_url: string;
  thematiques: string[];
  activites_principales: string;
  publics_cibles: string;
  odd: number[];
  siege: string;
  echelle: Ong["echelle"];
  milieu: Ong["milieu"];
  regions: Ong["regions"];
  regions_verifiees: boolean;
  territoires_precis: string;
  acces_financement: string;
  budget_annuel: string;
  financement_sources: Ong["financementSources"];
  comment_partenariats: string;
  apports: Ong["apports"];
  atouts: string;
  pourquoi_partenaire: string;
  relation_amal_biladi: string;
  transversale: boolean;
  notes: string;
  email: string;
  telephone: string;
  site_web: string;
  reseaux: OngReseau[] | null;
  ong_contacts?: OngContactRow[];
  ong_partenaires?: OngPartenaireRow[];
  ong_projets?: { projet_id: string; role: OngProjetLien["role"] }[];
};

// Ajoute la clé seulement si la valeur est renseignée (même convention que
// mapCompany : les champs vides sont absents de l'objet).
const opt = <K extends string>(key: K, v: string | number | null | undefined) =>
  v === null || v === undefined || v === "" ? {} : ({ [key]: v } as Record<K, string | number>);

export function mapOng(row: OngRow): Ong {
  return {
    id: row.id,
    nom: row.nom,
    ...opt("acronyme", row.acronyme),
    typeStructure: row.type_structure,
    ...opt("anneeCreation", row.annee_creation),
    utilitePublique: row.utilite_publique,
    ...opt("logoUrl", row.logo_url),
    thematiques: row.thematiques ?? [],
    ...opt("activitesPrincipales", row.activites_principales),
    ...opt("publicsCibles", row.publics_cibles),
    odd: row.odd ?? [],
    ...opt("siege", row.siege),
    echelle: row.echelle ?? [],
    milieu: row.milieu ?? [],
    regions: row.regions ?? [],
    regionsVerifiees: row.regions_verifiees,
    ...opt("territoiresPrecis", row.territoires_precis),
    ...opt("accesFinancement", row.acces_financement),
    ...opt("budgetAnnuel", row.budget_annuel),
    financementSources: row.financement_sources ?? [],
    ...opt("commentPartenariats", row.comment_partenariats),
    apports: row.apports ?? [],
    ...opt("atouts", row.atouts),
    ...opt("pourquoiPartenaire", row.pourquoi_partenaire),
    ...opt("relationAmalBiladi", row.relation_amal_biladi),
    transversale: row.transversale,
    ...opt("notes", row.notes),
    ...opt("email", row.email),
    ...opt("telephone", row.telephone),
    ...opt("siteWeb", row.site_web),
    reseaux: row.reseaux ?? [],
    contacts: (row.ong_contacts ?? []).map(mapOngContact),
    partenaires: (row.ong_partenaires ?? []).map(mapOngPartenaire),
    projets: (row.ong_projets ?? []).map((p) => ({ projetId: p.projet_id, role: p.role })),
  } as Ong;
}

export type OngListeRow = {
  id: string;
  nom: string;
  acronyme: string;
  type_structure: OngListItem["typeStructure"];
  annee_creation: number | null;
  utilite_publique: boolean | null;
  logo_url: string;
  thematiques: string[];
  odd: number[];
  siege: string;
  echelle: OngListItem["echelle"];
  milieu: OngListItem["milieu"];
  regions: OngListItem["regions"];
  regions_verifiees: boolean;
  financement_sources: OngListItem["financementSources"];
  apports: OngListItem["apports"];
  transversale: boolean;
  budget_annuel: string;
  a_activites: boolean;
  a_publics: boolean;
  a_territoires: boolean;
  a_acces_financement: boolean;
  a_comment_partenariats: boolean;
  a_atouts: boolean;
  a_pourquoi: boolean;
  a_relation: boolean;
  a_notes: boolean;
  a_coordonnees: boolean;
  nb_contacts: number;
  nb_partenaires: number;
  nb_passerelles: number;
  projet_ids: string[] | null;
  projet_principal_id: string | null;
  recherche: string | null;
};

export function mapOngListItem(row: OngListeRow): OngListItem {
  return {
    id: row.id,
    nom: row.nom,
    ...(row.acronyme ? { acronyme: row.acronyme } : {}),
    typeStructure: row.type_structure,
    ...(row.annee_creation ? { anneeCreation: row.annee_creation } : {}),
    utilitePublique: row.utilite_publique,
    ...(row.logo_url ? { logoUrl: row.logo_url } : {}),
    thematiques: row.thematiques ?? [],
    odd: row.odd ?? [],
    ...(row.siege ? { siege: row.siege } : {}),
    echelle: row.echelle ?? [],
    milieu: row.milieu ?? [],
    regions: row.regions ?? [],
    regionsVerifiees: row.regions_verifiees,
    financementSources: row.financement_sources ?? [],
    apports: row.apports ?? [],
    transversale: row.transversale,
    ...(row.budget_annuel ? { budgetAnnuel: row.budget_annuel } : {}),
    nbContacts: Number(row.nb_contacts ?? 0),
    nbPartenaires: Number(row.nb_partenaires ?? 0),
    nbPasserelles: Number(row.nb_passerelles ?? 0),
    projets: row.projet_ids ?? [],
    ...(row.projet_principal_id ? { projetPrincipalId: row.projet_principal_id } : {}),
    recherche: row.recherche ?? "",
    a: {
      activites: row.a_activites,
      publics: row.a_publics,
      territoires: row.a_territoires,
      accesFinancement: row.a_acces_financement,
      commentPartenariats: row.a_comment_partenariats,
      atouts: row.a_atouts,
      pourquoi: row.a_pourquoi,
      relation: row.a_relation,
      notes: row.a_notes,
      coordonnees: row.a_coordonnees,
    },
  };
}

export type PipelineOngRow = {
  ong_id: string;
  statut: OngPipelineStatut;
  motif_sans_suite: string | null;
  responsable: string;
  responsable_id: string | null;
  dernier_contact: string | null;
  prochaine_action: string;
  prochaine_action_date: string | null;
  contact_interne: string;
  statut_depuis: string;
};

export function mapOngPipeline(
  row: PipelineOngRow,
  historique: HistoriqueEntry[] = [],
): OngPipelineItem {
  return {
    ongId: row.ong_id,
    statut: row.statut,
    ...(row.motif_sans_suite ? { motifSansSuite: row.motif_sans_suite } : {}),
    responsable: row.responsable,
    ...(row.responsable_id ? { responsableId: row.responsable_id } : {}),
    ...(row.dernier_contact ? { dernierContact: row.dernier_contact } : {}),
    prochaineAction: row.prochaine_action,
    ...(row.prochaine_action_date ? { prochaineActionDate: row.prochaine_action_date } : {}),
    contactInterne: row.contact_interne,
    statutDepuis: row.statut_depuis,
    historique,
  };
}
