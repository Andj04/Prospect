import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { mapProjet, type ProjetRow } from "@/lib/mappers";
import type { Projet } from "@/lib/types";
import { PROJETS_KEY } from "./keys";

export function useProjects() {
  return useQuery({
    queryKey: PROJETS_KEY,
    queryFn: async (): Promise<Projet[]> => {
      const { data, error } = await supabase.from("projets").select("*").order("ordre");
      if (error) throw error;
      return (data as ProjetRow[]).map(mapProjet);
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (nom: string) => {
      const { error } = await supabase.from("projets").insert({ nom });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROJETS_KEY }),
  });
}

export function useRenameProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, nom }: { id: string; nom: string }) => {
      const { error } = await supabase.from("projets").update({ nom }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROJETS_KEY }),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROJETS_KEY }),
  });
}
