import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { CompanyForm, emptyCompany } from "@/components/CompanyForm";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useSaveCompany } from "@/lib/queries/companies";
import { useProjects } from "@/lib/queries/projects";
import { useSousComposantes } from "@/lib/queries/sous-composantes";

export const Route = createFileRoute("/entreprises/nouvelle")({
  head: () => ({
    meta: [
      { title: "Ajouter une entreprise — Prospection RSE Amal Biladi" },
      {
        name: "description",
        content: "Formulaire d'ajout d'une entreprise ou fondation à la base de prospection RSE.",
      },
      { property: "og:title", content: "Ajouter une entreprise — Amal Biladi" },
      {
        property: "og:description",
        content: "Renseignez identité, mécanisme de financement, contacts et projets liés.",
      },
    ],
  }),
  component: NouvelleEntreprise,
});

function NouvelleEntreprise() {
  const { isAdmin } = useAuth();
  const { data: projets = [] } = useProjects();
  const { data: sousComposantes = [] } = useSousComposantes();
  const saveCompany = useSaveCompany();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(emptyCompany);

  if (!isAdmin) {
    return (
      <AppShell>
        <p className="card-soft p-8 text-center text-sm text-muted-foreground">
          Cette page est réservée à la vue Admin.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ajouter une entreprise</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Les champs longs peuvent être complétés progressivement.
          </p>
        </div>
        <CompanyForm
          value={draft}
          onChange={setDraft}
          projets={projets}
          sousComposantes={sousComposantes}
          submitLabel="Enregistrer l'entreprise"
          onCancel={() => navigate({ to: "/" })}
          onSubmit={() => {
            saveCompany.mutate(
              { id: null, company: draft },
              {
                onSuccess: (id) => {
                  toast.success(`${draft.nom} ajoutée à la base`);
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
