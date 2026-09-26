-- ============================================================================
-- Amal Biladi — Pays d'origine du groupe/de la maison mère de chaque
-- entreprise, pour distinguer entreprises marocaines et filiales de groupes
-- étrangers dans les statistiques.
-- À exécuter dans Supabase Dashboard → SQL Editor → Run (après 0001-0007).
-- ============================================================================

alter table public.entreprises add column pays_origine text not null default '';

-- ----------------------------------------------------------------------------
-- save_entreprise() — reprise de la version 0006 avec p_pays_origine en plus.
-- ----------------------------------------------------------------------------
drop function if exists public.save_entreprise(
  uuid, text, text, text, boolean, text, text, text, text, text, text, text,
  text, text, text, boolean, text, jsonb, uuid[], text, uuid[]
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

    delete from public.entreprise_contacts where entreprise_id = v_id;
    delete from public.entreprise_projets where entreprise_id = v_id;
    delete from public.entreprise_sous_composantes where entreprise_id = v_id;
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

  if p_sous_composante_ids is not null and array_length(p_sous_composante_ids, 1) > 0 then
    insert into public.entreprise_sous_composantes (entreprise_id, sous_composante_id)
    select v_id, unnest(p_sous_composante_ids);
  end if;

  return v_id;
end;
$$;

grant execute on function public.save_entreprise(
  uuid, text, text, text, boolean, text, text, text, text, text, text, text,
  text, text, text, boolean, text, jsonb, uuid[], text, uuid[], text
) to authenticated;
