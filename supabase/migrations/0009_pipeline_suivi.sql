-- ============================================================================
-- Amal Biladi — Pipeline enrichi : responsable relié aux utilisateurs,
-- échéance des relances, montants visés/obtenus, projet ciblé, date d'entrée
-- dans le statut courant, et pièces jointes (propositions, conventions).
-- À exécuter dans Supabase Dashboard → SQL Editor → Run (après 0001-0008).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Nouvelles colonnes du pipeline
-- ----------------------------------------------------------------------------
alter table public.pipeline
  add column responsable_id uuid references public.profiles(id) on delete set null,
  add column prochaine_action_date date,
  add column montant_vise numeric(14, 2),
  add column montant_obtenu numeric(14, 2),
  add column projet_cible_id uuid references public.projets(id) on delete set null,
  add column statut_depuis timestamptz not null default now();

-- « Dernier contact » ne doit refléter qu'un échange réel : la date d'import
-- actuelle est effacée pour les dossiers sans aucun historique.
alter table public.pipeline alter column dernier_contact drop not null;
alter table public.pipeline alter column dernier_contact drop default;
update public.pipeline p
  set dernier_contact = null
  where not exists (
    select 1 from public.pipeline_historique h where h.entreprise_id = p.entreprise_id
  );

-- « Non assigné » était une valeur par défaut, pas un vrai responsable.
update public.pipeline set responsable = '' where responsable = 'Non assigné';
alter table public.pipeline alter column responsable set default '';

create index idx_pipeline_prochaine_action_date on public.pipeline(prochaine_action_date);

-- statut_depuis suit automatiquement chaque changement de statut (temps passé
-- dans chaque étape, dossiers sans activité).
create function public.touch_statut_depuis()
returns trigger
language plpgsql
as $$
begin
  if new.statut is distinct from old.statut then
    new.statut_depuis = now();
  end if;
  return new;
end;
$$;

create trigger trg_pipeline_statut_depuis
  before update on public.pipeline
  for each row execute function public.touch_statut_depuis();

-- ----------------------------------------------------------------------------
-- Pièces jointes du dossier (métadonnées ; fichiers dans le Storage)
-- ----------------------------------------------------------------------------
create table public.pipeline_documents (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  nom text not null,
  chemin text not null,
  taille bigint,
  type_mime text,
  auteur text not null default '',
  created_at timestamptz not null default now()
);

alter table public.pipeline_documents enable row level security;

create policy "pipeline_documents_select_authenticated"
  on public.pipeline_documents for select to authenticated using (true);

create policy "pipeline_documents_write_admin"
  on public.pipeline_documents for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create index idx_pipeline_documents_entreprise_id on public.pipeline_documents(entreprise_id);

create trigger trg_audit_pipeline_documents
  after insert or update or delete on public.pipeline_documents
  for each row execute function public.log_audit_event();

alter publication supabase_realtime add table public.pipeline_documents;

-- Bucket privé : lecture pour les utilisateurs connectés, écriture admin.
insert into storage.buckets (id, name, public)
  values ('pieces-jointes', 'pieces-jointes', false)
  on conflict (id) do nothing;

create policy "pieces_jointes_select_authenticated"
  on storage.objects for select to authenticated
  using (bucket_id = 'pieces-jointes');

create policy "pieces_jointes_insert_admin"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'pieces-jointes' and public.is_admin());

create policy "pieces_jointes_delete_admin"
  on storage.objects for delete to authenticated
  using (bucket_id = 'pieces-jointes' and public.is_admin());
