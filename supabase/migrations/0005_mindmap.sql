-- ============================================================================
-- Amal Biladi — Cartographie mind map (entreprises par projet)
-- Ajoute logo_url sur entreprises, la table mindmap_positions (disposition
-- sauvegardée de la carte), et met à jour save_entreprise() pour accepter
-- le logo.
-- À exécuter dans Supabase Dashboard → SQL Editor → Run (après 0001-0004).
-- ============================================================================

alter table public.entreprises add column logo_url text;

-- ----------------------------------------------------------------------------
-- mindmap_positions — snapshot des positions X/Y de la carte, remplacé en
-- bloc à chaque clic sur "Sauvegarder la disposition" (pas d'upsert ligne
-- par ligne). Pour un nœud "projet", projet_context_id = entite_id (garde
-- le triplet toujours non-nul pour que la contrainte unique reste fiable).
-- ----------------------------------------------------------------------------
create table public.mindmap_positions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('projet', 'entreprise')),
  entite_id uuid not null,
  projet_context_id uuid not null,
  position_x double precision not null,
  position_y double precision not null,
  updated_at timestamptz not null default now(),
  unique (type, entite_id, projet_context_id)
);

alter table public.mindmap_positions enable row level security;

create policy "mindmap_positions_select_authenticated"
  on public.mindmap_positions for select to authenticated using (true);

create policy "mindmap_positions_write_admin"
  on public.mindmap_positions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- save_entreprise() — reprise de la version 0001 avec p_logo_url en plus.
-- La signature change (nouveau paramètre) : "create or replace" créerait une
-- surcharge au lieu de remplacer l'ancienne fonction, on la supprime donc
-- explicitement d'abord pour n'avoir qu'une seule version.
-- ----------------------------------------------------------------------------
drop function if exists public.save_entreprise(
  uuid, text, text, text, boolean, text, text, text, text, text, text, text,
  text, text, text, boolean, text, jsonb, uuid[]
);

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
  p_projet_ids uuid[],
  p_logo_url text default ''
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
      pourquoi_proposition, exclue, raison_exclusion, logo_url
    ) values (
      p_nom, p_groupe, p_secteur, p_structure_dediee, p_comment_mode_acces, p_comment_budget,
      p_comment_type_engagement, p_quoi_descriptif, p_quoi_programmes, p_quoi_projets_finances,
      p_quoi_notes_complementaires, p_pourquoi_alignement, p_pourquoi_precedent_fort,
      p_pourquoi_proposition, p_exclue, p_raison_exclusion, nullif(p_logo_url, '')
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
      logo_url = nullif(p_logo_url, '')
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
  text, text, text, boolean, text, jsonb, uuid[], text
) to authenticated;
