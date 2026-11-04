-- ============================================================================
-- Amal Biladi — Allègement de la vue entreprises_liste (performance).
-- La colonne « recherche » ne reprend plus les 160 premiers caractères de
-- l'alignement thématique ni les emails des contacts : environ 50 Ko de moins
-- à chaque chargement de la liste, recharge qui a lieu sur presque toutes les
-- pages. La recherche porte toujours sur le nom, le groupe, le secteur, le pays
-- et le nom des contacts.
-- À exécuter dans Supabase Dashboard → SQL Editor → Run (après 0012).
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
    coalesce(
      (
        select string_agg(coalesce(ct.nom, ''), ' ')
        from public.entreprise_contacts ct
        where ct.entreprise_id = e.id
      ),
      ''
    )
  ) as recherche
from public.entreprises e;
