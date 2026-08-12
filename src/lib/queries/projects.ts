import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { mapProjet, type ProjetRow } from "@/lib/mappers";
import type { Projet } from "@/lib/types";
import { ALL_PROJETS_KEY, PROJETS_KEY } from "./keys";

// Active projects only — used for every *selection* surface (formulaire
// entreprise, filtres, sélecteurs de la cartographie, génération de la mind
// map).
export function useProjects() {
  return useQuery({
    queryKey: PROJETS_KEY,
    queryFn: async (): Promise<Projet[]> => {
      const { data, error } = await supabase
        .from("projets")
        .select("*")
        .eq("actif", true)
        .order("ordre");
      if (error) throw error;
      return (data as ProjetRow[]).map(mapProjet);
    },
  });
}

// All projects (active + inactive) — used wherever an *existing* link needs
// a readable label (badges, fiche, page /projets) so a deactivated project
// never falls back to a raw id.
export function useAllProjects() {
  return useQuery({
    queryKey: ALL_PROJETS_KEY,
    queryFn: async (): Promise<Projet[]> => {
      const { data, error } = await supabase.from("projets").select("*").order("ordre");
      if (error) throw error;
      return (data as ProjetRow[]).map(mapProjet);
    },
  });
}

function invalidateProjects(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: PROJETS_KEY });
  queryClient.invalidateQueries({ queryKey: ALL_PROJETS_KEY });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ nom, description }: { nom: string; description?: string }) => {
      const { error } = await supabase
        .from("projets")
        .insert({ nom, description: description ?? "" });
      if (error) throw error;
    },
    onSuccess: () => invalidateProjects(queryClient),
  });
}

// No hard delete for projects — a project already linked to entreprises
// must never disappear, only be toggled inactive.
export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      nom,
      description,
      actif,
    }: {
      id: string;
      nom?: string;
      description?: string;
      actif?: boolean;
    }) => {
      const payload: Record<string, string | boolean> = {};
      if (nom !== undefined) payload["nom"] = nom;
      if (description !== undefined) payload["description"] = description;
      if (actif !== undefined) payload["actif"] = actif;
      const { error } = await supabase.from("projets").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateProjects(queryClient),
  });
}
