import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import type {
  Canal,
  CategoriePoste,
  ContactCampagne,
  EtapeLinkedin,
  ProspectionHistoriqueEntry,
  ProspectionItem,
  Reponse,
} from "@/lib/prospection";
import { CONTACTS_KEY, PIPELINE_KEY, PROSPECTION_KEY } from "./keys";

type Row = {
  id: string;
  canal: Canal;
  etape: EtapeLinkedin;
  reponse: Reponse | null;
  reponse_note: string;
  en_pause: boolean;
  pause_motif: string;
  prochaine_action_date: string | null;
  modele: string;
  notes: string;
  invitation_le: string | null;
  acceptee_le: string | null;
  message_le: string | null;
  relance1_le: string | null;
  relance2_le: string | null;
  relance_finale_le: string | null;
  reponse_le: string | null;
  updated_at: string;
  contact: {
    id: string;
    nom: string;
    poste: string;
    categorie_poste: string;
    remarque: string;
    responsable: string;
    responsable_id: string | null;
    recommande_par: string | null;
    linkedin: string | null;
    email: string | null;
    telephone: string | null;
    entreprise: { id: string; nom: string; contact_generique: string; exclue: boolean };
  };
};

const SELECT = `*, contact:entreprise_contacts!inner(
  id, nom, poste, categorie_poste, remarque, responsable, responsable_id, recommande_par,
  linkedin, email, telephone,
  entreprise:entreprises!inner(id, nom, contact_generique, exclue)
)`;

const opt = <T>(v: T | null | undefined) => (v == null || v === "" ? undefined : v);

function mapRow(r: Row): ProspectionItem {
  const c = r.contact;
  return {
    id: r.id,
    canal: r.canal,
    etape: r.etape,
    ...(r.reponse ? { reponse: r.reponse } : {}),
    reponseNote: r.reponse_note,
    enPause: r.en_pause,
    pauseMotif: r.pause_motif,
    ...(r.prochaine_action_date ? { prochaineActionDate: r.prochaine_action_date } : {}),
    modele: r.modele,
    notes: r.notes,
    dates: Object.fromEntries(
      Object.entries({
        invitation: opt(r.invitation_le),
        acceptee: opt(r.acceptee_le),
        message: opt(r.message_le),
        relance1: opt(r.relance1_le),
        relance2: opt(r.relance2_le),
        relanceFinale: opt(r.relance_finale_le),
        reponse: opt(r.reponse_le),
      }).filter(([, v]) => v),
    ) as ProspectionItem["dates"],
    updatedAt: r.updated_at,
    contact: {
      id: c.id,
      nom: c.nom,
      poste: c.poste,
      categoriePoste: (c.categorie_poste as CategoriePoste) || "",
      remarque: c.remarque,
      responsable: c.responsable,
      ...(c.responsable_id ? { responsableId: c.responsable_id } : {}),
      ...(c.recommande_par ? { recommandePar: c.recommande_par } : {}),
      ...(c.linkedin ? { linkedin: c.linkedin } : {}),
      ...(c.email ? { email: c.email } : {}),
      ...(c.telephone ? { telephone: c.telephone } : {}),
    },
    entreprise: {
      id: c.entreprise.id,
      nom: c.entreprise.nom,
      contactGenerique: c.entreprise.contact_generique,
    },
  };
}

// Tout le suivi d'un canal (environ 500 lignes pour LinkedIn), contacts et
// entreprises inclus. Les entreprises exclues de la prospection sont écartées.
export function useProspection(canal: Canal) {
  return useQuery({
    queryKey: [...PROSPECTION_KEY, canal],
    queryFn: async (): Promise<ProspectionItem[]> => {
      const all: Row[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from("prospection_contacts")
          .select(SELECT)
          .eq("canal", canal)
          .range(from, from + 999);
        if (error) throw error;
        all.push(...(data as unknown as Row[]));
        if (data.length < 1000) break;
      }
      return all.filter((r) => !r.contact.entreprise.exclue).map(mapRow);
    },
  });
}

/** Tous les contacts des entreprises (personnes et canaux génériques), avec ou sans suivi. */
export function useContactsCampagne() {
  return useQuery({
    queryKey: [...PROSPECTION_KEY, "contacts"],
    queryFn: async (): Promise<ContactCampagne[]> => {
      type ContactRow = {
        id: string;
        entreprise_id: string;
        nom: string;
        poste: string;
        remarque: string;
        responsable: string;
        linkedin: string | null;
        email: string | null;
        telephone: string | null;
        entreprise: { nom: string; exclue: boolean };
      };
      const all: ContactRow[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from("entreprise_contacts")
          .select(
            "id, entreprise_id, nom, poste, remarque, responsable, linkedin, email, telephone, entreprise:entreprises!inner(nom, exclue)",
          )
          .order("id")
          .range(from, from + 999);
        if (error) throw error;
        all.push(...(data as unknown as ContactRow[]));
        if (data.length < 1000) break;
      }
      return all
        .filter((r) => !r.entreprise.exclue)
        .map((r) => ({
          id: r.id,
          entrepriseId: r.entreprise_id,
          entrepriseNom: r.entreprise.nom,
          nom: r.nom.trim(),
          poste: r.poste,
          remarque: r.remarque,
          responsable: r.responsable,
          ...(r.linkedin ? { linkedin: r.linkedin } : {}),
          ...(r.email ? { email: r.email } : {}),
          ...(r.telephone ? { telephone: r.telephone } : {}),
        }));
    },
  });
}

