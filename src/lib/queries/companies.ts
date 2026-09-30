import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import {
  mapCompany,
  mapCompanyListItem,
  mapContact,
  type ContactRow,
  type EntrepriseListeRow,
  type EntrepriseRow,
} from "@/lib/mappers";
import type { Company, CompanyListItem, ContactDirectoryEntry } from "@/lib/types";
import { COMPANIES_KEY, COMPANIES_LIST_KEY, CONTACTS_KEY, PIPELINE_KEY } from "./keys";

const SELECT =
  "*, entreprise_contacts(*), entreprise_projets(projet_id), entreprise_sous_composantes(sous_composante_id)";

// Liste allégée (~4x moins de données que la version complète) : tout ce qu'il
// faut pour les listes, filtres, statistiques et cartographie. Les champs longs
// n'y figurent que sous forme d'indicateur « renseigné ou non ».
export function useCompaniesList() {
  return useQuery({
    queryKey: COMPANIES_LIST_KEY,
    queryFn: async (): Promise<CompanyListItem[]> => {
      const { data, error } = await supabase.from("entreprises_liste").select("*").order("nom");
      if (error) throw error;
      return (data as EntrepriseListeRow[]).map(mapCompanyListItem);
    },
  });
}

// Fiches complètes, champs longs inclus. Réservé aux écrans qui les affichent
// ou les exportent (tableau Entreprises, export Excel) : 1 Mo par chargement.
export function useCompanies(enabled = true) {
  return useQuery({
    queryKey: COMPANIES_KEY,
    enabled,
    queryFn: async (): Promise<Company[]> => {
      const { data, error } = await supabase.from("entreprises").select(SELECT).order("nom");
      if (error) throw error;
      return (data as EntrepriseRow[]).map(mapCompany);
    },
  });
}

// Quelques fiches complètes seulement (favoris épinglés dans le menu).
export function useCompaniesByIds(ids: string[]) {
  return useQuery({
    queryKey: [...COMPANIES_KEY, "par-ids", [...ids].sort().join(",")],
    enabled: ids.length > 0,
    queryFn: async (): Promise<{ id: string; nom: string }[]> => {
      const { data, error } = await supabase
        .from("entreprises")
        .select("id, nom")
        .in("id", ids)
        .order("nom");
      if (error) throw error;
      return data as { id: string; nom: string }[];
    },
  });
}

// Annuaire des contacts : lit la table des contacts directement au lieu de
// traverser les 304 fiches complètes.
export function useContactsDirectory(enabled = true) {
  return useQuery({
    queryKey: CONTACTS_KEY,
    enabled,
    queryFn: async (): Promise<ContactDirectoryEntry[]> => {
      const { data, error } = await supabase
        .from("entreprise_contacts")
        .select("*, entreprises!inner(nom, secteur, exclue)")
        .order("nom");
      if (error) throw error;
      type Row = ContactRow & {
        entreprise_id: string;
        entreprises: { nom: string; secteur: string; exclue: boolean };
      };
      return (data as Row[])
        .filter((r) => !r.entreprises.exclue)
        .map((r) => ({
          ...mapContact(r),
          companyId: r.entreprise_id,
          companyNom: r.entreprises.nom,
          companySecteur: r.entreprises.secteur,
        }))
        .sort((a, b) => a.companyNom.localeCompare(b.companyNom));
    },
  });
}

export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: [...COMPANIES_KEY, id],
    enabled: Boolean(id),
    queryFn: async (): Promise<Company | null> => {
      const { data, error } = await supabase
        .from("entreprises")
        .select(SELECT)
        .eq("id", id as string)
        .maybeSingle();
      if (error) throw error;
      return data ? mapCompany(data as EntrepriseRow) : null;
    },
  });
}

function toRpcPayload(id: string | null, input: Omit<Company, "id">) {
  return {
    p_id: id,
    p_nom: input.nom,
    p_groupe: input.groupe ?? "",
    p_secteur: input.secteur ?? "",
    p_pays_origine: input.paysOrigine ?? "",
    p_structure_dediee: input.structureDediee,
    p_comment_mode_acces: input.modeAcces ?? "",
    p_comment_budget: input.budgetRSE ?? "",
    p_comment_type_engagement: input.typeEngagement ?? "",
    p_quoi_descriptif: input.descriptifActivites ?? "",
    p_quoi_programmes: input.programmes ?? "",
    p_quoi_projets_finances: input.projetsFinances ?? "",
    p_quoi_notes_complementaires: input.notesComplementaires ?? "",
    p_pourquoi_alignement: input.alignementThematique ?? "",
    p_pourquoi_precedent_fort: input.precedentFort ?? "",
    p_pourquoi_proposition: input.propositionConcrete ?? "",
    p_exclue: input.exclue,
    p_raison_exclusion: input.raisonExclusion ?? "",
    p_contacts: input.contacts.map((c) => ({
      fonction: c.fonction,
      nom: c.nom,
      linkedin: c.linkedin ?? "",
      email: c.email ?? "",
      telephone: c.telephone ?? "",
    })),
    p_projet_ids: input.projets,
    p_logo_url: input.logoUrl ?? "",
    p_sous_composante_ids: input.sousComposantes,
  };
}

