import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { mapSousComposante, type SousComposanteRow } from "@/lib/mappers";
import type { SousComposante } from "@/lib/types";
import { COMPANIES_KEY, SOUS_COMPOSANTES_KEY } from "./keys";

export function useSousComposantes() {
  return useQuery({
    queryKey: SOUS_COMPOSANTES_KEY,
    queryFn: async (): Promise<SousComposante[]> => {
      const { data, error } = await supabase.from("sous_composantes").select("*").order("ordre");
      if (error) throw error;
      return (data as SousComposanteRow[]).map(mapSousComposante);
    },
  });
}

export function useCreateSousComposante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      projetId: string;
      nom: string;
      description?: string;
      icone: string;
    }) => {
      const { error } = await supabase.from("sous_composantes").insert({
        projet_id: input.projetId,
        nom: input.nom,
        description: input.description ?? "",
        icone: input.icone,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SOUS_COMPOSANTES_KEY }),
  });
}

export function useUpdateSousComposante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      nom,
      description,
      icone,
    }: {
      id: string;
      nom?: string;
      description?: string;
      icone?: string;
    }) => {
      const payload: Record<string, string> = {};
      if (nom !== undefined) payload["nom"] = nom;
      if (description !== undefined) payload["description"] = description;
      if (icone !== undefined) payload["icone"] = icone;
      const { error } = await supabase.from("sous_composantes").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SOUS_COMPOSANTES_KEY }),
  });
}

export function useDeleteSousComposante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sous_composantes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SOUS_COMPOSANTES_KEY });
      // A deleted sous-composante cascades entreprise_sous_composantes too.
      queryClient.invalidateQueries({ queryKey: COMPANIES_KEY });
    },
  });
}
