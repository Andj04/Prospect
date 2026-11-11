-- ============================================================================
-- Amal Biladi — Prospection contact par contact (LinkedIn d'abord).
-- - entreprise_contacts : poste, catégorie de poste, remarque, responsable,
--   contact recommandé par un autre contact
-- - entreprises.contact_generique : canaux génériques (contact@…)
-- - prospection_contacts : une ligne par contact et par canal (étape, réponse,
--   pause, dates de chaque étape, prochaine action libre)
-- - prospection_historique : journal des actions de prospection
-- - automatismes vers le pipeline entreprise (statut, historique, dernier contact)
-- - creer_contact_recommande() : crée le contact indiqué lors d'une redirection
-- - save_entreprise() conserve désormais les contacts existants (mise à jour par
--   identifiant) au lieu de tous les supprimer puis recréer : sinon chaque
--   enregistrement de fiche effaçait le suivi de prospection.
-- À exécuter dans Supabase Dashboard → SQL Editor → Run (après 0013).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Contacts : informations utiles à la prospection
-- ----------------------------------------------------------------------------
alter table public.entreprise_contacts
  add column if not exists poste text not null default '',
  add column if not exists categorie_poste text not null default '',
  add column if not exists remarque text not null default '',
  add column if not exists responsable text not null default '',
  add column if not exists responsable_id uuid references public.profiles(id) on delete set null,
  add column if not exists recommande_par uuid references public.entreprise_contacts(id) on delete set null;

create index if not exists idx_entreprise_contacts_responsable_id
  on public.entreprise_contacts(responsable_id);

alter table public.entreprises
  add column if not exists contact_generique text not null default '';

-- ----------------------------------------------------------------------------
-- Suivi de prospection : une ligne par contact et par canal
-- ----------------------------------------------------------------------------
create table public.prospection_contacts (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.entreprise_contacts(id) on delete cascade,
  canal text not null default 'linkedin' check (canal in ('linkedin', 'email', 'telephone')),
  etape text not null default 'a-inviter' check (etape in (
    'a-inviter', 'invitation-envoyee', 'acceptee', 'message-envoye',
    'relance-1', 'relance-2', 'relance-finale', 'repondu', 'sans-suite'
  )),
  reponse text check (reponse in ('favorable', 'redirection', 'information', 'plus-tard', 'refus')),
  reponse_note text not null default '',
  en_pause boolean not null default false,
  pause_motif text not null default '',
  prochaine_action_date date,
  modele text not null default '',
  notes text not null default '',
  invitation_le date,
  acceptee_le date,
  message_le date,
  relance1_le date,
  relance2_le date,
  relance_finale_le date,
  reponse_le date,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  unique (contact_id, canal)
);

create index idx_prospection_contacts_contact_id on public.prospection_contacts(contact_id);
create index idx_prospection_contacts_etape on public.prospection_contacts(canal, etape);

create table public.prospection_historique (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.entreprise_contacts(id) on delete cascade,
  canal text not null default 'linkedin',
  date date not null default current_date,
  action text not null,
  detail text not null default '',
  auteur text not null default '',
  created_at timestamptz not null default now()
);

create index idx_prospection_historique_contact_id on public.prospection_historique(contact_id);

-- Toute l'équipe fait de la prospection : lecture et écriture pour les
-- utilisateurs connectés, suppression réservée aux admins.
alter table public.prospection_contacts enable row level security;
alter table public.prospection_historique enable row level security;

create policy "prospection_contacts_select_authenticated"
  on public.prospection_contacts for select to authenticated using (true);
create policy "prospection_contacts_insert_authenticated"
  on public.prospection_contacts for insert to authenticated with check (true);
create policy "prospection_contacts_update_authenticated"
  on public.prospection_contacts for update to authenticated using (true) with check (true);
create policy "prospection_contacts_delete_admin"
  on public.prospection_contacts for delete to authenticated using (public.is_admin());

create policy "prospection_historique_select_authenticated"
  on public.prospection_historique for select to authenticated using (true);
create policy "prospection_historique_insert_authenticated"
  on public.prospection_historique for insert to authenticated with check (true);

-- ----------------------------------------------------------------------------
-- Dates d'étape remplies automatiquement (modifiables ensuite)
-- ----------------------------------------------------------------------------
create function public.prospection_avant_maj()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  if tg_op = 'INSERT' or new.etape is distinct from old.etape then
    case new.etape
      when 'invitation-envoyee' then new.invitation_le := coalesce(new.invitation_le, current_date);
      when 'acceptee' then new.acceptee_le := coalesce(new.acceptee_le, current_date);
      when 'message-envoye' then new.message_le := coalesce(new.message_le, current_date);
      when 'relance-1' then new.relance1_le := coalesce(new.relance1_le, current_date);
      when 'relance-2' then new.relance2_le := coalesce(new.relance2_le, current_date);
      when 'relance-finale' then new.relance_finale_le := coalesce(new.relance_finale_le, current_date);
      else null;
    end case;
  end if;
  if new.reponse is not null and (tg_op = 'INSERT' or new.reponse is distinct from old.reponse) then
    new.reponse_le := coalesce(new.reponse_le, current_date);
    if new.etape <> 'sans-suite' then
      new.etape := 'repondu';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_prospection_avant_maj
  before insert or update on public.prospection_contacts
  for each row execute function public.prospection_avant_maj();

-- ----------------------------------------------------------------------------
-- Automatismes : journal de prospection et pipeline de l'entreprise
-- ----------------------------------------------------------------------------
create function public.prospection_apres_maj()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entreprise uuid;
  v_nom text;
  v_auteur text;
  v_statut text;
  v_canal text := case new.canal when 'linkedin' then 'LinkedIn' when 'email' then 'Email' else 'Téléphone' end;
  v_etape_label text;
  v_reponse_label text;
begin
  select c.entreprise_id, c.nom into v_entreprise, v_nom
  from public.entreprise_contacts c where c.id = new.contact_id;
  select coalesce(full_name, '') into v_auteur from public.profiles where id = auth.uid();
  v_auteur := coalesce(v_auteur, '');

  v_etape_label := case new.etape
    when 'a-inviter' then 'À inviter'
    when 'invitation-envoyee' then 'Invitation envoyée'
    when 'acceptee' then 'Invitation acceptée'
    when 'message-envoye' then 'Message envoyé'
    when 'relance-1' then '1re relance envoyée'
    when 'relance-2' then '2e relance envoyée'
    when 'relance-finale' then 'Relance finale envoyée'
    when 'repondu' then 'A répondu'
    else 'Sans suite' end;
  v_reponse_label := case new.reponse
    when 'favorable' then 'Réponse favorable'
    when 'redirection' then 'Redirection vers un autre contact'
    when 'information' then 'Demande d''information'
    when 'plus-tard' then 'Pas maintenant'
    when 'refus' then 'Refus'
    else null end;

  -- Journal du contact
  if tg_op = 'UPDATE' and new.etape is distinct from old.etape and new.etape <> 'repondu' then
    insert into public.prospection_historique (contact_id, canal, action, auteur)
    values (new.contact_id, new.canal, v_etape_label, v_auteur);
  end if;
  if new.reponse is not null and (tg_op = 'INSERT' or new.reponse is distinct from old.reponse) then
    insert into public.prospection_historique (contact_id, canal, action, detail, auteur)
    values (new.contact_id, new.canal, v_reponse_label, new.reponse_note, v_auteur);
  end if;

  if v_entreprise is null then
    return new;
  end if;
  select statut into v_statut from public.pipeline where entreprise_id = v_entreprise;

  -- Premier contact : la première démarche fait sortir l'entreprise de « Identifié »
  if v_statut = 'identifie'
     and new.etape not in ('a-inviter', 'sans-suite')
     and (tg_op = 'INSERT' or new.etape is distinct from old.etape) then
    update public.pipeline set statut = 'premier-contact' where entreprise_id = v_entreprise;
    insert into public.pipeline_historique (entreprise_id, type, resume, auteur)
    values (v_entreprise, 'Statut',
            format('Identifié → Premier contact pris (%s : %s, %s)', v_canal, v_nom, lower(v_etape_label)),
            v_auteur);
    v_statut := 'premier-contact';
  end if;

  -- Étapes marquantes dans l'historique de l'entreprise
  if tg_op = 'UPDATE' and new.etape is distinct from old.etape and new.etape = 'acceptee' then
    insert into public.pipeline_historique (entreprise_id, type, resume, auteur)
    values (v_entreprise, v_canal, format('%s a accepté l''invitation', v_nom), v_auteur);
    update public.pipeline set dernier_contact = greatest(coalesce(dernier_contact, new.acceptee_le), new.acceptee_le)
    where entreprise_id = v_entreprise;
  end if;

  if new.reponse is not null and (tg_op = 'INSERT' or new.reponse is distinct from old.reponse) then
    insert into public.pipeline_historique (entreprise_id, type, resume, auteur)
    values (v_entreprise, v_canal,
            format('%s : %s%s', v_nom, v_reponse_label,
                   case when new.reponse_note <> '' then ' — ' || new.reponse_note else '' end),
            v_auteur);
    update public.pipeline set dernier_contact = greatest(coalesce(dernier_contact, new.reponse_le), new.reponse_le)
    where entreprise_id = v_entreprise;

    -- Réponse favorable : l'entreprise passe « En discussion » (jamais de retour en arrière)
    if new.reponse = 'favorable' and v_statut in ('identifie', 'premier-contact') then
      update public.pipeline set statut = 'en-discussion' where entreprise_id = v_entreprise;
      insert into public.pipeline_historique (entreprise_id, type, resume, auteur)
      values (v_entreprise, 'Statut',
              format('%s → En discussion (réponse favorable de %s)',
                     case v_statut when 'identifie' then 'Identifié' else 'Premier contact pris' end, v_nom),
              v_auteur);
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_prospection_apres_maj
  after insert or update on public.prospection_contacts
  for each row execute function public.prospection_apres_maj();

-- ----------------------------------------------------------------------------
-- Redirection : créer le contact recommandé (même entreprise, même responsable)
-- ----------------------------------------------------------------------------
create function public.creer_contact_recommande(
  p_source uuid,
  p_nom text,
  p_poste text,
  p_linkedin text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src public.entreprise_contacts;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;
  select * into v_src from public.entreprise_contacts where id = p_source;
  if v_src.id is null then
    raise exception 'Contact source introuvable';
  end if;

  insert into public.entreprise_contacts (
    entreprise_id, fonction, nom, poste, linkedin, remarque,
    responsable, responsable_id, recommande_par
  ) values (
    v_src.entreprise_id, 'autre', btrim(p_nom), coalesce(btrim(p_poste), ''),
    nullif(btrim(coalesce(p_linkedin, '')), ''),
    format('Recommandé par %s', v_src.nom),
    v_src.responsable, v_src.responsable_id, v_src.id
  )
  returning id into v_id;

  if nullif(btrim(coalesce(p_linkedin, '')), '') is not null then
    insert into public.prospection_contacts (contact_id, canal, etape)
    values (v_id, 'linkedin', 'a-inviter');
  end if;
  return v_id;
end;
$$;

grant execute on function public.creer_contact_recommande(uuid, text, text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- save_entreprise() : mise à jour des contacts par identifiant
-- (même signature qu'en 0008 ; seuls les contacts retirés du formulaire sont
-- supprimés, les autres gardent leur identifiant et leur suivi)
-- ----------------------------------------------------------------------------
create or replace function public.save_entreprise(
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
  p_projet_ids uuid[],
  p_logo_url text default '',
  p_sous_composante_ids uuid[] default '{}',
  p_pays_origine text default ''
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
  v_contact jsonb;
  v_contact_id uuid;
  v_kept uuid[] := '{}';
begin
  if p_id is null then
    insert into public.entreprises (
      nom, groupe, secteur, structure_dediee, comment_mode_acces, comment_budget,
      comment_type_engagement, quoi_descriptif, quoi_programmes, quoi_projets_finances,
      quoi_notes_complementaires, pourquoi_alignement, pourquoi_precedent_fort,
      pourquoi_proposition, exclue, raison_exclusion, logo_url, pays_origine
    ) values (
      p_nom, p_groupe, p_secteur, p_structure_dediee, p_comment_mode_acces, p_comment_budget,
      p_comment_type_engagement, p_quoi_descriptif, p_quoi_programmes, p_quoi_projets_finances,
      p_quoi_notes_complementaires, p_pourquoi_alignement, p_pourquoi_precedent_fort,
      p_pourquoi_proposition, p_exclue, p_raison_exclusion, nullif(p_logo_url, ''),
      p_pays_origine
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
      raison_exclusion = p_raison_exclusion,
      logo_url = nullif(p_logo_url, ''),
      pays_origine = p_pays_origine
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'Entreprise % introuvable', p_id;
    end if;

    delete from public.entreprise_projets where entreprise_id = v_id;
    delete from public.entreprise_sous_composantes where entreprise_id = v_id;
  end if;

  for v_contact in select * from jsonb_array_elements(coalesce(p_contacts, '[]'::jsonb))
  loop
    v_contact_id := null;
    if coalesce(v_contact->>'id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      v_contact_id := (v_contact->>'id')::uuid;
    end if;

    if v_contact_id is not null and exists (
      select 1 from public.entreprise_contacts where id = v_contact_id and entreprise_id = v_id
    ) then
      -- Contact existant : seuls les champs du formulaire changent ; poste,
      -- responsable, remarque et suivi de prospection sont conservés.
      update public.entreprise_contacts set
        fonction = v_contact->>'fonction',
        nom = coalesce(v_contact->>'nom', ''),
        linkedin = nullif(v_contact->>'linkedin', ''),
        email = nullif(v_contact->>'email', ''),
        telephone = nullif(v_contact->>'telephone', '')
      where id = v_contact_id;
    else
      insert into public.entreprise_contacts (id, entreprise_id, fonction, nom, linkedin, email, telephone)
      values (
        coalesce(v_contact_id, gen_random_uuid()),
        v_id,
        v_contact->>'fonction',
        coalesce(v_contact->>'nom', ''),
        nullif(v_contact->>'linkedin', ''),
        nullif(v_contact->>'email', ''),
        nullif(v_contact->>'telephone', '')
      )
      returning id into v_contact_id;
    end if;
    v_kept := v_kept || v_contact_id;
  end loop;

  delete from public.entreprise_contacts
  where entreprise_id = v_id and not (id = any(v_kept));

  if p_projet_ids is not null and array_length(p_projet_ids, 1) > 0 then
    insert into public.entreprise_projets (entreprise_id, projet_id)
    select v_id, unnest(p_projet_ids);
  end if;

  if p_sous_composante_ids is not null and array_length(p_sous_composante_ids, 1) > 0 then
    insert into public.entreprise_sous_composantes (entreprise_id, sous_composante_id)
    select v_id, unnest(p_sous_composante_ids);
  end if;

  return v_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- Temps réel
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.prospection_contacts;
alter publication supabase_realtime add table public.prospection_historique;
