import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import {
  mapOng,
  mapOngContact,
  mapOngListItem,
  mapOngPartenaire,
  type OngContactRow,
  type OngListeRow,
  type OngPartenaireRow,
  type OngRow,
} from "@/lib/mappers";
import type { Ong, OngContactDirectoryEntry, OngListItem, OngPartenaire } from "@/lib/types";
import { ONG_CONTACTS_KEY, ONG_KEY, ONG_LIST_KEY, PIPELINE_ONG_KEY } from "./keys";

const SELECT = "*, ong_contacts(*), ong_partenaires(*), ong_projets(projet_id, role)";

// Liste allégée : tout ce qu'il faut pour les listes, filtres, carte et
// statistiques. Les champs longs n'y figurent que sous forme d'indicateur.
export function useOngList(enabled = true) {
  return useQuery({
    queryKey: ONG_LIST_KEY,
    enabled,
    queryFn: async (): Promise<OngListItem[]> => {
      const { data, error } = await supabase.from("ong_liste").select("*").order("nom");
      if (error) throw error;
      return (data as OngListeRow[]).map(mapOngListItem);
    },
  });
}

// Fiches complètes, champs longs inclus : réservé aux écrans qui les affichent.
export function useOngFull(enabled = true) {
  return useQuery({
    queryKey: [...ONG_KEY, "completes"],
    enabled,
    queryFn: async (): Promise<Ong[]> => {
      const { data, error } = await supabase.from("ong").select(SELECT).order("nom");
      if (error) throw error;
      return (data as OngRow[]).map(mapOng);
    },
  });
}

export function useOng(id: string | undefined) {
  return useQuery({
    queryKey: [...ONG_KEY, id],
    enabled: Boolean(id),
    queryFn: async (): Promise<Ong | null> => {
      const { data, error } = await supabase
        .from("ong")
        .select(SELECT)
        .eq("id", id as string)
        .maybeSingle();
      if (error) throw error;
      return data ? mapOng(data as OngRow) : null;
    },
  });
}

// Annuaire des contacts ONG : lit la table des contacts directement.
export function useOngContactsDirectory(enabled = true) {
  return useQuery({
    queryKey: ONG_CONTACTS_KEY,
    enabled,
    queryFn: async (): Promise<OngContactDirectoryEntry[]> => {
      const { data, error } = await supabase
        .from("ong_contacts")
        .select("*, ong!inner(nom)")
        .order("nom");
      if (error) throw error;
      type Row = OngContactRow & { ong_id: string; ong: { nom: string } };
      return (data as Row[])
        .map((r) => ({ ...mapOngContact(r), ongId: r.ong_id, ongNom: r.ong.nom }))
        .sort((a, b) => a.ongNom.localeCompare(b.ongNom));
    },
  });
}

function toRpcPayload(id: string | null, input: Omit<Ong, "id">) {
  return {
    p_id: id,
    p_data: {
      nom: input.nom,
      acronyme: input.acronyme ?? "",
      type_structure: input.typeStructure,
      annee_creation: input.anneeCreation ?? null,
      utilite_publique: input.utilitePublique,
      logo_url: input.logoUrl ?? "",
      thematiques: input.thematiques,
      activites_principales: input.activitesPrincipales ?? "",
      publics_cibles: input.publicsCibles ?? "",
      odd: input.odd,
      siege: input.siege ?? "",
      echelle: input.echelle,
      milieu: input.milieu,
      regions: input.regions,
      regions_verifiees: input.regionsVerifiees,
      territoires_precis: input.territoiresPrecis ?? "",
      acces_financement: input.accesFinancement ?? "",
      budget_annuel: input.budgetAnnuel ?? "",
      financement_sources: input.financementSources,
      comment_partenariats: input.commentPartenariats ?? "",
      apports: input.apports,
      atouts: input.atouts ?? "",
      pourquoi_partenaire: input.pourquoiPartenaire ?? "",
      relation_amal_biladi: input.relationAmalBiladi ?? "",
      transversale: input.transversale,
      notes: input.notes ?? "",
      email: input.email ?? "",
      telephone: input.telephone ?? "",
      site_web: input.siteWeb ?? "",
      reseaux: input.reseaux,
    },
    p_contacts: input.contacts.map((c) => ({
      fonction_categorie: c.fonctionCategorie,
      fonction_detail: c.fonctionDetail ?? "",
      nom: c.nom,
      email: c.email ?? "",
      telephone: c.telephone ?? "",
      linkedin: c.linkedin ?? "",
    })),
    p_partenaires: input.partenaires.map((p) => ({
      nom: p.nom,
      type: p.type,
      entreprise_id: p.entrepriseId ?? "",
    })),
    p_projets: input.projets.map((p) => ({ projet_id: p.projetId, role: p.role })),
  };
}

