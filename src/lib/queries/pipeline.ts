import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { mapHistorique, mapPipeline, type HistoriqueRow, type PipelineRow } from "@/lib/mappers";
import {
  STATUTS,
  TYPES_ECHANGE,
  type HistoriqueEntry,
  type PipelineDocument,
  type PipelineItem,
  type PipelineStatut,
  type Priorite,
} from "@/lib/types";
import { DOCUMENTS_KEY, PIPELINE_KEY } from "./keys";

type HistoriqueRawRow = HistoriqueRow & { entreprise_id: string };

const today = () => new Date().toISOString().slice(0, 10);
const statutLabel = (s: PipelineStatut) => STATUTS.find((x) => x.value === s)?.label ?? s;

// Compteur de relances en retard pour la pastille du menu : une requête
// « count » sans aucune ligne transférée, présente sur toutes les pages.
export function useOverdueCount() {
  return useQuery({
    queryKey: [...PIPELINE_KEY, "retards"],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from("pipeline")
        .select("entreprise_id", { count: "exact", head: true })
        .lt("prochaine_action_date", today())
        .not("statut", "in", "(partenariat-signe,sans-suite)");
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function usePipeline() {
  return useQuery({
    queryKey: PIPELINE_KEY,
    queryFn: async (): Promise<PipelineItem[]> => {
      const [{ data: rows, error }, { data: histRows, error: histError }] = await Promise.all([
        supabase.from("pipeline").select("*"),
        supabase
          .from("pipeline_historique")
          .select("id, date, type, resume, auteur, entreprise_id, created_at")
          .order("date", { ascending: false })
          .order("created_at", { ascending: false }),
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

export type PipelinePatch = Partial<{
  motifSansSuite: string;
  priorite: Priorite;
  responsable: string;
  responsableId: string | null;
  prochaineAction: string;
  prochaineActionDate: string | null;
  montantVise: number | null;
  montantObtenu: number | null;
  projetCibleId: string | null;
}>;

const PATCH_COLUMNS: Record<keyof PipelinePatch, string> = {
  motifSansSuite: "motif_sans_suite",
  priorite: "priorite",
  responsable: "responsable",
  responsableId: "responsable_id",
  prochaineAction: "prochaine_action",
  prochaineActionDate: "prochaine_action_date",
  montantVise: "montant_vise",
  montantObtenu: "montant_obtenu",
  projetCibleId: "projet_cible_id",
};

function toPayload(patch: PipelinePatch) {
  const payload: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) payload[PATCH_COLUMNS[k as keyof PipelinePatch]] = v;
  }
  return payload;
}

// Applique un patch au cache tout de suite (retour visuel immédiat) ; la
// valeur null efface le champ côté client comme côté base.
function applyPatch(p: PipelineItem, patch: PipelinePatch & { statut?: PipelineStatut }) {
  const next: Record<string, unknown> = { ...p };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete next[k];
    else if (v !== undefined) next[k] = v;
  }
  return next as PipelineItem;
}

function useOptimistic() {
  const queryClient = useQueryClient();
  return {
    queryClient,
    async patchCache(companyId: string, patch: PipelinePatch & { statut?: PipelineStatut }) {
      await queryClient.cancelQueries({ queryKey: PIPELINE_KEY });
      const previous = queryClient.getQueryData<PipelineItem[]>(PIPELINE_KEY);
      queryClient.setQueryData<PipelineItem[]>(PIPELINE_KEY, (data) =>
        data?.map((p) => (p.companyId === companyId ? applyPatch(p, patch) : p)),
      );
      return { previous };
    },
    rollback(context: { previous?: PipelineItem[] | undefined } | undefined) {
      if (context?.previous) queryClient.setQueryData(PIPELINE_KEY, context.previous);
    },
  };
}

// Champs d'un dossier (hors statut) : priorité, responsable, relance, montants…
export function useUpdatePipelineEntry() {
  const { queryClient, patchCache, rollback } = useOptimistic();
  return useMutation({
    mutationFn: async ({ companyId, patch }: { companyId: string; patch: PipelinePatch }) => {
      const { error } = await supabase
        .from("pipeline")
        .update(toPayload(patch))
        .eq("entreprise_id", companyId);
      if (error) throw error;
    },
    onMutate: ({ companyId, patch }) => patchCache(companyId, patch),
    onError: (_e, _v, context) => rollback(context),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PIPELINE_KEY }),
  });
}

// Changement d'étape : toujours tracé dans l'historique avec son auteur, ce
// qui permet ensuite de mesurer le temps passé dans chaque étape.
export function useMoveStatut() {
  const { queryClient, patchCache, rollback } = useOptimistic();
  return useMutation({
    mutationFn: async ({
      companyId,
      from,
      to,
      auteur,
      motif,
    }: {
      companyId: string;
      from: PipelineStatut;
      to: PipelineStatut;
      auteur: string;
      motif?: string;
    }) => {
      if (from === to) return;
      const { error } = await supabase
        .from("pipeline")
        .update({ statut: to, ...(motif !== undefined ? { motif_sans_suite: motif } : {}) })
        .eq("entreprise_id", companyId);
      if (error) throw error;
      const { error: hErr } = await supabase.from("pipeline_historique").insert({
        entreprise_id: companyId,
        date: today(),
        type: "Statut",
        resume: `${statutLabel(from)} → ${statutLabel(to)}${motif ? ` (${motif})` : ""}`,
        auteur,
      });
      if (hErr) throw hErr;
    },
    onMutate: ({ companyId, to }) =>
      patchCache(companyId, {
        statut: to,
        ...({ statutDepuis: new Date().toISOString() } as object),
      }),
    onError: (_e, _v, context) => rollback(context),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PIPELINE_KEY }),
  });
}

// Échange avec l'entreprise (appel, email, réunion…) + relance suivante en une
// seule action. Seuls les vrais échanges mettent à jour « dernier contact ».
export function useAddHistorique() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      companyId,
      entry,
      next,
    }: {
      companyId: string;
      entry: Omit<HistoriqueEntry, "id">;
      next?: { action: string; date: string | null } | undefined;
    }) => {
      const { error: histError } = await supabase.from("pipeline_historique").insert({
        entreprise_id: companyId,
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
        const { error } = await supabase
          .from("pipeline")
          .update(update)
          .eq("entreprise_id", companyId);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PIPELINE_KEY }),
  });
}