// Full form save (add / edit) — atomic upsert of the entreprise row plus its
// contacts and project links via the save_entreprise() Postgres function.
export function useSaveCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, company }: { id: string | null; company: Omit<Company, "id"> }) => {
      const { data, error } = await supabase.rpc("save_entreprise", toRpcPayload(id, company));
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPANIES_KEY });
      queryClient.invalidateQueries({ queryKey: CONTACTS_KEY });
      queryClient.invalidateQueries({ queryKey: PIPELINE_KEY });
    },
  });
}

// Quick single-field patch used by the inline-editable admin table.
const FIELD_TO_COLUMN = {
  nom: "nom",
  groupe: "groupe",
  secteur: "secteur",
  paysOrigine: "pays_origine",
  budgetRSE: "comment_budget",
  structureDediee: "structure_dediee",
  modeAcces: "comment_mode_acces",
  typeEngagement: "comment_type_engagement",
  descriptifActivites: "quoi_descriptif",
  programmes: "quoi_programmes",
  projetsFinances: "quoi_projets_finances",
  notesComplementaires: "quoi_notes_complementaires",
  alignementThematique: "pourquoi_alignement",
  precedentFort: "pourquoi_precedent_fort",
  propositionConcrete: "pourquoi_proposition",
  raisonExclusion: "raison_exclusion",
  exclue: "exclue",
  logoUrl: "logo_url",
} as const;

export type PatchableField = keyof typeof FIELD_TO_COLUMN;

type PatchVars = { id: string; patch: Partial<Record<PatchableField, string | boolean>> };

// Optimistic update: the inline-editable admin table fires one of these per
// keystroke-blur/select — waiting for a full 244-row refetch (with its 3
// nested joins) before the cell reflects the change made every click feel
// laggy. We patch the cached rows (list + any open detail view) immediately
// and roll back only if the write actually fails.
export function usePatchEntreprise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: PatchVars) => {
      const payload: Record<string, string | boolean> = {};
      for (const [field, value] of Object.entries(patch)) {
        payload[FIELD_TO_COLUMN[field as PatchableField]] = value as string | boolean;
      }
      const { error } = await supabase.from("entreprises").update(payload).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, patch }: PatchVars) => {
      await queryClient.cancelQueries({ queryKey: COMPANIES_KEY });
      const previous = queryClient.getQueriesData<Company[] | Company | null>({
        queryKey: COMPANIES_KEY,
      });
      const apply = (c: Company): Company => (c.id === id ? ({ ...c, ...patch } as Company) : c);
      queryClient.setQueriesData<Company[] | Company | null>({ queryKey: COMPANIES_KEY }, (data) =>
        Array.isArray(data) ? data.map(apply) : data && data.id === id ? apply(data) : data,
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPANIES_KEY });
      queryClient.invalidateQueries({ queryKey: CONTACTS_KEY });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("entreprises").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: COMPANIES_KEY });
      const previous = queryClient.getQueryData<Company[]>(COMPANIES_KEY);
      queryClient.setQueryData<Company[]>(COMPANIES_KEY, (data) =>
        data?.filter((c) => c.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(COMPANIES_KEY, context.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPANIES_KEY });
      queryClient.invalidateQueries({ queryKey: CONTACTS_KEY });
      queryClient.invalidateQueries({ queryKey: PIPELINE_KEY });
    },
  });
}

// Targeted single-link writes for the mind map — deliberately not routed
// through save_entreprise(), which replaces ALL of an entreprise's project
// links wholesale and would wipe out its other associations.
export function useAddEntrepriseProjet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ entrepriseId, projetId }: { entrepriseId: string; projetId: string }) => {
      const { error } = await supabase
        .from("entreprise_projets")
        .insert({ entreprise_id: entrepriseId, projet_id: projetId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPANIES_KEY });
      queryClient.invalidateQueries({ queryKey: CONTACTS_KEY });
    },
  });
}

export function useRemoveEntrepriseProjet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ entrepriseId, projetId }: { entrepriseId: string; projetId: string }) => {
      const { error } = await supabase
        .from("entreprise_projets")
        .delete()
        .eq("entreprise_id", entrepriseId)
        .eq("projet_id", projetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPANIES_KEY });
      queryClient.invalidateQueries({ queryKey: CONTACTS_KEY });
    },
  });
}
