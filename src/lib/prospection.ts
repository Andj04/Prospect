// Prospection contact par contact (voir supabase/migrations/0014_prospection_linkedin.sql).
// Une ligne par contact et par canal ; LinkedIn d'abord, email et téléphone ensuite.

export type Canal = "linkedin" | "email" | "telephone";

export const CANAUX: { value: Canal; label: string; disponible: boolean }[] = [
  { value: "linkedin", label: "LinkedIn", disponible: true },
  { value: "email", label: "Email", disponible: false },
  { value: "telephone", label: "Téléphone", disponible: false },
];

export type EtapeLinkedin =
  | "a-inviter"
  | "invitation-envoyee"
  | "acceptee"
  | "message-envoye"
  | "relance-1"
  | "relance-2"
  | "relance-finale"
  | "repondu"
  | "sans-suite";

export const ETAPES_LINKEDIN: { value: EtapeLinkedin; label: string; court: string }[] = [
  { value: "a-inviter", label: "À inviter", court: "À inviter" },
  { value: "invitation-envoyee", label: "Invitation envoyée", court: "Invitée" },
  { value: "acceptee", label: "Invitation acceptée", court: "Acceptée" },
  { value: "message-envoye", label: "Message envoyé", court: "Message" },
  { value: "relance-1", label: "1re relance envoyée", court: "Relance 1" },
  { value: "relance-2", label: "2e relance envoyée", court: "Relance 2" },
  { value: "relance-finale", label: "Relance finale envoyée", court: "Relance finale" },
  { value: "repondu", label: "A répondu", court: "Répondu" },
  { value: "sans-suite", label: "Sans suite", court: "Sans suite" },
];

export const etapeLabel = (e: EtapeLinkedin) =>
  ETAPES_LINKEDIN.find((x) => x.value === e)?.label ?? e;

// Étape suivante proposée par le bouton d'avancement rapide (libellé du bouton).
export const ETAPE_SUIVANTE: Partial<Record<EtapeLinkedin, { to: EtapeLinkedin; action: string }>> =
  {
    "a-inviter": { to: "invitation-envoyee", action: "Invitation envoyée" },
    "invitation-envoyee": { to: "acceptee", action: "A accepté" },
    acceptee: { to: "message-envoye", action: "Message envoyé" },
    "message-envoye": { to: "relance-1", action: "Relance 1 envoyée" },
    "relance-1": { to: "relance-2", action: "Relance 2 envoyée" },
    "relance-2": { to: "relance-finale", action: "Relance finale envoyée" },
  };

export type Reponse = "favorable" | "redirection" | "information" | "plus-tard" | "refus";

export const REPONSES: { value: Reponse; label: string; hint: string }[] = [
  { value: "favorable", label: "Favorable", hint: "Intéressé, accepte un échange" },
  { value: "redirection", label: "Redirection", hint: "Donne le nom de la bonne personne" },
  { value: "information", label: "Demande d'information", hint: "Veut la présentation d'une page" },
  { value: "plus-tard", label: "Pas maintenant", hint: "À recontacter plus tard" },
  { value: "refus", label: "Refus", hint: "Pas intéressé" },
];

export const reponseLabel = (r: Reponse) => REPONSES.find((x) => x.value === r)?.label ?? r;

/** Réponses qui doivent être visibles par les autres contacts de l'entreprise. */
export const REPONSES_PARTAGEES: Reponse[] = ["favorable", "redirection", "information"];

// Catégories de poste du fichier de prospection : elles choisissent les modèles de message.
export type CategoriePoste =
  "dirigeant" | "dirigeant-adjoint" | "rse" | "rh" | "communication" | "finance" | "autre";

export const CATEGORIES_POSTE: { value: CategoriePoste; label: string }[] = [
  { value: "dirigeant", label: "Dirigeant" },
  { value: "dirigeant-adjoint", label: "Dirigeant adjoint ou fondation" },
  { value: "rse", label: "RSE / développement durable" },
  { value: "rh", label: "RH" },
  { value: "communication", label: "Communication / marketing" },
  { value: "finance", label: "Finance / gouvernance" },
  { value: "autre", label: "Autre poste" },
];

export const categorieLabel = (c: string) =>
  CATEGORIES_POSTE.find((x) => x.value === c)?.label ?? (c || "Non précisée");

export type ProspectionItem = {
  id: string;
  canal: Canal;
  etape: EtapeLinkedin;
  reponse?: Reponse;
  reponseNote: string;
  enPause: boolean;
  pauseMotif: string;
  prochaineActionDate?: string;
  modele: string;
  notes: string;
  dates: {
    invitation?: string;
    acceptee?: string;
    message?: string;
    relance1?: string;
    relance2?: string;
    relanceFinale?: string;
    reponse?: string;
  };
  updatedAt: string;
  contact: {
    id: string;
    nom: string;
    poste: string;
    categoriePoste: CategoriePoste | "";
    remarque: string;
    responsable: string;
    responsableId?: string;
    recommandePar?: string;
    linkedin?: string;
    email?: string;
    telephone?: string;
  };
  entreprise: { id: string; nom: string; contactGenerique: string };
};

export type ProspectionHistoriqueEntry = {
  id: string;
  date: string;
  action: string;
  detail: string;
  auteur: string;
};

/** Date de la dernière étape franchie (pour l'affichage « depuis le … »). */
export function derniereDate(p: ProspectionItem): string | undefined {
  const d = p.dates;
  return [d.reponse, d.relanceFinale, d.relance2, d.relance1, d.message, d.acceptee, d.invitation]
    .filter(Boolean)
    .sort()
    .pop();
}

/** Prénom pour les modèles de message (« Dr Lamia Tazi » -> « Lamia »). */
export function prenomDe(nom: string) {
  const mots = nom
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(/\s+/);
  const titres = new Set(["dr", "dr.", "m.", "mme", "mr", "pr", "pr."]);
  return mots.find((m) => !titres.has(m.toLowerCase())) ?? nom;
}

const normaliser = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Le contact est-il assigné à cet utilisateur (par compte, sinon par prénom) ? */
export function estAssigneA(
  p: ProspectionItem,
  profile: { id: string; fullName: string } | null | undefined,
) {
  if (!profile) return false;
  if (p.contact.responsableId) return p.contact.responsableId === profile.id;
  const prenom = normaliser(profile.fullName.split(" ")[0] ?? "");
  return Boolean(prenom) && normaliser(p.contact.responsable) === prenom;
}
