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

// Secteurs d'activité normalisés — remplace les descriptions libres saisies
// au cas par cas, qui produisaient autant de valeurs distinctes que
// d'entreprises. Toute entreprise existante a été reclassée dans l'une de
// ces catégories (voir scripts/README ou l'historique de migration).
export const SECTEUR_OPTIONS = [
  "Agroalimentaire et boissons",
  "Banque, finance et assurance",
  "Distribution et grande consommation",
  "Énergie et carburants",
  "Mines et industrie extractive",
  "BTP, matériaux et construction",
  "Ameublement et décoration",
  "Immobilier et aménagement urbain",
  "Télécoms et technologies",
  "Conseil, IT et transformation digitale",
  "Relation client et BPO",
  "Automobile et mobilité",
  "Aéronautique",
  "Cosmétique et bien-être",
  "Pharmaceutique et santé",
  "Tourisme et hôtellerie",
  "Logistique et transport",
  "Agriculture et irrigation",
  "Économie circulaire",
  "Eaux minérales et thermalisme",
  "Matériel électrique et industriel",
  "Textile et habillement",
  "Sécurité et gardiennage",
  "Patrimoine et culture",
  "Jeux d'argent et loterie",
  "Action sociale et solidarité",
  "Sport",
  "Multisecteur",
] as const;

// Pays d'origine du groupe/de la maison mère — sert à distinguer une
// entreprise marocaine d'une filiale de groupe étranger (stats). Liste
// volontairement resserrée aux pays effectivement présents dans la base ;
// à étendre si besoin lors de futurs ajouts.
export const PAYS_OPTIONS = [
  "Maroc",
  "France",
  "États-Unis",
  "Allemagne",
  "Suisse",
  "Royaume-Uni",
  "Espagne",
  "Italie",
  "Belgique",
  "Pays-Bas",
  "Suède",
  "Finlande",
  "Danemark",
  "Japon",
  "Chine",
  "Corée du Sud",
  "Émirats Arabes Unis",
  "Arabie Saoudite",
  "Turquie",
  "Canada",
  "Afrique du Sud",
  "Grèce",
  "Jordanie",
  "Australie",
  "Autre",
] as const;

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
  description?: string;
  ordre: number;
  actif: boolean;
};

// Granularité sous un projet (ex. "Bourses pour bacheliers" sous "Maison
// des Étoiles"). L'icône est une clé résolue via src/lib/sous-composante-icons.ts.
export type SousComposante = {
  id: string;
  projetId: string;
  nom: string;
  description?: string;
  icone: string;
  ordre: number;
};

export type Company = {
  id: string;
  // 1. Identité
  nom: string;
  groupe?: string;
  secteur?: string;
  paysOrigine?: string;
  structureDediee: boolean | null;
  logoUrl?: string;
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
  // 6. Projets Amal Biladi concernés (ids) + sous-composantes précises (ids)
  projets: string[];
  sousComposantes: string[];
  // 7. Exclusion
  exclue: boolean;
  raisonExclusion?: string;
  // Lot d'import (null = créée normalement, pas de bandeau dans le tableau Admin)
  importBatchId?: string;
};

// Regroupe visuellement, dans le tableau Admin, les entreprises importées en
// masse (ex. un nouveau lot de prospection) — pour ne pas les mélanger aux
// entreprises créées normalement.
// Version allégée d'une fiche pour les listes et les tableaux de bord :
// les champs longs sont remplacés par un indicateur de présence, et la
// recherche est préparée côté base. Voir supabase/migrations/0010_vue_liste.sql.
export type CompanyListItem = {
  id: string;
  nom: string;
  groupe?: string;
  secteur?: string;
  paysOrigine?: string;
  structureDediee: boolean | null;
  logoUrl?: string;
  exclue: boolean;
  raisonExclusion?: string;
  importBatchId?: string;
  typeEngagement?: "recurrent" | "ponctuel" | "";
  nbContacts: number;
  projets: string[];
  sousComposantes: string[];
  /** Texte minuscule pré-calculé : nom, groupe, secteur, pays, contacts, alignement. */
  recherche: string;
  /** Présence des champs longs, sans leur contenu. */
  a: {
    modeAcces: boolean;
    budget: boolean;
    descriptif: boolean;
    programmes: boolean;
    notes: boolean;
    alignement: boolean;
    precedent: boolean;
    proposition: boolean;
  };
};

export type ContactDirectoryEntry = Contact & {
  companyId: string;
  companyNom: string;
  companySecteur: string;
};

export type ImportBatch = {
  id: string;
  label: string;
  createdAt: string;
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
  responsableId?: string;
  /** Date du dernier échange réel (appel, email, réunion…), jamais la date d'import. */
  dernierContact?: string;
  prochaineAction: string;
  prochaineActionDate?: string;
  montantVise?: number;
  montantObtenu?: number;
  projetCibleId?: string;
  /** Date d'entrée dans le statut courant. */
  statutDepuis: string;
  historique: HistoriqueEntry[];
};

