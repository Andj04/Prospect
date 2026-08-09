import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { mapHistorique, mapPipeline, type HistoriqueRow, type PipelineRow } from "@/lib/mappers";
import type { HistoriqueEntry, PipelineItem, Priorite, PipelineStatut } from "@/lib/types";
import { PIPELINE_KEY } from "./keys";

type HistoriqueRawRow = HistoriqueRow & { entreprise_id: string };

export function usePipeline() {
  return useQuery({
    queryKey: PIPELINE_KEY,
    queryFn: async (): Promise<PipelineItem[]> => {
      const [{ data: rows, error }, { data: histRows, error: histError }] = await Promise.all([
        supabase.from("pipeline").select("*"),
        supabase
          .from("pipeline_historique")
          .select("id, date, type, resume, auteur, entreprise_id")
          .order("date", { ascending: false }),
      ]);
      if (error) throw error;
      if (histError) throw histError;

      const historiqueByCompany = new Map<string, HistoriqueEntry[]>();
      for (const row of (histRows ?? []) as HistoriqueRawRow[]) {
        const list = historiqueByCompany.get(row.entreprise_id) ?? [];
        list.push(mapHistorique(row));
        historiqueByCompany.set(row.entreprise_id, list);
      }

      return ((rows ?? []) as PipelineRow[]).map((row) =>
        mapPipeline(row, historiqueByCompany.get(row.entreprise_id) ?? []),
      );
    },
  });
}

type PipelinePatch = Partial<{
  statut: PipelineStatut;
  motifSansSuite: string;
  priorite: Priorite;
  responsable: string;
  dernierContact: string;
  prochaineAction: string;
}>;

export function useUpdatePipelineEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, patch }: { companyId: string; patch: PipelinePatch }) => {
      const payload: Record<string, unknown> = {};
      if (patch.statut !== undefined) payload["statut"] = patch.statut;
      if (patch.motifSansSuite !== undefined) payload["motif_sans_suite"] = patch.motifSansSuite;
      if (patch.priorite !== undefined) payload["priorite"] = patch.priorite;
      if (patch.responsable !== undefined) payload["responsable"] = patch.responsable;
      if (patch.dernierContact !== undefined) payload["dernier_contact"] = patch.dernierContact;
      if (patch.prochaineAction !== undefined) payload["prochaine_action"] = patch.prochaineAction;

      const { error } = await supabase
        .from("pipeline")
        .update(payload)
        .eq("entreprise_id", companyId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PIPELINE_KEY }),
  });
}

export function useAddHistorique() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      companyId,
      entry,
    }: {
      companyId: string;
      entry: Omit<HistoriqueEntry, "id">;
    }) => {
      const { error: histError } = await supabase.from("pipeline_historique").insert({
        entreprise_id: companyId,
        date: entry.date,
        type: entry.type,
        resume: entry.resume,
        auteur: entry.auteur,
      });
      if (histError) throw histError;

      const { error: pipelineError } = await supabase
        .from("pipeline")
        .update({ dernier_contact: entry.date })
        .eq("entreprise_id", companyId);
      if (pipelineError) throw pipelineError;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PIPELINE_KEY }),
  });
}
