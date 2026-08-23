-- ============================================================================
-- Amal Biladi — Lots d'import : regroupe visuellement les entreprises
-- importées en masse (ex. un nouveau lot de prospection) dans le tableau
-- Admin, sans les mélanger aux entreprises créées normalement.
-- À exécuter dans Supabase Dashboard → SQL Editor → Run (après 0001-0006).
-- ============================================================================

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  created_at timestamptz not null default now()
);

alter table public.import_batches enable row level security;

create policy "import_batches_select_authenticated"
  on public.import_batches for select to authenticated using (true);

create policy "import_batches_write_admin"
  on public.import_batches for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create trigger trg_audit_import_batches
  after insert or update or delete on public.import_batches
  for each row execute function public.log_audit_event();

alter table public.entreprises
  add column import_batch_id uuid references public.import_batches(id) on delete set null;

create index idx_entreprises_import_batch_id on public.entreprises(import_batch_id);
