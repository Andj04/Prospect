-- ============================================================================
-- Amal Biladi — Base de prospection RSE — schéma initial
-- Tables, RLS, triggers et fonctions.
-- À exécuter une seule fois dans Supabase Dashboard → SQL Editor → Run.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  full_name text not null default '',
  structure text not null default '',
  role text not null default 'user' check (role in ('admin', 'user')),
  password_change_required boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Security-definer helper so RLS policies can check "is the caller an admin?"
-- without recursing into profiles' own RLS.
create function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated, anon;

create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Blocks self-promotion through the policy above. service_role (used only by
-- the admin server function) bypasses this check.
create function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if new.role is distinct from old.role then
    raise exception 'Vous ne pouvez pas modifier votre propre rôle.';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_role_self_escalation
  before update on public.profiles
  for each row
  execute function public.prevent_role_self_escalation();

-- No insert/delete policy on profiles: only service_role (bypasses RLS) may
-- create or remove profile rows, via the admin server function.

-- ----------------------------------------------------------------------------
-- projets — liste des 9 projets Amal Biladi, éditable par un admin
-- ----------------------------------------------------------------------------
create table public.projets (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  ordre integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.projets enable row level security;

create policy "projets_select_authenticated"
  on public.projets for select to authenticated using (true);

create policy "projets_write_admin"
  on public.projets for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- entreprises
-- ----------------------------------------------------------------------------
create table public.entreprises (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  groupe text not null default '',
  secteur text not null default '',
  structure_dediee boolean,
  comment_mode_acces text not null default '',
  comment_budget text not null default '',
  comment_type_engagement text not null default '',
  quoi_descriptif text not null default '',
  quoi_programmes text not null default '',
  quoi_projets_finances text not null default '',
  quoi_notes_complementaires text not null default '',
  pourquoi_alignement text not null default '',
  pourquoi_precedent_fort text not null default '',
  pourquoi_proposition text not null default '',
  exclue boolean not null default false,
  raison_exclusion text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.entreprises enable row level security;

create policy "entreprises_select_authenticated"
  on public.entreprises for select to authenticated using (true);

create policy "entreprises_write_admin"
  on public.entreprises for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_entreprises_touch_updated_at
  before update on public.entreprises
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- entreprise_contacts (1 entreprise -> N contacts)
-- ----------------------------------------------------------------------------
create table public.entreprise_contacts (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  fonction text not null check (fonction in ('dirigeant','rh','rse-communication','fondation','marketing','autre')),
  nom text not null default '',
  linkedin text,
  email text,
  telephone text,
  created_at timestamptz not null default now()
);

alter table public.entreprise_contacts enable row level security;

create policy "entreprise_contacts_select_authenticated"
  on public.entreprise_contacts for select to authenticated using (true);

create policy "entreprise_contacts_write_admin"
  on public.entreprise_contacts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create index idx_entreprise_contacts_entreprise_id on public.entreprise_contacts(entreprise_id);

-- ----------------------------------------------------------------------------
-- entreprise_projets (N-N entre entreprises et projets)
-- ----------------------------------------------------------------------------
create table public.entreprise_projets (
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  projet_id uuid not null references public.projets(id) on delete cascade,
  primary key (entreprise_id, projet_id)
);

alter table public.entreprise_projets enable row level security;

create policy "entreprise_projets_select_authenticated"
  on public.entreprise_projets for select to authenticated using (true);

create policy "entreprise_projets_write_admin"
  on public.entreprise_projets for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create index idx_entreprise_projets_projet_id on public.entreprise_projets(projet_id);

-- ----------------------------------------------------------------------------
-- pipeline — suivi de lead, 1 ligne par entreprise
-- ----------------------------------------------------------------------------
create table public.pipeline (
  entreprise_id uuid primary key references public.entreprises(id) on delete cascade,
  statut text not null default 'identifie' check (statut in (
    'identifie','premier-contact','en-discussion','visite-programmee',
    'proposition-envoyee','partenariat-signe','sans-suite'
  )),
  motif_sans_suite text,
  priorite text not null default 'moyenne' check (priorite in ('haute','moyenne','basse')),
  responsable text not null default 'Non assigné',
  dernier_contact date not null default current_date,
  prochaine_action text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.pipeline enable row level security;

create policy "pipeline_select_authenticated"
  on public.pipeline for select to authenticated using (true);

create policy "pipeline_write_admin"
  on public.pipeline for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create trigger trg_pipeline_touch_updated_at
  before update on public.pipeline
  for each row execute function public.touch_updated_at();

-- Auto-crée la ligne pipeline associée à toute nouvelle entreprise.
create function public.create_pipeline_for_entreprise()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.pipeline (entreprise_id, prochaine_action)
  values (new.id, 'Qualifier l''opportunité')
  on conflict (entreprise_id) do nothing;
  return new;
end;
$$;

create trigger trg_entreprises_create_pipeline
  after insert on public.entreprises
  for each row execute function public.create_pipeline_for_entreprise();

-- ----------------------------------------------------------------------------
-- pipeline_historique — journal d'actions, append-only
-- ----------------------------------------------------------------------------
create table public.pipeline_historique (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  date date not null default current_date,
  type text not null,
  resume text not null,
  auteur text not null,
  created_at timestamptz not null default now()
);

alter table public.pipeline_historique enable row level security;

create policy "pipeline_historique_select_authenticated"
  on public.pipeline_historique for select to authenticated using (true);

create policy "pipeline_historique_insert_admin"
  on public.pipeline_historique for insert to authenticated
  with check (public.is_admin());

-- Pas de policy update/delete : journal immuable une fois écrit.

create index idx_pipeline_historique_entreprise_id on public.pipeline_historique(entreprise_id);

-- ----------------------------------------------------------------------------
-- save_entreprise() — upsert atomique entreprise + contacts + liens projets.
-- SECURITY INVOKER (par défaut) : les policies RLS ci-dessus s'appliquent
-- normalement, donc seule une session admin peut réellement écrire.
-- ----------------------------------------------------------------------------
create function public.save_entreprise(
  p_id uuid,
  p_nom text,
  p_groupe text,
  p_secteur text,
  p_structure_dediee boolean,
  p_comment_mode_acces text,
  p_comment_budget text,
  p_comment_type_engagement text,
  p_quoi_descriptif text,
  p_quoi_programmes text,
  p_quoi_projets_finances text,
  p_quoi_notes_complementaires text,
  p_pourquoi_alignement text,
  p_pourquoi_precedent_fort text,
  p_pourquoi_proposition text,
  p_exclue boolean,
  p_raison_exclusion text,
  p_contacts jsonb,
  p_projet_ids uuid[]
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
  v_contact jsonb;
begin
  if p_id is null then
    insert into public.entreprises (
      nom, groupe, secteur, structure_dediee, comment_mode_acces, comment_budget,
      comment_type_engagement, quoi_descriptif, quoi_programmes, quoi_projets_finances,
      quoi_notes_complementaires, pourquoi_alignement, pourquoi_precedent_fort,
      pourquoi_proposition, exclue, raison_exclusion
    ) values (
      p_nom, p_groupe, p_secteur, p_structure_dediee, p_comment_mode_acces, p_comment_budget,
      p_comment_type_engagement, p_quoi_descriptif, p_quoi_programmes, p_quoi_projets_finances,
      p_quoi_notes_complementaires, p_pourquoi_alignement, p_pourquoi_precedent_fort,
      p_pourquoi_proposition, p_exclue, p_raison_exclusion
    )
    returning id into v_id;
  else
    update public.entreprises set
      nom = p_nom,
      groupe = p_groupe,
      secteur = p_secteur,
      structure_dediee = p_structure_dediee,
      comment_mode_acces = p_comment_mode_acces,
      comment_budget = p_comment_budget,
      comment_type_engagement = p_comment_type_engagement,
      quoi_descriptif = p_quoi_descriptif,
      quoi_programmes = p_quoi_programmes,
      quoi_projets_finances = p_quoi_projets_finances,
      quoi_notes_complementaires = p_quoi_notes_complementaires,
      pourquoi_alignement = p_pourquoi_alignement,
      pourquoi_precedent_fort = p_pourquoi_precedent_fort,
      pourquoi_proposition = p_pourquoi_proposition,
      exclue = p_exclue,
      raison_exclusion = p_raison_exclusion
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'Entreprise % introuvable', p_id;
    end if;

    delete from public.entreprise_contacts where entreprise_id = v_id;
    delete from public.entreprise_projets where entreprise_id = v_id;
  end if;

  for v_contact in select * from jsonb_array_elements(coalesce(p_contacts, '[]'::jsonb))
  loop
    insert into public.entreprise_contacts (entreprise_id, fonction, nom, linkedin, email, telephone)
    values (
      v_id,
      v_contact->>'fonction',
      coalesce(v_contact->>'nom', ''),
      nullif(v_contact->>'linkedin', ''),
      nullif(v_contact->>'email', ''),
      nullif(v_contact->>'telephone', '')
    );
  end loop;

  if p_projet_ids is not null and array_length(p_projet_ids, 1) > 0 then
    insert into public.entreprise_projets (entreprise_id, projet_id)
    select v_id, unnest(p_projet_ids);
  end if;

  return v_id;
end;
$$;

grant execute on function public.save_entreprise(
  uuid, text, text, text, boolean, text, text, text, text, text, text, text,
  text, text, text, boolean, text, jsonb, uuid[]
) to authenticated;
