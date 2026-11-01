import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { OngForm, emptyOng, type OngDraft } from "@/components/ong/OngForm";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useOng, useSaveOng } from "@/lib/queries/ong";
import { useAllProjects } from "@/lib/queries/projects";

export const Route = createFileRoute("/ong/$id_/modifier")({
  head: () => ({ meta: [{ title: "Modifier une ONG — Prospection RSE Amal Biladi" }] }),
  component: ModifierOng,
});

function ModifierOng() {
  const { id } = Route.useParams();
  const { isAdmin } = useAuth();
  const { data: ong, isLoading } = useOng(id);
  const { data: allProjets = [] } = useAllProjects();
  const save = useSaveOng();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<OngDraft>(emptyOng);
  const [hydrated, setHydrated] = useState(false);

  // Projets actifs, plus ceux déjà liés à cette ONG (une case cochée ne disparaît pas).
  const formProjets = useMemo(
    () =>
      allProjets.filter((p) => p.actif || (ong?.projets.some((l) => l.projetId === p.id) ?? false)),
    [allProjets, ong],
  );

  useEffect(() => {
    if (ong && !hydrated) {
      const { id: _omit, ...rest } = ong;
      setDraft(rest);
      setHydrated(true);
    }
  }, [ong, hydrated]);

  if (!isAdmin) {
    return (
      <AppShell>
        <p className="card-soft p-8 text-center text-sm text-muted-foreground">
          Cette page est réservée à la vue Admin.
        </p>
      </AppShell>
    );
  }
  if (isLoading || (ong && !hydrated)) {
    return (
      <AppShell>
        <p className="card-soft p-8 text-center text-sm text-muted-foreground">Chargement…</p>
      </AppShell>
    );
  }
  if (!ong) {
    return (
      <AppShell>
        <p className="card-soft p-8 text-center text-sm text-muted-foreground">ONG introuvable.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/ong/$id" params={{ id }}>
            <ArrowLeft className="h-4 w-4" />
            Retour à la fiche
          </Link>
        </Button>
        <PageHeader title={`Modifier — ${ong.nom}`} />
        <OngForm
          value={draft}
          onChange={setDraft}
          projets={formProjets}
          saving={save.isPending}
          submitLabel="Enregistrer les modifications"
          onCancel={() => navigate({ to: "/ong/$id", params: { id } })}
          onSubmit={() =>
            save.mutate(
              { id, ong: draft },
              {
                onSuccess: () => {
                  toast.success("Fiche mise à jour");
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
