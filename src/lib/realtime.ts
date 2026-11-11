import { useEffect } from "react";
import { useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
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
  PROSPECTION_KEY,
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
  entreprise_contacts: [...COMPANY_KEYS, CONTACTS_KEY, PROSPECTION_KEY],
  prospection_contacts: [PROSPECTION_KEY],
  prospection_historique: [PROSPECTION_KEY],
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

// L'AppShell est monté par chaque page : sans précaution, chaque changement de
// page fermait puis rouvrait la connexion temps réel sous le même nom. En
// naviguant vite, la nouvelle connexion retrouvait l'ancienne, pas encore
// fermée, et plantait (« callbacks après subscribe »). La connexion vit donc au
// niveau du module : elle survit aux changements de page, porte un nom unique,
// et ne se ferme qu'après quelques secondes sans aucune page montée.
const STOP_DELAY_MS = 5000;

let shared: { channel: RealtimeChannel; dispose: () => void } | null = null;
let mounted = 0;
let stopTimer: ReturnType<typeof setTimeout> | undefined;
let counter = 0;

function startSync(queryClient: QueryClient) {
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

  const channel = supabase.channel(`db-changes-${++counter}`);
  for (const table of Object.keys(TABLE_TO_KEYS)) {
    channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
      schedule(TABLE_TO_KEYS[table] ?? []);
    });
  }
  channel.subscribe();

  return {
    channel,
    dispose: () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    },
  };
}

export function useRealtimeSync(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    mounted += 1;
    if (stopTimer) {
      clearTimeout(stopTimer);
      stopTimer = undefined;
    }
    if (!shared) shared = startSync(queryClient);

    return () => {
      mounted -= 1;
      if (mounted > 0) return;
      stopTimer = setTimeout(() => {
        if (mounted === 0 && shared) {
          shared.dispose();
          shared = null;
        }
      }, STOP_DELAY_MS);
    };
  }, [enabled, queryClient]);
}
