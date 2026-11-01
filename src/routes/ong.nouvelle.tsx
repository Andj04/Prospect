import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { BackButton } from "@/components/BackButton";
import { OngForm, emptyOng } from "@/components/ong/OngForm";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useSaveOng } from "@/lib/queries/ong";
import { useProjects } from "@/lib/queries/projects";

export const Route = createFileRoute("/ong/nouvelle")({
  head: () => ({ meta: [{ title: "Ajouter une ONG — Prospection RSE Amal Biladi" }] }),
  component: NouvelleOng,
});

function NouvelleOng() {
  const { isAdmin } = useAuth();
  const { data: projets = [] } = useProjects();
  const save = useSaveOng();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(emptyOng);

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
        <BackButton fallbackTo="/ong" label="Retour" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ajouter une ONG</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Les champs longs peuvent être complétés progressivement.
          </p>
        </div>
        <OngForm
          value={draft}
          onChange={setDraft}
          projets={projets}
          saving={save.isPending}
          submitLabel="Enregistrer l'ONG"
          onCancel={() => navigate({ to: "/ong" })}
          onSubmit={() =>
            save.mutate(
              { id: null, ong: draft },
              {
                onSuccess: (id) => {
                  toast.success(`${draft.nom} ajoutée à la base`);
                  navigate({ to: "/ong/$id", params: { id } });
                },
                onError: (err) =>
                  toast.error(err instanceof Error ? err.message : "Échec de l'enregistrement"),
              },
            )
          }
        />
      </div>
    </AppShell>
  );
}