// Probabilité de signature par étape : sert au montant pondéré attendu.
export const STATUT_PROBABILITE: Record<PipelineStatut, number> = {
  identifie: 0.05,
  "premier-contact": 0.1,
  "en-discussion": 0.25,
  "visite-programmee": 0.4,
  "proposition-envoyee": 0.6,
  "partenariat-signe": 1,
  "sans-suite": 0,
};

// Statuts d'un dossier en cours (ni en attente de premier contact, ni clos).
export const STATUTS_EN_COURS: PipelineStatut[] = [
  "premier-contact",
  "en-discussion",
  "visite-programmee",
  "proposition-envoyee",
];

// Types d'échange qui comptent comme un vrai contact (mettent à jour
// « dernier contact »). « Statut » et « Note » sont des entrées internes.
export const TYPES_ECHANGE = [
  "Appel",
  "Email",
  "Réunion",
  "Visite",
  "Proposition",
  "Décision",
] as const;

export type PipelineDocument = {
  id: string;
  companyId: string;
  nom: string;
  chemin: string;
  taille?: number;
  typeMime?: string;
  auteur: string;
  createdAt: string;
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
export type AuditTable =
  | "entreprises"
  | "pipeline"
  | "pipeline_historique"
  | "projets"
  | "sous_composantes"
  | "import_batches"
  | "pipeline_documents"
  | "ong"
  | "ong_contacts"
  | "ong_partenaires"
  | "ong_projets"
  | "pipeline_ong"
  | "pipeline_ong_historique";

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

export type MindmapNodeType = "projet" | "entreprise";

export type MindmapPosition = {
  type: MindmapNodeType;
  entiteId: string;
  projetContextId: string;
  x: number;
  y: number;
};

/* ------------------------------- ONG ------------------------------- */
// Section ONG : tables séparées des entreprises (voir
// supabase/migrations/0011_ong.sql). « accesFinancement » décrit comment
// l'ONG finance ses propres activités — à ne jamais confondre avec
// Company.modeAcces (comment Amal Biladi accède à l'argent d'une entreprise).

export type TypeStructure =
  | "association"
  | "fondation"
  | "fondation-entreprise"
  | "association-etudiante"
  | "federation"
  | "reseau-international";

export const TYPE_STRUCTURE_OPTIONS: { value: TypeStructure; label: string }[] = [
  { value: "association", label: "Association" },
  { value: "fondation", label: "Fondation" },
  { value: "fondation-entreprise", label: "Fondation d'entreprise" },
  { value: "association-etudiante", label: "Association étudiante" },
  { value: "federation", label: "Fédération ou union" },
  { value: "reseau-international", label: "Réseau international" },
];

// Liste fermée définie par le Lisez-moi du fichier source.
export const APPORTS = [
  "Financement direct",
  "Accès à un réseau d'entreprises ou de bailleurs",
  "Expertise technique",
  "Relais terrain",
  "Recherche et évaluation",
  "Visibilité et communication",
  "Réplication d'un modèle",
] as const;
export type Apport = (typeof APPORTS)[number];

export type Echelle = "local" | "regional" | "national" | "international";
export const ECHELLES: { value: Echelle; label: string }[] = [
  { value: "local", label: "Local" },
  { value: "regional", label: "Régional" },
  { value: "national", label: "National" },
  { value: "international", label: "International" },
];

export type Milieu = "urbain" | "rural" | "montagnard" | "cotier";
export const MILIEUX: { value: Milieu; label: string }[] = [
  { value: "urbain", label: "Urbain" },
  { value: "rural", label: "Rural" },
  { value: "montagnard", label: "Montagnard" },
  { value: "cotier", label: "Côtier" },
];

export type RegionCode =
  | "MA-01"
  | "MA-02"
  | "MA-03"
  | "MA-04"
  | "MA-05"
  | "MA-06"
  | "MA-07"
  | "MA-08"
  | "MA-09"
  | "MA-10"
  | "MA-11"
  | "MA-12";

// Codes ISO 3166-2 tels que fournis par le fond de carte (morocco-map).
export const REGIONS: { code: RegionCode; nom: string }[] = [
  { code: "MA-01", nom: "Tanger-Tétouan-Al Hoceïma" },
  { code: "MA-02", nom: "L'Oriental" },
  { code: "MA-03", nom: "Fès-Meknès" },
  { code: "MA-04", nom: "Rabat-Salé-Kénitra" },
  { code: "MA-05", nom: "Béni Mellal-Khénifra" },
  { code: "MA-06", nom: "Casablanca-Settat" },
  { code: "MA-07", nom: "Marrakech-Safi" },
  { code: "MA-08", nom: "Drâa-Tafilalet" },
  { code: "MA-09", nom: "Souss-Massa" },
  { code: "MA-10", nom: "Guelmim-Oued Noun" },
  { code: "MA-11", nom: "Laâyoune-Sakia El Hamra" },
  { code: "MA-12", nom: "Dakhla-Oued Ed-Dahab" },
];

export const ODD_LABELS: Record<number, string> = {
  1: "Pas de pauvreté",
  2: "Faim zéro",
  3: "Bonne santé et bien-être",
  4: "Éducation de qualité",
  5: "Égalité entre les sexes",
  6: "Eau propre et assainissement",
  7: "Énergie propre et d'un coût abordable",
  8: "Travail décent et croissance économique",
  9: "Industrie, innovation et infrastructure",
  10: "Inégalités réduites",
  11: "Villes et communautés durables",
  12: "Consommation et production responsables",
  13: "Lutte contre les changements climatiques",
  14: "Vie aquatique",
  15: "Vie terrestre",
  16: "Paix, justice et institutions efficaces",
  17: "Partenariats pour la réalisation des objectifs",
};

export type OngReseau = { type: string; url: string };

export type OngPartenaireType = "prive" | "institutionnel" | "academique" | "bailleur";

export const PARTENAIRE_TYPES: { value: OngPartenaireType; label: string }[] = [
  { value: "prive", label: "Partenaires privés" },
  { value: "institutionnel", label: "Partenaires institutionnels" },
  { value: "academique", label: "Partenaires académiques" },
  { value: "bailleur", label: "Bailleurs connus" },
];

export type OngPartenaire = {
  id: string;
  nom: string;
  type: OngPartenaireType;
  /** Passerelle : entreprise de la base correspondant à ce partenaire (validée à la main). */
  entrepriseId?: string;
};

export type OngContact = {
  id: string;
  fonctionCategorie: ContactFonction;
  fonctionDetail?: string;
  nom: string;
  email?: string;
  telephone?: string;
  linkedin?: string;
};

export type OngProjetLien = { projetId: string; role: "principal" | "lie" };

export type Ong = {
  id: string;
  nom: string;
  acronyme?: string;
  typeStructure: TypeStructure;
  anneeCreation?: number;
  /** null = inconnu */
  utilitePublique: boolean | null;
  logoUrl?: string;
  thematiques: string[];
  activitesPrincipales?: string;
  publicsCibles?: string;
  odd: number[];
  siege?: string;
  echelle: Echelle[];
  milieu: Milieu[];
  /** Déduites des lieux cités : à relire (voir regionsVerifiees). */
  regions: RegionCode[];
  regionsVerifiees: boolean;
  territoiresPrecis?: string;
  /** Comment l'ONG finance ses propres activités. */
  accesFinancement?: string;
  budgetAnnuel?: string;
  financementSources: ("international" | "diaspora")[];
  commentPartenariats?: string;
  apports: Apport[];
  atouts?: string;
  pourquoiPartenaire?: string;
  relationAmalBiladi?: string;
  transversale: boolean;
  notes?: string;
  email?: string;
  telephone?: string;
  siteWeb?: string;
  reseaux: OngReseau[];
  contacts: OngContact[];
  partenaires: OngPartenaire[];
  projets: OngProjetLien[];
  // Qualité des données (sources, signaux…) : stockée en base, ignorée par mapOng, jamais affichée.
};

export type OngListItem = {
  id: string;
  nom: string;
  acronyme?: string;
  typeStructure: TypeStructure;
  anneeCreation?: number;
  utilitePublique: boolean | null;
  logoUrl?: string;
  thematiques: string[];
  odd: number[];
  siege?: string;
  echelle: Echelle[];
  milieu: Milieu[];
  regions: RegionCode[];
  regionsVerifiees: boolean;
  financementSources: ("international" | "diaspora")[];
  apports: Apport[];
  transversale: boolean;
  budgetAnnuel?: string;
  nbContacts: number;
  nbPartenaires: number;
  nbPasserelles: number;
  projets: string[];
  projetPrincipalId?: string;
  /** Texte minuscule pré-calculé : nom, acronyme, siège, thématiques, territoires, partenaires. */
  recherche: string;
  /** Présence des champs longs, sans leur contenu. */
  a: {
    activites: boolean;
    publics: boolean;
    territoires: boolean;
    accesFinancement: boolean;
    commentPartenariats: boolean;
    atouts: boolean;
    pourquoi: boolean;
    relation: boolean;
    notes: boolean;
    coordonnees: boolean;
  };
};

export type OngPipelineStatut =
  | "a-contacter"
  | "contact-pris"
  | "en-discussion"
  | "convention-en-preparation"
  | "partenaire-actif"
  | "sans-suite";

export const STATUTS_ONG: { value: OngPipelineStatut; label: string }[] = [
  { value: "a-contacter", label: "À contacter" },
  { value: "contact-pris", label: "Contact pris" },
  { value: "en-discussion", label: "En discussion" },
  { value: "convention-en-preparation", label: "Convention en préparation" },
  { value: "partenaire-actif", label: "Partenaire actif" },
  { value: "sans-suite", label: "Sans suite" },
];

export type OngHistoriqueEntry = HistoriqueEntry;

export type OngPipelineItem = {
  ongId: string;
  statut: OngPipelineStatut;
  motifSansSuite?: string;
  responsable: string;
  responsableId?: string;
  dernierContact?: string;
  prochaineAction: string;
  prochaineActionDate?: string;
  contactInterne: string;
  statutDepuis: string;
  historique: OngHistoriqueEntry[];
};

/** Entrée de l'annuaire des contacts ONG. */
export type OngContactDirectoryEntry = OngContact & { ongId: string; ongNom: string };
