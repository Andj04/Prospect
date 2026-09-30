-- ============================================================================
-- Amal Biladi — Vue « liste » allégée.
-- La liste des entreprises (accueil, tableau de bord, cartographie, pipeline)
-- n'a pas besoin du contenu des champs longs : seulement de savoir s'ils sont
-- renseignés. Cette vue renvoie les champs courts, un indicateur de présence
-- par champ long, les identifiants liés et un texte de recherche préparé —
-- environ 4 fois moins de données qu'un select complet.
-- security_invoker : la vue s'exécute avec les droits de l'appelant, donc les
-- policies RLS de public.entreprises s'appliquent normalement.
-- À exécuter dans Supabase Dashboard → SQL Editor → Run (après 0001-0009).
-- ============================================================================

create or replace view public.entreprises_liste
with (security_invoker = true) as
select
  e.id,
  e.nom,
  e.groupe,
  e.secteur,
  e.pays_origine,
  e.structure_dediee,
  e.logo_url,
  e.exclue,
  e.raison_exclusion,
  e.import_batch_id,
  e.comment_type_engagement,
  (btrim(e.comment_mode_acces) <> '') as a_mode_acces,
  (btrim(e.comment_budget) <> '') as a_budget,
  (btrim(e.quoi_descriptif) <> '') as a_descriptif,
  (btrim(e.quoi_programmes) <> '' or btrim(e.quoi_projets_finances) <> '') as a_programmes,
  (btrim(e.quoi_notes_complementaires) <> '') as a_notes,
  (btrim(e.pourquoi_alignement) <> '') as a_alignement,
  (btrim(e.pourquoi_precedent_fort) <> '') as a_precedent,
  (btrim(e.pourquoi_proposition) <> '') as a_proposition,
  (
    select count(*)
    from public.entreprise_contacts ct
    where ct.entreprise_id = e.id
  ) as nb_contacts,
  (
    select coalesce(array_agg(ep.projet_id), '{}'::uuid[])
    from public.entreprise_projets ep
    where ep.entreprise_id = e.id
  ) as projet_ids,
  (
    select coalesce(array_agg(esc.sous_composante_id), '{}'::uuid[])
    from public.entreprise_sous_composantes esc
    where esc.entreprise_id = e.id
  ) as sous_composante_ids,
  lower(
    coalesce(e.nom, '') || ' ' ||
    coalesce(e.groupe, '') || ' ' ||
    coalesce(e.secteur, '') || ' ' ||
    coalesce(e.pays_origine, '') || ' ' ||
    left(coalesce(e.pourquoi_alignement, ''), 160) || ' ' ||
    coalesce(
      (
        select string_agg(coalesce(ct.nom, '') || ' ' || coalesce(ct.email, ''), ' ')
        from public.entreprise_contacts ct
        where ct.entreprise_id = e.id
      ),
      ''
    )
  ) as recherche
from public.entreprises e;

grant select on public.entreprises_liste to authenticated;

-- L'annuaire des contacts et la recherche globale lisent directement la table
-- des contacts, jointe au nom de l'entreprise : ces index évitent un balayage
-- complet à chaque ouverture.
create index if not exists idx_entreprise_contacts_nom on public.entreprise_contacts(nom);