/* ----------------------------- Pièces jointes ----------------------------- */

const BUCKET = "pieces-jointes";

type DocumentRow = {
  id: string;
  entreprise_id: string;
  nom: string;
  chemin: string;
  taille: number | null;
  type_mime: string | null;
  auteur: string;
  created_at: string;
};

export function usePipelineDocuments(companyId: string | undefined) {
  return useQuery({
    queryKey: [...DOCUMENTS_KEY, companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<PipelineDocument[]> => {
      const { data, error } = await supabase
        .from("pipeline_documents")
        .select("*")
        .eq("entreprise_id", companyId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as DocumentRow[]).map((d) => ({
        id: d.id,
        companyId: d.entreprise_id,
        nom: d.nom,
        chemin: d.chemin,
        ...(d.taille != null ? { taille: d.taille } : {}),
        ...(d.type_mime ? { typeMime: d.type_mime } : {}),
        auteur: d.auteur,
        createdAt: d.created_at,
      }));
    },
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      companyId,
      file,
      auteur,
    }: {
      companyId: string;
      file: File;
      auteur: string;
    }) => {
      const safe = file.name
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^\w.-]+/g, "_");
      const chemin = `${companyId}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(chemin, file, {
        contentType: file.type || "application/octet-stream",
      });
      if (upErr) throw upErr;
      const { error } = await supabase.from("pipeline_documents").insert({
        entreprise_id: companyId,
        nom: file.name,
        chemin,
        taille: file.size,
        type_mime: file.type || null,
        auteur,
      });
      if (error) {
        await supabase.storage.from(BUCKET).remove([chemin]);
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY }),
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (doc: PipelineDocument) => {
      const { error } = await supabase.from("pipeline_documents").delete().eq("id", doc.id);
      if (error) throw error;
      await supabase.storage.from(BUCKET).remove([doc.chemin]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY }),
  });
}

export async function openDocument(doc: PipelineDocument) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.chemin, 60);
  if (error) throw error;
  window.open(data.signedUrl, "_blank", "noopener");
}
