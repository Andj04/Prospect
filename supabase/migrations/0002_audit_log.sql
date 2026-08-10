-- ============================================================================
-- Amal Biladi — Journal d'activité (audit log)
-- Trace qui modifie quoi côté admin (entreprises, pipeline, projets).
-- Lisible uniquement par les admins ; jamais visible côté utilisateur.
-- À exécuter dans Supabase Dashboard → SQL Editor → Run (après 0001_init.sql).
-- ============================================================================

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text not null default '',
  table_name text not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  record_id text not null default '',
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

create policy "audit_log_select_admin"
  on public.audit_log for select
  to authenticated
  using (public.is_admin());

-- No insert/update/delete policy for authenticated: rows are only ever
-- written by the security-definer trigger below.

create index idx_audit_log_created_at on public.audit_log(created_at desc);

create function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_name text;
  v_row jsonb;
  v_record_id text;
begin
  select coalesce(full_name, '') into v_actor_name
  from public.profiles where id = auth.uid();

  if TG_OP = 'DELETE' then
    v_row := to_jsonb(old);
  else
    v_row := to_jsonb(new);
  end if;

  v_record_id := coalesce(v_row->>'id', v_row->>'entreprise_id', '');

  insert into public.audit_log (
    actor_id, actor_name, table_name, action, record_id, old_data, new_data
  ) values (
    auth.uid(),
    v_actor_name,
    TG_TABLE_NAME,
    TG_OP,
    v_record_id,
    case when TG_OP <> 'INSERT' then to_jsonb(old) else null end,
    case when TG_OP <> 'DELETE' then to_jsonb(new) else null end
  );

  if TG_OP = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- Attached only to the tables that represent meaningful admin actions.
-- entreprise_contacts / entreprise_projets are deliberately excluded: the
-- save_entreprise() RPC always replaces them wholesale on every save, which
-- would flood the log with noise unrelated to what an admin actually changed.

create trigger trg_audit_entreprises
  after insert or update or delete on public.entreprises
  for each row execute function public.log_audit_event();

create trigger trg_audit_pipeline
  after insert or update or delete on public.pipeline
  for each row execute function public.log_audit_event();

create trigger trg_audit_pipeline_historique
  after insert or update or delete on public.pipeline_historique
  for each row execute function public.log_audit_event();

create trigger trg_audit_projets
  after insert or update or delete on public.projets
  for each row execute function public.log_audit_event();
