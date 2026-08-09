import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { mapCompany, type EntrepriseRow } from "@/lib/mappers";
import type { Company } from "@/lib/types";
import { COMPANIES_KEY, PIPELINE_KEY } from "./keys";

const SELECT = "*, entreprise_contacts(*), entreprise_projets(projet_id)";

export function useCompanies() {
  return useQuery({
    queryKey: COMPANIES_KEY,
    queryFn: async (): Promise<Company[]> => {
      const { data, error } = await supabase.from("entreprises").select(SELECT).order("nom");
      if (error) throw error;
      return (data as EntrepriseRow[]).map(mapCompany);
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
      queryClient.invalidateQueries({ queryKey: PIPELINE_KEY });
    },
  });
}

// Quick single-field patch used by the inline-editable admin table.
const FIELD_TO_COLUMN = {
  nom: "nom",
  groupe: "groupe",
  secteur: "secteur",
  budgetRSE: "comment_budget",
  structureDediee: "structure_dediee",
} as const;

export type PatchableField = keyof typeof FIELD_TO_COLUMN;

export function usePatchEntreprise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      field,
      value,
    }: {
      id: string;
      field: PatchableField;
      value: string | boolean;
    }) => {
      const column = FIELD_TO_COLUMN[field];
      const { error } = await supabase
        .from("entreprises")
        .update({ [column]: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COMPANIES_KEY }),
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("entreprises").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPANIES_KEY });
      queryClient.invalidateQueries({ queryKey: PIPELINE_KEY });
    },
  });
}
