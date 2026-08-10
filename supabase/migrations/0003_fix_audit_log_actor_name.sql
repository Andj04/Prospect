-- ============================================================================
-- Amal Biladi — Correctif : log_audit_event() plantait quand aucune ligne
-- profiles ne correspondait à auth.uid() (ex. écritures via service_role,
-- comme scripts/seed.mjs) — SELECT INTO renvoie NULL sur zéro ligne, et le
-- COALESCE interne à la requête ne protège pas ce cas.
-- À exécuter dans Supabase Dashboard → SQL Editor → Run (après 0002).
-- ============================================================================

create or replace function public.log_audit_event()
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
  select full_name into v_actor_name
  from public.profiles where id = auth.uid();
  v_actor_name := coalesce(v_actor_name, '');

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