export function useProspectionHistorique(contactId: string | undefined) {
  return useQuery({
    queryKey: [...PROSPECTION_KEY, "historique", contactId],
    enabled: Boolean(contactId),
    queryFn: async (): Promise<ProspectionHistoriqueEntry[]> => {
      const { data, error } = await supabase
        .from("prospection_historique")
        .select("id, date, action, detail, auteur, created_at")
        .eq("contact_id", contactId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProspectionHistoriqueEntry[];
    },
  });
}

export type ProspectionPatch = Partial<{
  etape: EtapeLinkedin;
  reponse: Reponse | null;
  reponseNote: string;
  enPause: boolean;
  pauseMotif: string;
  prochaineActionDate: string | null;
  modele: string;
  notes: string;
}>;

const COLUMNS: Record<keyof ProspectionPatch, string> = {
  etape: "etape",
  reponse: "reponse",
  reponseNote: "reponse_note",
  enPause: "en_pause",
  pauseMotif: "pause_motif",
  prochaineActionDate: "prochaine_action_date",
  modele: "modele",
  notes: "notes",
};

const toPayload = (patch: ProspectionPatch) =>
  Object.fromEntries(
    Object.entries(patch)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [COLUMNS[k as keyof ProspectionPatch], v]),
  );

const today = () => new Date().toISOString().slice(0, 10);

// Ce que la base remplit elle-même (date de l'étape, passage à « Répondu ») est
// reproduit tout de suite à l'écran pour que le clic paraisse instantané.
function applyPatch(p: ProspectionItem, patch: ProspectionPatch): ProspectionItem {
  const next: ProspectionItem = { ...p, dates: { ...p.dates } };
  if (patch.etape && patch.etape !== p.etape) {
    next.etape = patch.etape;
    const key = {
      "invitation-envoyee": "invitation",
      acceptee: "acceptee",
      "message-envoye": "message",
      "relance-1": "relance1",
      "relance-2": "relance2",
      "relance-finale": "relanceFinale",
    }[patch.etape as string] as keyof ProspectionItem["dates"] | undefined;
    if (key && !next.dates[key]) next.dates[key] = today();
  }
  if (patch.reponse !== undefined) {
    if (patch.reponse) {
      next.reponse = patch.reponse;
      next.dates.reponse = next.dates.reponse ?? today();
      if (next.etape !== "sans-suite") next.etape = "repondu";
    } else delete next.reponse;
  }
  if (patch.reponseNote !== undefined) next.reponseNote = patch.reponseNote;
  if (patch.enPause !== undefined) next.enPause = patch.enPause;
  if (patch.pauseMotif !== undefined) next.pauseMotif = patch.pauseMotif;
  if (patch.prochaineActionDate !== undefined) {
    if (patch.prochaineActionDate) next.prochaineActionDate = patch.prochaineActionDate;
    else delete next.prochaineActionDate;
  }
  if (patch.modele !== undefined) next.modele = patch.modele;
  if (patch.notes !== undefined) next.notes = patch.notes;
  return next;
}

/** Met à jour une ou plusieurs lignes de suivi (même modification). */
export function useUpdateProspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, patch }: { ids: string[]; patch: ProspectionPatch }) => {
      const { error } = await supabase
        .from("prospection_contacts")
        .update(toPayload(patch))
        .in("id", ids);
      if (error) throw error;
    },
    onMutate: async ({ ids, patch }) => {
      await queryClient.cancelQueries({ queryKey: PROSPECTION_KEY });
      const previous = queryClient.getQueriesData<ProspectionItem[]>({ queryKey: PROSPECTION_KEY });
      const set = new Set(ids);
      queryClient.setQueriesData<ProspectionItem[]>({ queryKey: PROSPECTION_KEY }, (data) =>
        Array.isArray(data) ? data.map((p) => (set.has(p.id) ? applyPatch(p, patch) : p)) : data,
      );
      return { previous };
    },
    onError: (_e, _v, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSuccess: () => {
      // Les automatismes de la base ont pu changer le pipeline de l'entreprise.
      void queryClient.invalidateQueries({ queryKey: PIPELINE_KEY });
      void queryClient.invalidateQueries({ queryKey: PROSPECTION_KEY, refetchType: "none" });
    },
  });
}

/** Redirection : crée le contact recommandé, rattaché à la même entreprise. */
export function useCreerContactRecommande() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (v: { sourceId: string; nom: string; poste: string; linkedin: string }) => {
      const { data, error } = await supabase.rpc("creer_contact_recommande", {
        p_source: v.sourceId,
        p_nom: v.nom,
        p_poste: v.poste,
        p_linkedin: v.linkedin,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROSPECTION_KEY });
      void queryClient.invalidateQueries({ queryKey: CONTACTS_KEY });
    },
  });
}

/** Assigne des contacts à un responsable (réservé aux admins par la base). */
export function useAssignerContacts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      contactIds: string[];
      responsable: string;
      responsableId: string | null;
    }) => {
      const { error } = await supabase
        .from("entreprise_contacts")
        .update({ responsable: v.responsable, responsable_id: v.responsableId })
        .in("id", v.contactIds);
      if (error) throw error;
    },
    onMutate: async (v) => {
      await queryClient.cancelQueries({ queryKey: PROSPECTION_KEY });
      const previous = queryClient.getQueriesData<ProspectionItem[]>({ queryKey: PROSPECTION_KEY });
      const set = new Set(v.contactIds);
      queryClient.setQueriesData<ProspectionItem[]>({ queryKey: PROSPECTION_KEY }, (data) =>
        Array.isArray(data)
          ? data.map((p) => {
              if (!set.has(p.contact.id)) return p;
              const { responsableId: _old, ...contact } = p.contact;
              return {
                ...p,
                contact: {
                  ...contact,
                  responsable: v.responsable,
                  ...(v.responsableId ? { responsableId: v.responsableId } : {}),
                },
              };
            })
          : data,
      );
      return { previous };
    },
    onError: (_e, _v, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
  });
}
