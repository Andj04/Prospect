import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Check, Link2, Unlink } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PageHeader, StatCard, StatGrid } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth/AuthProvider";
import { normaliser } from "@/lib/ong-utils";
import { useCompaniesList } from "@/lib/queries/companies";
import { useLinkPartenaire, useOngPartenaires, type PartenaireAvecOng } from "@/lib/queries/ong";

export const Route = createFileRoute("/passerelles")({
  head: () => ({ meta: [{ title: "Passerelles — Prospection RSE Amal Biladi" }] }),
  component: PasserellesPage,
});

const STOP = new Set(
  "fondation foundation groupe group maroc morocco bank banque de du des la le l d et and association s a sa holding societe".split(
    " ",
  ),
);
const core = (s: string) =>
  normaliser(s)
    .split(" ")
    .filter((w) => w && !STOP.has(w))
    .join(" ");

// Une ONG qui travaille déjà avec une entreprise ciblée peut l'introduire : ce
// croisement n'existe dans aucune des deux bases prises séparément.
function PasserellesPage() {
  const { isAdmin } = useAuth();
  const { data: partenaires = [], isLoading } = useOngPartenaires();
  const { data: companies = [] } = useCompaniesList();
  const link = useLinkPartenaire();

  const { validees, suggestions } = useMemo(() => {
    const byCore = new Map<string, { id: string; nom: string }[]>();
    for (const c of companies) {
      const k = core(c.nom.split("(")[0] ?? c.nom);
      if (k.length >= 3) byCore.set(k, [...(byCore.get(k) ?? []), { id: c.id, nom: c.nom }]);
    }
    const nomOf = new Map(companies.map((c) => [c.id, c.nom]));
    const validees = new Map<string, { nom: string; items: PartenaireAvecOng[] }>();
    const suggestions: { p: PartenaireAvecOng; entreprise: { id: string; nom: string } }[] = [];
    for (const p of partenaires) {
      if (p.entrepriseId) {
        const e = validees.get(p.entrepriseId) ?? {
          nom: nomOf.get(p.entrepriseId) ?? "Entreprise",
          items: [],
        };
        e.items.push(p);
        validees.set(p.entrepriseId, e);
        continue;
      }
      // Rapprochement par nom normalisé : exact seulement, la validation reste humaine.
      const match = byCore.get(core(p.nom));
      if (match && match.length === 1) suggestions.push({ p, entreprise: match[0]! });
    }
    return { validees: [...validees.entries()], suggestions };
  }, [partenaires, companies]);

  const run = (partenaireId: string, entrepriseId: string | null, ok: string) =>
    link.mutate(
      { partenaireId, entrepriseId },
      {
        onSuccess: () => toast.success(ok),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Échec"),
      },
    );

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Passerelles"
          description="« Cette ONG travaille déjà avec cette entreprise que vous ciblez, elle peut vous introduire. » Les rapprochements sont proposés par nom, puis validés à la main."
        />
        <StatGrid>
          <StatCard
            label="Passerelles validées"
            value={validees.reduce((n, [, v]) => n + v.items.length, 0)}
            icon={<Link2 className="h-5 w-5" />}
            tone="green"
          />
          <StatCard
            label="Entreprises atteignables"
            value={validees.length}
            icon={<Link2 className="h-5 w-5" />}
            tone="blue"
            index={1}
          />
          <StatCard
            label="À valider"
            value={suggestions.length}
            icon={<Check className="h-5 w-5" />}
            tone="orange"
            index={2}
          />
        </StatGrid>

        {isLoading ? (
          <Skeleton className="h-64" />
        ) : (
          <>
            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Introductions possibles
              </h2>
              {validees.length === 0 ? (
                <p className="card-soft p-6 text-sm text-muted-foreground">
                  Aucune passerelle validée pour l'instant.
                  {suggestions.length > 0 && " Validez des rapprochements ci-dessous."}
                </p>
              ) : (
                <ul className="card-soft divide-y divide-border">
                  {validees
                    .sort((a, b) => b[1].items.length - a[1].items.length)
                    .map(([id, v]) => (
                      <li key={id} className="p-4">
                        <Link
                          to="/entreprises/$id"
                          params={{ id }}
                          className="font-semibold hover:underline"
                        >
                          {v.nom}
                        </Link>
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {v.items.map((p) => (
                            <li
                              key={p.id}
                              className="inline-flex items-center gap-2 rounded-lg bg-success/10 px-2.5 py-1 text-sm"
                            >
                              <Link
                                to="/ong/$id"
                                params={{ id: p.ongId }}
                                className="font-medium text-success hover:underline"
                              >
                                {p.ongNom}
                              </Link>
                              <span className="text-xs text-muted-foreground">
                                ({p.type === "bailleur" ? "bailleur" : "partenaire privé"})
                              </span>
                              {isAdmin && (
                                <button
                                  type="button"
                                  aria-label="Retirer la passerelle"
                                  className="text-muted-foreground hover:text-destructive"
                                  onClick={() => run(p.id, null, "Passerelle retirée")}
                                >
                                  <Unlink className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                </ul>
              )}
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Rapprochements à valider · {suggestions.length}
              </h2>
              {suggestions.length === 0 ? (
                <p className="card-soft p-6 text-sm text-muted-foreground">
                  Aucun rapprochement en attente. Les noms qui ne correspondent pas exactement se
                  relient depuis la fiche de l'ONG (« Relier à une entreprise »).
                </p>
              ) : (
                <ul className="card-soft divide-y divide-border">
                  {suggestions.map(({ p, entreprise }) => (
                    <li key={p.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                      <span className="min-w-0 flex-1">
                        <Link
                          to="/ong/$id"
                          params={{ id: p.ongId }}
                          className="font-medium hover:underline"
                        >
                          {p.ongNom}
                        </Link>{" "}
                        cite « {p.nom} » ={" "}
                        <Link
                          to="/entreprises/$id"
                          params={{ id: entreprise.id }}
                          className="font-medium text-primary-deep hover:underline dark:text-primary"
                        >
                          {entreprise.nom}
                        </Link>
                        ?
                      </span>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => run(p.id, entreprise.id, "Passerelle validée")}
                        >
                          <Check className="h-4 w-4" />
                          Valider
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
