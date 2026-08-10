import { useEffect } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import {
  AUDIT_LOG_KEY,
  COMPANIES_KEY,
  PIPELINE_KEY,
  PROJETS_KEY,
  USERS_KEY,
} from "@/lib/queries/keys";

// Maps each replicated table to the query keys that need invalidating when it
// changes, so any admin's edit is reflected live for every connected user —
// requires the tables to be added to the supabase_realtime publication
// (see supabase/migrations/0004_realtime.sql).
const TABLE_TO_KEYS: Record<string, QueryKey[]> = {
  entreprises: [COMPANIES_KEY],
  entreprise_contacts: [COMPANIES_KEY],
  entreprise_projets: [COMPANIES_KEY],
  pipeline: [PIPELINE_KEY],
  pipeline_historique: [PIPELINE_KEY],
  projets: [PROJETS_KEY],
  profiles: [USERS_KEY],
  audit_log: [AUDIT_LOG_KEY],
};

export function useRealtimeSync(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase.channel("db-changes");
    for (const table of Object.keys(TABLE_TO_KEYS)) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        for (const key of TABLE_TO_KEYS[table] ?? []) {
          void queryClient.invalidateQueries({ queryKey: key });
        }
      });
    }
    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);
}
