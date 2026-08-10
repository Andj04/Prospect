-- ============================================================================
-- Amal Biladi — Active Supabase Realtime (postgres_changes) sur les tables
-- métier, pour que les modifications d'un utilisateur soient répercutées en
-- direct chez tous les utilisateurs connectés. Les événements restent filtrés
-- par les policies RLS existantes (lecture ouverte aux utilisateurs
-- authentifiés) — aucune donnée supplémentaire n'est exposée.
-- À exécuter dans Supabase Dashboard → SQL Editor → Run (après 0001-0003).
-- ============================================================================

alter publication supabase_realtime add table public.entreprises;
alter publication supabase_realtime add table public.entreprise_contacts;
alter publication supabase_realtime add table public.entreprise_projets;
alter publication supabase_realtime add table public.pipeline;
alter publication supabase_realtime add table public.pipeline_historique;
alter publication supabase_realtime add table public.projets;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.audit_log;
