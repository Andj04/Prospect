-- ============================================================================
-- Amal Biladi — Section ONG : tables séparées de `entreprises`.
-- ong, ong_contacts, ong_partenaires, ong_projets, pipeline_ong,
-- pipeline_ong_historique + vue allégée ong_liste, RLS, triggers, audit,
-- temps réel et RPC save_ong().
-- La table `entreprises` et son pipeline ne sont pas modifiés.
-- À exécuter dans Supabase Dashboard → SQL Editor → Run (après 0001-0010).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ong
-- ----------------------------------------------------------------------------
create table public.ong (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  acronyme text not null default '',
  type_structure text not null default 'association' check (type_structure in (
    'association','fondation','fondation-entreprise',
    'association-etudiante','federation','reseau-international'
  )),
  annee_creation integer,
  utilite_publique boolean,                       -- null = inconnu
  logo_url text not null default '',

  -- Ce qu'elle fait
  thematiques text[] not null default '{}',
  activites_principales text not null default '',
  publics_cibles text not null default '',
  odd integer[] not null default '{}',            -- valeurs 1 à 17

  -- Où elle agit
  siege text not null default '',
  echelle text[] not null default '{}',           -- local, regional, national, international
  milieu text[] not null default '{}',            -- urbain, rural, montagnard, cotier
  regions text[] not null default '{}',           -- codes MA-01 à MA-12 (déduits, à relire)
  regions_verifiees boolean not null default false,
  territoires_precis text not null default '',

  -- Son financement (comment ELLE se finance — distinct de entreprises.comment_mode_acces)
  acces_financement text not null default '',
  budget_annuel text not null default '',
  financement_sources text[] not null default '{}',  -- 'international', 'diaspora'

  -- Son réseau
  comment_partenariats text not null default '',

  -- Pourquoi ce partenaire
  apports text[] not null default '{}',
  atouts text not null default '',
  pourquoi_partenaire text not null default '',
  relation_amal_biladi text not null default '',
  transversale boolean not null default false,
  notes text not null default '',                 -- ex. patronage royal, sans contact opérationnel

  -- Coordonnées de la structure
  email text not null default '',
  telephone text not null default '',
  site_web text not null default '',
  reseaux jsonb not null default '[]',            -- [{"type":"linkedin","url":"..."}]

  -- Qualité des données : stocké, jamais affiché
  sources text not null default '',
  date_verification date,
  signaux_concrets integer,
  niveau_information text not null default '',
  doublon_possible text not null default '',
  points_a_verifier text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_ong_nom on public.ong(nom);
create index idx_ong_regions on public.ong using gin(regions);

-- ----------------------------------------------------------------------------
-- ong_contacts
-- ----------------------------------------------------------------------------
create table public.ong_contacts (
  id uuid primary key default gen_random_uuid(),
  ong_id uuid not null references public.ong(id) on delete cascade,
  -- Même liste que entreprise_contacts.fonction, pour l'annuaire mixte.
  fonction_categorie text not null default 'dirigeant' check (fonction_categorie in (
    'dirigeant','rh','rse-communication','fondation','marketing','autre'
  )),
  fonction_detail text not null default '',       -- libellé exact du fichier
  nom text not null default '',
  email text,
  telephone text,
  linkedin text,
  created_at timestamptz not null default now()
);

create index idx_ong_contacts_ong_id on public.ong_contacts(ong_id);
create index idx_ong_contacts_nom on public.ong_contacts(nom);

-- ----------------------------------------------------------------------------
-- ong_partenaires — entreprise_id est la clé des passerelles
-- ----------------------------------------------------------------------------
create table public.ong_partenaires (
  id uuid primary key default gen_random_uuid(),
  ong_id uuid not null references public.ong(id) on delete cascade,
  nom text not null,
  type text not null check (type in ('prive','institutionnel','academique','bailleur')),
  entreprise_id uuid references public.entreprises(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_ong_partenaires_ong_id on public.ong_partenaires(ong_id);
create index idx_ong_partenaires_entreprise_id on public.ong_partenaires(entreprise_id)
  where entreprise_id is not null;

-- ----------------------------------------------------------------------------
-- ong_projets — transcription de la matrice ONG x Projets
-- ----------------------------------------------------------------------------
create table public.ong_projets (
  ong_id uuid not null references public.ong(id) on delete cascade,
  projet_id uuid not null references public.projets(id) on delete cascade,
  role text not null default 'lie' check (role in ('principal','lie')),
  primary key (ong_id, projet_id)
);

create index idx_ong_projets_projet_id on public.ong_projets(projet_id);

-- ----------------------------------------------------------------------------
-- pipeline_ong / pipeline_ong_historique
-- Pas de montants : une ONG n'est pas un financeur.
-- ----------------------------------------------------------------------------
create table public.pipeline_ong (
  ong_id uuid primary key references public.ong(id) on delete cascade,
  statut text not null default 'a-contacter' check (statut in (
    'a-contacter','contact-pris','en-discussion',
    'convention-en-preparation','partenaire-actif','sans-suite'
  )),
  motif_sans_suite text,
  responsable text not null default '',
  responsable_id uuid references public.profiles(id) on delete set null,
  dernier_contact date,
  prochaine_action text not null default '',
  prochaine_action_date date,
  contact_interne text not null default '',
  statut_depuis date not null default current_date
);

create index idx_pipeline_ong_prochaine_action_date on public.pipeline_ong(prochaine_action_date);

create table public.pipeline_ong_historique (
  id uuid primary key default gen_random_uuid(),
  ong_id uuid not null references public.ong(id) on delete cascade,
  date date not null default current_date,
  type text not null default '',
  resume text not null default '',
  auteur text not null default '',
  created_at timestamptz not null default now()
);

create index idx_pipeline_ong_historique_ong_id on public.pipeline_ong_historique(ong_id);

-- ----------------------------------------------------------------------------
-- RLS : lecture pour tout utilisateur connecté, écriture admin
-- ----------------------------------------------------------------------------
alter table public.ong enable row level security;
alter table public.ong_contacts enable row level security;
alter table public.ong_partenaires enable row level security;
alter table public.ong_projets enable row level security;
alter table public.pipeline_ong enable row level security;
alter table public.pipeline_ong_historique enable row level security;

create policy "ong_select_authenticated"
  on public.ong for select to authenticated using (true);
create policy "ong_write_admin"
  on public.ong for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "ong_contacts_select_authenticated"
  on public.ong_contacts for select to authenticated using (true);
create policy "ong_contacts_write_admin"
  on public.ong_contacts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "ong_partenaires_select_authenticated"
  on public.ong_partenaires for select to authenticated using (true);
create policy "ong_partenaires_write_admin"
  on public.ong_partenaires for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "ong_projets_select_authenticated"
  on public.ong_projets for select to authenticated using (true);
create policy "ong_projets_write_admin"
  on public.ong_projets for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "pipeline_ong_select_authenticated"
  on public.pipeline_ong for select to authenticated using (true);
create policy "pipeline_ong_write_admin"
  on public.pipeline_ong for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "pipeline_ong_historique_select_authenticated"
  on public.pipeline_ong_historique for select to authenticated using (true);
create policy "pipeline_ong_historique_insert_admin"
  on public.pipeline_ong_historique for insert to authenticated
  with check (public.is_admin());
-- Pas de policy update/delete : journal immuable une fois écrit (comme pipeline_historique).

-- ----------------------------------------------------------------------------
-- Triggers
-- ----------------------------------------------------------------------------
create trigger trg_ong_touch_updated_at
  before update on public.ong
  for each row execute function public.touch_updated_at();

-- Auto-crée la ligne pipeline_ong associée à toute nouvelle ONG.
create function public.create_pipeline_for_ong()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.pipeline_ong (ong_id, prochaine_action)
  values (new.id, 'Qualifier l''opportunité')
  on conflict (ong_id) do nothing;
  return new;
end;
$$;

create trigger trg_ong_create_pipeline
  after insert on public.ong
  for each row execute function public.create_pipeline_for_ong();

-- Même logique que le pipeline entreprises (migration 0009) : statut_depuis
-- suit chaque changement de statut.
create trigger trg_pipeline_ong_touch_statut_depuis
  before update on public.pipeline_ong
  for each row execute function public.touch_statut_depuis();

-- Le journal d'activité retrouve l'identifiant de la ligne via id ou
-- entreprise_id ; les tables ONG ajoutent ong_id (pipeline_ong, ong_projets).
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

create trigger trg_audit_ong
  after insert or update or delete on public.ong
  for each row execute function public.log_audit_event();
create trigger trg_audit_ong_contacts
  after insert or update or delete on public.ong_contacts
  for each row execute function public.log_audit_event();
create trigger trg_audit_ong_partenaires
  after insert or update or delete on public.ong_partenaires
  for each row execute function public.log_audit_event();
create trigger trg_audit_ong_projets
  after insert or update or delete on public.ong_projets
  for each row execute function public.log_audit_event();
create trigger trg_audit_pipeline_ong
  after insert or update or delete on public.pipeline_ong
  for each row execute function public.log_audit_event();
create trigger trg_audit_pipeline_ong_historique
  after insert or update or delete on public.pipeline_ong_historique
  for each row execute function public.log_audit_event();

-- ----------------------------------------------------------------------------
-- Vue allégée ong_liste (modèle : entreprises_liste, migration 0010)
-- Champs courts, indicateur de présence pour les champs longs, identifiants
-- liés et texte de recherche en minuscules.
-- ----------------------------------------------------------------------------
create or replace view public.ong_liste
with (security_invoker = true) as
select
  o.id,
  o.nom,
  o.acronyme,
  o.type_structure,
  o.annee_creation,
  o.utilite_publique,
  o.logo_url,
  o.thematiques,
  o.odd,
  o.siege,
  o.echelle,
  o.milieu,
  o.regions,
  o.regions_verifiees,
  o.financement_sources,
  o.apports,
  o.transversale,
  o.budget_annuel,
  (btrim(o.activites_principales) <> '') as a_activites,
  (btrim(o.publics_cibles) <> '') as a_publics,
  (btrim(o.territoires_precis) <> '') as a_territoires,
  (btrim(o.acces_financement) <> '') as a_acces_financement,
  (btrim(o.comment_partenariats) <> '') as a_comment_partenariats,
  (btrim(o.atouts) <> '') as a_atouts,
  (btrim(o.pourquoi_partenaire) <> '') as a_pourquoi,
  (btrim(o.relation_amal_biladi) <> '') as a_relation,
  (btrim(o.notes) <> '') as a_notes,
  (btrim(o.email) <> '' or btrim(o.telephone) <> '' or btrim(o.site_web) <> '') as a_coordonnees,
  (select count(*) from public.ong_contacts c where c.ong_id = o.id) as nb_contacts,
  (select count(*) from public.ong_partenaires p where p.ong_id = o.id) as nb_partenaires,
  (
    select count(*) from public.ong_partenaires p
    where p.ong_id = o.id and p.entreprise_id is not null
  ) as nb_passerelles,
  (
    select coalesce(array_agg(op.projet_id), '{}'::uuid[])
    from public.ong_projets op where op.ong_id = o.id
  ) as projet_ids,
  (
    select op.projet_id from public.ong_projets op
    where op.ong_id = o.id and op.role = 'principal' limit 1
  ) as projet_principal_id,
  lower(
    coalesce(o.nom, '') || ' ' ||
    coalesce(o.acronyme, '') || ' ' ||
    coalesce(o.siege, '') || ' ' ||
    coalesce(array_to_string(o.thematiques, ' '), '') || ' ' ||
    left(coalesce(o.territoires_precis, ''), 160) || ' ' ||
    coalesce(
      (
        select string_agg(coalesce(p.nom, ''), ' ')
        from public.ong_partenaires p where p.ong_id = o.id
      ),
      ''
    )
  ) as recherche
from public.ong o;

grant select on public.ong_liste to authenticated;

-- ----------------------------------------------------------------------------
-- save_ong() — upsert atomique ONG + contacts + partenaires + projets.
-- SECURITY INVOKER : les policies RLS s'appliquent, seul un admin écrit.
-- p_data : objet jsonb avec les colonnes de public.ong (sans id ni dates) ;
-- toutes les colonnes not null doivent être présentes.
-- p_contacts   : [{fonction_categorie, fonction_detail, nom, email, telephone, linkedin}]
-- p_partenaires: [{nom, type, entreprise_id}]
-- p_projets    : [{projet_id, role}]
-- ----------------------------------------------------------------------------
create function public.save_ong(
  p_id uuid,
  p_data jsonb,
  p_contacts jsonb,
  p_partenaires jsonb,
  p_projets jsonb
)
returns uuid
language plpgsql
as $$
declare
  r public.ong;
  v_id uuid;
  v_item jsonb;
begin
  r := jsonb_populate_record(null::public.ong, p_data);

  if p_id is null then
    insert into public.ong (
      nom, acronyme, type_structure, annee_creation, utilite_publique, logo_url,
      thematiques, activites_principales, publics_cibles, odd,
      siege, echelle, milieu, regions, regions_verifiees, territoires_precis,
      acces_financement, budget_annuel, financement_sources, comment_partenariats,
      apports, atouts, pourquoi_partenaire, relation_amal_biladi, transversale, notes,
      email, telephone, site_web, reseaux,
      sources, date_verification, signaux_concrets, niveau_information,
      doublon_possible, points_a_verifier
    ) values (
      r.nom, r.acronyme, r.type_structure, r.annee_creation, r.utilite_publique, r.logo_url,
      r.thematiques, r.activites_principales, r.publics_cibles, r.odd,
      r.siege, r.echelle, r.milieu, r.regions, r.regions_verifiees, r.territoires_precis,
      r.acces_financement, r.budget_annuel, r.financement_sources, r.comment_partenariats,
      r.apports, r.atouts, r.pourquoi_partenaire, r.relation_amal_biladi, r.transversale, r.notes,
      r.email, r.telephone, r.site_web, r.reseaux,
      coalesce(r.sources, ''), r.date_verification, r.signaux_concrets,
      coalesce(r.niveau_information, ''), coalesce(r.doublon_possible, ''),
      coalesce(r.points_a_verifier, '')
    )
    returning id into v_id;
  else
    update public.ong set
      nom = r.nom, acronyme = r.acronyme, type_structure = r.type_structure,
      annee_creation = r.annee_creation, utilite_publique = r.utilite_publique,
      logo_url = r.logo_url,
      thematiques = r.thematiques, activites_principales = r.activites_principales,
      publics_cibles = r.publics_cibles, odd = r.odd,
      siege = r.siege, echelle = r.echelle, milieu = r.milieu, regions = r.regions,
      regions_verifiees = r.regions_verifiees, territoires_precis = r.territoires_precis,
      acces_financement = r.acces_financement, budget_annuel = r.budget_annuel,
      financement_sources = r.financement_sources,
      comment_partenariats = r.comment_partenariats,
      apports = r.apports, atouts = r.atouts, pourquoi_partenaire = r.pourquoi_partenaire,
      relation_amal_biladi = r.relation_amal_biladi, transversale = r.transversale,
      notes = r.notes,
      email = r.email, telephone = r.telephone, site_web = r.site_web, reseaux = r.reseaux
      -- Les colonnes « qualité des données » ne sont jamais touchées par le formulaire.
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'ONG % introuvable', p_id;
    end if;

    delete from public.ong_contacts where ong_id = v_id;
    delete from public.ong_partenaires where ong_id = v_id;
    delete from public.ong_projets where ong_id = v_id;
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_contacts, '[]'::jsonb))
  loop
    insert into public.ong_contacts (
      ong_id, fonction_categorie, fonction_detail, nom, email, telephone, linkedin
    ) values (
      v_id,
      coalesce(nullif(v_item->>'fonction_categorie', ''), 'dirigeant'),
      coalesce(v_item->>'fonction_detail', ''),
      coalesce(v_item->>'nom', ''),
      nullif(v_item->>'email', ''),
      nullif(v_item->>'telephone', ''),
      nullif(v_item->>'linkedin', '')
    );
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_partenaires, '[]'::jsonb))
  loop
    insert into public.ong_partenaires (ong_id, nom, type, entreprise_id)
    values (
      v_id,
      v_item->>'nom',
      v_item->>'type',
      nullif(v_item->>'entreprise_id', '')::uuid
    );
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_projets, '[]'::jsonb))
  loop
    insert into public.ong_projets (ong_id, projet_id, role)
    values (
      v_id,
      (v_item->>'projet_id')::uuid,
      coalesce(nullif(v_item->>'role', ''), 'lie')
    )
    on conflict (ong_id, projet_id) do update set role = excluded.role;
  end loop;

  return v_id;
end;
$$;

grant execute on function public.save_ong(uuid, jsonb, jsonb, jsonb, jsonb) to authenticated;

-- ----------------------------------------------------------------------------
-- Temps réel (modèle : migration 0004)
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.ong;
alter publication supabase_realtime add table public.ong_contacts;
alter publication supabase_realtime add table public.ong_partenaires;
alter publication supabase_realtime add table public.ong_projets;
alter publication supabase_realtime add table public.pipeline_ong;
alter publication supabase_realtime add table public.pipeline_ong_historique;
