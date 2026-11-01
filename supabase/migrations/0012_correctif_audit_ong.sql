-- ============================================================================
-- Amal Biladi — Correctif de 0011 : log_audit_event() plantait pour les
-- écritures sans utilisateur connecté (service_role, ex. scripts/seed-ong.mjs)
-- car 0011 avait réintroduit la version d'avant le correctif 0003.
-- À exécuter dans Supabase Dashboard → SQL Editor → Run (après 0011).
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
  -- SELECT INTO renvoie NULL sur zéro ligne (écritures via service_role,
  -- comme scripts/seed-ong.mjs) : le coalesce doit suivre, pas précéder (cf. 0003).
  select full_name into v_actor_name
  from public.profiles where id = auth.uid();
  v_actor_name := coalesce(v_actor_name, '');

  if TG_OP = 'DELETE' then
    v_row := to_jsonb(old);
  else
    v_row := to_jsonb(new);
  end if;

  v_record_id := coalesce(v_row->>'id', v_row->>'entreprise_id', v_row->>'ong_id', '');

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
