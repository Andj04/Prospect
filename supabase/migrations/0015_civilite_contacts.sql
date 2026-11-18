-- ============================================================================
-- Amal Biladi — Civilité des contacts (Monsieur / Madame).
-- Les messages LinkedIn commencent par « Bonjour Monsieur Belkhayat » : la
-- civilité est choisie une fois dans la fenêtre des messages, puis mémorisée.
-- Toute l'équipe peut la renseigner (fonction dédiée), alors que la
-- modification des contacts reste réservée aux admins.
-- À exécuter dans Supabase Dashboard → SQL Editor → Run (après 0014).
-- ============================================================================

alter table public.entreprise_contacts
  add column if not exists civilite text not null default ''
  check (civilite in ('', 'monsieur', 'madame'));

-- Noms écrits avec la civilité (« Mme Zineb Bennouna », « M. … ») : pré-remplis.
update public.entreprise_contacts set civilite = 'madame'
where civilite = '' and nom ~* '^\s*(mme|madame|mlle)\M';
update public.entreprise_contacts set civilite = 'monsieur'
where civilite = '' and nom ~* '^\s*(m\.|monsieur|mr\.?)\s';

create or replace function public.definir_civilite(p_contact uuid, p_civilite text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;
  if p_civilite not in ('', 'monsieur', 'madame') then
    raise exception 'Civilité inconnue : %', p_civilite;
  end if;
  update public.entreprise_contacts set civilite = p_civilite where id = p_contact;
end;
$$;

grant execute on function public.definir_civilite(uuid, text) to authenticated;
