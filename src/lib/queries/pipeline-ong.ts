import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import {
  mapHistorique,
  mapOngPipeline,
  type HistoriqueRow,
  type PipelineOngRow,
} from "@/lib/mappers";
import {
  STATUTS_ONG,
  TYPES_ECHANGE,
  type HistoriqueEntry,
  type OngPipelineItem,
  type OngPipelineStatut,
} from "@/lib/types";
import { PIPELINE_ONG_KEY } from "./keys";

type HistoriqueRawRow = HistoriqueRow & { ong_id: string };

const today = () => new Date().toISOString().slice(0, 10);
const statutLabel = (s: OngPipelineStatut) => STATUTS_ONG.find((x) => x.value === s)?.label ?? s;

// Statuts clos : plus de relance à attendre.
export const STATUTS_ONG_CLOS: OngPipelineStatut[] = ["partenaire-actif", "sans-suite"];

// Pastille du menu : relances ONG en retard (requête « count » sans ligne transférée).
export function useOngOverdueCount() {
  return useQuery({
    queryKey: [...PIPELINE_ONG_KEY, "retards"],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from("pipeline_ong")
        .select("ong_id", { count: "exact", head: true })
        .lt("prochaine_action_date", today())
        .not("statut", "in", `(${STATUTS_ONG_CLOS.join(",")})`);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useOngPipeline() {
  return useQuery({
    queryKey: PIPELINE_ONG_KEY,
    queryFn: async (): Promise<OngPipelineItem[]> => {
      const [{ data: rows, error }, { data: histRows, error: histError }] = await Promise.all([
        supabase.from("pipeline_ong").select("*"),
        supabase
          .from("pipeline_ong_historique")
          .select("id, date, type, resume, auteur, ong_id, created_at")
          .order("date", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);
      if (error) throw error;
      if (histError) throw histError;

      const byOng = new Map<string, HistoriqueEntry[]>();
      for (const row of (histRows ?? []) as HistoriqueRawRow[]) {
        const list = byOng.get(row.ong_id) ?? [];
        list.push(mapHistorique(row));
        byOng.set(row.ong_id, list);
      }
      return ((rows ?? []) as PipelineOngRow[]).map((row) =>
        mapOngPipeline(row, byOng.get(row.ong_id) ?? []),
      );
    },
  });
}

export type OngPipelinePatch = Partial<{
  motifSansSuite: string;
  responsable: string;
  responsableId: string | null;
  prochaineAction: string;
  prochaineActionDate: string | null;
  contactInterne: string;
}>;

const PATCH_COLUMNS: Record<keyof OngPipelinePatch, string> = {
  motifSansSuite: "motif_sans_suite",
  responsable: "responsable",
  responsableId: "responsable_id",
  prochaineAction: "prochaine_action",
  prochaineActionDate: "prochaine_action_date",
  contactInterne: "contact_interne",
};

function toPayload(patch: OngPipelinePatch) {
  const payload: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) payload[PATCH_COLUMNS[k as keyof OngPipelinePatch]] = v;
  }
  return payload;
}

function applyPatch(p: OngPipelineItem, patch: Record<string, unknown>) {
  const next: Record<string, unknown> = { ...p };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete next[k];
    else if (v !== undefined) next[k] = v;
  }
  return next as OngPipelineItem;
}

function useOptimistic() {
  const queryClient = useQueryClient();
  return {
    queryClient,
    async patchCache(ongId: string, patch: Record<string, unknown>) {
      await queryClient.cancelQueries({ queryKey: PIPELINE_ONG_KEY });
      const previous = queryClient.getQueryData<OngPipelineItem[]>(PIPELINE_ONG_KEY);
      queryClient.setQueryData<OngPipelineItem[]>(PIPELINE_ONG_KEY, (data) =>
        data?.map((p) => (p.ongId === ongId ? applyPatch(p, patch) : p)),
      );
      return { previous };
    },
    rollback(context: { previous?: OngPipelineItem[] | undefined } | undefined) {
      if (context?.previous) queryClient.setQueryData(PIPELINE_ONG_KEY, context.previous);
    },
  };
}

// Champs du suivi (hors statut) : responsable, relance, contact interne…
export function useUpdateOngPipelineEntry() {
  const { queryClient, patchCache, rollback } = useOptimistic();
  return useMutation({
    mutationFn: async ({ ongId, patch }: { ongId: string; patch: OngPipelinePatch }) => {
      const { error } = await supabase
        .from("pipeline_ong")
        .update(toPayload(patch))
        .eq("ong_id", ongId);
      if (error) throw error;
    },
    onMutate: ({ ongId, patch }) => patchCache(ongId, patch),
    onError: (_e, _v, context) => rollback(context),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PIPELINE_ONG_KEY }),
  });
}

// Changement d'étape : toujours tracé dans l'historique avec son auteur.
export function useMoveOngStatut() {
  const { queryClient, patchCache, rollback } = useOptimistic();
  return useMutation({
    mutationFn: async ({
      ongId,
      from,
      to,
      auteur,
      motif,
    }: {
      ongId: string;
      from: OngPipelineStatut;
      to: OngPipelineStatut;
      auteur: string;
      motif?: string;
    }) => {
      if (from === to) return;
      const { error } = await supabase
        .from("pipeline_ong")
        .update({ statut: to, ...(motif !== undefined ? { motif_sans_suite: motif } : {}) })
        .eq("ong_id", ongId);
      if (error) throw error;
      const { error: hErr } = await supabase.from("pipeline_ong_historique").insert({
        ong_id: ongId,
        date: today(),
        type: "Statut",
        resume: `${statutLabel(from)} → ${statutLabel(to)}${motif ? ` (${motif})` : ""}`,
        auteur,
      });
      if (hErr) throw hErr;
    },
    onMutate: ({ ongId, to }) => patchCache(ongId, { statut: to, statutDepuis: today() }),
    onError: (_e, _v, context) => rollback(context),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PIPELINE_ONG_KEY }),
  });
}

// Échange avec l'ONG + relance suivante en une action. Seuls les vrais
// échanges mettent à jour « dernier contact ».
export function useAddOngHistorique() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ongId,
      entry,
      next,
    }: {
      ongId: string;
      entry: Omit<HistoriqueEntry, "id">;
      next?: { action: string; date: string | null } | undefined;
    }) => {
      const { error: histError } = await supabase.from("pipeline_ong_historique").insert({
        ong_id: ongId,
        date: entry.date,
        type: entry.type,
        resume: entry.resume,
        auteur: entry.auteur,
      });
      if (histError) throw histError;

      const update: Record<string, unknown> = {};
      if ((TYPES_ECHANGE as readonly string[]).includes(entry.type))
        update["dernier_contact"] = entry.date;
      if (next) {
        update["prochaine_action"] = next.action;
        update["prochaine_action_date"] = next.date;
      }
      if (Object.keys(update).length) {
        const { error } = await supabase.from("pipeline_ong").update(update).eq("ong_id", ongId);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PIPELINE_ONG_KEY }),
  });
}
