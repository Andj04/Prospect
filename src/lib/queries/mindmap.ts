import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { mapMindmapPosition, type MindmapPositionRow } from "@/lib/mappers";
import type { MindmapPosition } from "@/lib/types";
import { MINDMAP_POSITIONS_KEY } from "./keys";

export function useMindmapPositions() {
  return useQuery({
    queryKey: MINDMAP_POSITIONS_KEY,
    queryFn: async (): Promise<MindmapPosition[]> => {
      const { data, error } = await supabase.from("mindmap_positions").select("*");
      if (error) throw error;
      return (data as MindmapPositionRow[]).map(mapMindmapPosition);
    },
  });
}

// Saving the layout is a full snapshot replace (delete everything, reinsert
// the positions currently on screen) rather than a per-row upsert — simpler
// and matches the "sauvegarder la disposition" semantics of the feature.
export function useSaveMindmapPositions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (positions: MindmapPosition[]) => {
      const { error: deleteError } = await supabase
        .from("mindmap_positions")
        .delete()
        .gte("updated_at", "1900-01-01");
      if (deleteError) throw deleteError;

      if (positions.length === 0) return;

      const { error: insertError } = await supabase.from("mindmap_positions").insert(
        positions.map((p) => ({
          type: p.type,
          entite_id: p.entiteId,
          projet_context_id: p.projetContextId,
          position_x: p.x,
          position_y: p.y,
        })),
      );
      if (insertError) throw insertError;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MINDMAP_POSITIONS_KEY }),
  });
}