// Enregistrement complet (ajout / modification) : upsert atomique de l'ONG,
// de ses contacts, partenaires et liens projets via save_ong().
export function useSaveOng() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ong }: { id: string | null; ong: Omit<Ong, "id"> }) => {
      const { data, error } = await supabase.rpc("save_ong", toRpcPayload(id, ong));
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ONG_KEY });
      queryClient.invalidateQueries({ queryKey: ONG_CONTACTS_KEY });
      queryClient.invalidateQueries({ queryKey: PIPELINE_ONG_KEY });
    },
  });
}

// Modification d'un champ à la fois (édition en ligne du tableau).
const FIELD_TO_COLUMN = {
  nom: "nom",
  acronyme: "acronyme",
  typeStructure: "type_structure",
  anneeCreation: "annee_creation",
  utilitePublique: "utilite_publique",
  thematiques: "thematiques",
  activitesPrincipales: "activites_principales",
  publicsCibles: "publics_cibles",
  siege: "siege",
  echelle: "echelle",
  milieu: "milieu",
  regions: "regions",
  regionsVerifiees: "regions_verifiees",
  territoiresPrecis: "territoires_precis",
  accesFinancement: "acces_financement",
  budgetAnnuel: "budget_annuel",
  apports: "apports",
  transversale: "transversale",
  notes: "notes",
  email: "email",
  telephone: "telephone",
  siteWeb: "site_web",
} as const;

export type OngPatchableField = keyof typeof FIELD_TO_COLUMN;

type PatchValue = string | number | boolean | string[] | null;
type PatchVars = { id: string; patch: Partial<Record<OngPatchableField, PatchValue>> };

// Mise à jour optimiste, comme usePatchEntreprise : le cache (liste + fiches)
// reflète le changement tout de suite, annulé seulement si l'écriture échoue.
export function usePatchOng() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: PatchVars) => {
      const payload: Record<string, PatchValue> = {};
      for (const [field, value] of Object.entries(patch)) {
        payload[FIELD_TO_COLUMN[field as OngPatchableField]] = value as PatchValue;
      }
      const { error } = await supabase.from("ong").update(payload).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, patch }: PatchVars) => {
      await queryClient.cancelQueries({ queryKey: ONG_KEY });
      const previous = queryClient.getQueriesData<unknown>({ queryKey: ONG_KEY });
      const apply = <T extends { id: string }>(o: T): T =>
        o.id === id ? ({ ...o, ...patch } as T) : o;
      queryClient.setQueriesData<unknown>({ queryKey: ONG_KEY }, (data: unknown) => {
        if (Array.isArray(data)) return (data as { id: string }[]).map(apply);
        if (data && (data as { id?: string }).id === id) return apply(data as { id: string });
        return data;
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    // L'écran est déjà à jour (mise à jour optimiste) et le temps réel relance
    // la lecture une fois : on marque seulement le cache comme périmé, sans
    // recharger tout de suite (évitait 2 rechargements de ~1 Mo par modification).
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ONG_KEY, refetchType: "none" });
      void queryClient.invalidateQueries({ queryKey: ONG_CONTACTS_KEY, refetchType: "none" });
    },
  });
}

export function useDeleteOng() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ong").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ONG_KEY });
      queryClient.invalidateQueries({ queryKey: ONG_CONTACTS_KEY });
      queryClient.invalidateQueries({ queryKey: PIPELINE_ONG_KEY });
    },
  });
}

// Validation d'une passerelle : lie (ou délie) un partenaire à une entreprise.
export function useLinkPartenaire() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      partenaireId,
      entrepriseId,
    }: {
      partenaireId: string;
      entrepriseId: string | null;
    }) => {
      const { error } = await supabase
        .from("ong_partenaires")
        .update({ entreprise_id: entrepriseId })
        .eq("id", partenaireId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ONG_KEY }),
  });
}

export type PartenaireAvecOng = OngPartenaire & { ongId: string; ongNom: string };

// Partenaires privés et bailleurs de toutes les ONG : base des passerelles
// (recoupement avec les entreprises).
export function useOngPartenaires() {
  return useQuery({
    queryKey: [...ONG_KEY, "partenaires"],
    queryFn: async (): Promise<PartenaireAvecOng[]> => {
      const { data, error } = await supabase
        .from("ong_partenaires")
        .select("*, ong!inner(nom)")
        .in("type", ["prive", "bailleur"])
        .order("nom");
      if (error) throw error;
      type Row = OngPartenaireRow & { ong_id: string; ong: { nom: string } };
      return (data as Row[]).map((r) => ({
        ...mapOngPartenaire(r),
        ongId: r.ong_id,
        ongNom: r.ong.nom,
      }));
    },
  });
}
