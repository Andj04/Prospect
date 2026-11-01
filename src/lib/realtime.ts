import { useEffect } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import {
  AUDIT_LOG_KEY,
  COMPANIES_KEY,
  COMPANIES_LIST_KEY,
  CONTACTS_KEY,
  DOCUMENTS_KEY,
  ONG_CONTACTS_KEY,
  ONG_KEY,
  ONG_LIST_KEY,
  PIPELINE_KEY,
  PIPELINE_ONG_KEY,
  PROJETS_KEY,
  USERS_KEY,
} from "@/lib/queries/keys";

// Chaque table répliquée déclenche l'invalidation des requêtes concernées, pour
// que la modification d'un utilisateur soit visible en direct chez les autres —
// suppose que les tables soient dans la publication supabase_realtime
// (voir supabase/migrations/0004_realtime.sql).
const COMPANY_KEYS: QueryKey[] = [COMPANIES_KEY, COMPANIES_LIST_KEY];

const ONG_KEYS: QueryKey[] = [ONG_KEY, ONG_LIST_KEY];

const TABLE_TO_KEYS: Record<string, QueryKey[]> = {
  entreprises: COMPANY_KEYS,
  entreprise_contacts: [...COMPANY_KEYS, CONTACTS_KEY],
  entreprise_projets: COMPANY_KEYS,
  pipeline: [PIPELINE_KEY],
  pipeline_historique: [PIPELINE_KEY],
  pipeline_documents: [DOCUMENTS_KEY],
  ong: ONG_KEYS,
  ong_contacts: [...ONG_KEYS, ONG_CONTACTS_KEY],
  ong_partenaires: ONG_KEYS,
  ong_projets: ONG_KEYS,
  pipeline_ong: [PIPELINE_ONG_KEY],
  pipeline_ong_historique: [PIPELINE_ONG_KEY],
  projets: [PROJETS_KEY],
  profiles: [USERS_KEY],
  audit_log: [AUDIT_LOG_KEY],
};

// Enregistrer une fiche écrit dans plusieurs tables à la suite (entreprise,
// contacts, liens projets) : sans regroupement, chaque écriture relancerait son
// propre rechargement. On attend donc un court instant que la rafale se termine
// avant de recharger une seule fois.
const DEBOUNCE_MS = 350;

export function useRealtimeSync(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const pending = new Map<string, QueryKey>();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const flush = () => {
      timer = undefined;
      const keys = [...pending.values()];
      pending.clear();
      for (const key of keys) void queryClient.invalidateQueries({ queryKey: key });
    };

    const schedule = (keys: QueryKey[]) => {
      for (const key of keys) pending.set(JSON.stringify(key), key);
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, DEBOUNCE_MS);
    };

    const channel = supabase.channel("db-changes");
    for (const table of Object.keys(TABLE_TO_KEYS)) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        schedule(TABLE_TO_KEYS[table] ?? []);
      });
    }
    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);
}
