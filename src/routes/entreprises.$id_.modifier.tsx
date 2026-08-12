import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { CompanyForm, emptyCompany } from "@/components/CompanyForm";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useCompany, useSaveCompany } from "@/lib/queries/companies";
import { useAllProjects } from "@/lib/queries/projects";
import { useSousComposantes } from "@/lib/queries/sous-composantes";
import type { Company } from "@/lib/types";

export const Route = createFileRoute("/entreprises/$id_/modifier")({
  head: () => ({
    meta: [
      { title: "Modifier une entreprise — Prospection RSE Amal Biladi" },
      {
        name: "description",
        content: "Édition d'une fiche entreprise de la base de prospection RSE d'Amal Biladi.",
      },
      { property: "og:title", content: "Modifier une entreprise — Amal Biladi" },
      {
        property: "og:description",
        content: "Mettez à jour identité, financement, contacts et projets liés.",
      },
    ],
  }),
  component: ModifierEntreprise,
});

function stripId(company: Company): Omit<Company, "id"> {
  const { id: _omit, ...rest } = company;
  return rest;
}

function ModifierEntreprise() {
  const { id } = Route.useParams();
  const { isAdmin } = useAuth();
  const { data: company, isLoading } = useCompany(id);
  const { data: allProjets = [] } = useAllProjects();
  const { data: sousComposantes = [] } = useSousComposantes();
  const saveCompany = useSaveCompany();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Omit<Company, "id">>(emptyCompany);
  const [hydrated, setHydrated] = useState(false);

  // Active projects, plus any inactive one this entreprise is already linked
  // to — so an existing checked box never silently vanishes.
  const formProjets = useMemo(
    () => allProjets.filter((p) => p.actif || (company?.projets.includes(p.id) ?? false)),
    [allProjets, company],
  );

  useEffect(() => {
    if (company && !hydrated) {
      setDraft(stripId(company));
      setHydrated(true);
    }
  }, [company, hydrated]);

  if (!isAdmin) {
    return (
      <AppShell>
        <p className="card-soft p-8 text-center text-sm text-muted-foreground">
          Cette page est réservée à la vue Admin.
        </p>
      </AppShell>
    );
  }

  if (isLoading) {
    return (
      <AppShell>
        <p className="card-soft p-8 text-center text-sm text-muted-foreground">Chargement…</p>
      </AppShell>
    );
  }

  if (!company) {
    return (
      <AppShell>
        <p className="card-soft p-8 text-center text-sm text-muted-foreground">
          Entreprise introuvable.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Modifier — {company.nom}</h1>
        </div>
        <CompanyForm
          value={draft}
          onChange={setDraft}
          projets={formProjets}
          sousComposantes={sousComposantes}
          submitLabel="Enregistrer les modifications"
          onCancel={() => navigate({ to: "/entreprises/$id", params: { id } })}
          onSubmit={() => {
            saveCompany.mutate(
              { id, company: draft },
              {
                onSuccess: () => {
                  toast.success("Fiche mise à jour");
                  navigate({ to: "/entreprises/$id", params: { id } });
                },
                onError: (err) =>
                  toast.error(err instanceof Error ? err.message : "Échec de l'enregistrement"),
              },
            );
          }}
        />
      </div>
    </AppShell>
  );
}
