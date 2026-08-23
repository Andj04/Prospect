import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { mapImportBatch, type ImportBatchRow } from "@/lib/mappers";
import type { ImportBatch } from "@/lib/types";
import { COMPANIES_KEY, IMPORT_BATCHES_KEY } from "./keys";

export function useImportBatches() {
  return useQuery({
    queryKey: IMPORT_BATCHES_KEY,
    queryFn: async (): Promise<ImportBatch[]> => {
      const { data, error } = await supabase.from("import_batches").select("*").order("created_at");
      if (error) throw error;
      return (data as ImportBatchRow[]).map(mapImportBatch);
    },
  });
}

export function useRenameImportBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, label }: { id: string; label: string }) => {
      const { error } = await supabase.from("import_batches").update({ label }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IMPORT_BATCHES_KEY });
      // Table headers derive the batch label from the joined entreprises list too.
      queryClient.invalidateQueries({ queryKey: COMPANIES_KEY });
    },
  });
}
