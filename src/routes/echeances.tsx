import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/page-header";
import { ongRelanceBucket } from "@/lib/ong-utils";
import { BUCKET_LABEL, relanceBucket, type RelanceBucket } from "@/lib/pipeline-utils";
import { useCompaniesList } from "@/lib/queries/companies";
import { useOngList } from "@/lib/queries/ong";
import { usePipeline } from "@/lib/queries/pipeline";
import { STATUTS_ONG_CLOS, useOngPipeline } from "@/lib/queries/pipeline-ong";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/echeances")({
  head: () => ({ meta: [{ title: "Échéances — Prospection RSE Amal Biladi" }] }),
  component: EcheancesPage,
});

const ORDER: RelanceBucket[] = ["retard", "aujourdhui", "semaine", "plus-tard"];
const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "");

type Echeance = {
  key: string;
  type: "entreprise" | "ong";
  id: string;
  nom: string;
  action: string;
  date: string;
  responsable: string;
  bucket: RelanceBucket;
};

// Toutes les échéances des deux pipelines, sur une seule liste.
function EcheancesPage() {
  const { data: companies = [], isLoading: l1 } = useCompaniesList();
  const { data: pipeline = [] } = usePipeline();
  const { data: ongs = [], isLoading: l2 } = useOngList();
  const { data: ongPipeline = [] } = useOngPipeline();
  const [type, setType] = useState<"tous" | "entreprise" | "ong">("tous");

  const items = useMemo<Echeance[]>(() => {
    const cn_ = new Map(companies.map((c) => [c.id, c.nom]));
    const on = new Map(ongs.map((o) => [o.id, o.nom]));
    const out: Echeance[] = [];
    for (const p of pipeline) {
      if (!p.prochaineActionDate || p.statut === "partenariat-signe" || p.statut === "sans-suite")
        continue;
      const nom = cn_.get(p.companyId);
      if (nom)
        out.push({
          key: `e-${p.companyId}`,
          type: "entreprise",
          id: p.companyId,
          nom,
          action: p.prochaineAction,
          date: p.prochaineActionDate,
          responsable: p.responsable,
          bucket: relanceBucket(p),
        });
    }
    for (const p of ongPipeline) {
      if (!p.prochaineActionDate || STATUTS_ONG_CLOS.includes(p.statut)) continue;
      const nom = on.get(p.ongId);
      if (nom)
        out.push({
          key: `o-${p.ongId}`,
          type: "ong",
          id: p.ongId,
          nom,
          action: p.prochaineAction,
          date: p.prochaineActionDate,
          responsable: p.responsable,
          bucket: ongRelanceBucket(p),
        });
    }
    return out
      .filter((i) => type === "tous" || i.type === type)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [companies, pipeline, ongs, ongPipeline, type]);

  return (
    <AppShell>
      <div className="space-y-5">
        <PageHeader
          title="Échéances"
          description="Les relances des deux pipelines, entreprises et ONG. Les pages Relances et Relances ONG permettent d'agir sur chaque dossier."
        />
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["tous", "Tous"],
              ["entreprise", "Entreprises"],
              ["ong", "ONG"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setType(v)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                type === v
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {l1 || l2 ? (
          <Skeleton className="h-64" />
        ) : items.length === 0 ? (
          <p className="card-soft p-8 text-center text-sm text-muted-foreground">
            Aucune échéance planifiée.
          </p>
        ) : (
          ORDER.map((b) => {
            const rows = items.filter((i) => i.bucket === b);
            if (rows.length === 0) return null;
            return (
              <section key={b} className="space-y-2">
                <h2
                  className={cn(
                    "text-sm font-semibold uppercase tracking-wide",
                    b === "retard" ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {BUCKET_LABEL[b]} · {rows.length}
                </h2>
                <ul className="card-soft divide-y divide-border">
                  {rows.map((i) => (
                    <li key={i.key} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          i.type === "ong"
                            ? "bg-brand-orange/25 text-warning-foreground"
                            : "bg-primary/10 text-primary-deep",
                        )}
                      >
                        {i.type === "ong" ? "ONG" : "Entreprise"}
                      </span>
                      {i.type === "ong" ? (
                        <Link
                          to="/ong/$id"
                          params={{ id: i.id }}
                          className="font-semibold hover:underline"
                        >
                          {i.nom}
                        </Link>
                      ) : (
                        <Link
                          to="/entreprises/$id"
                          params={{ id: i.id }}
                          className="font-semibold hover:underline"
                        >
                          {i.nom}
                        </Link>
                      )}
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">
                        {i.action || "Aucune action définie"}
                        {i.responsable && ` · ${i.responsable}`}
                      </span>
                      <span className="tabular-nums text-muted-foreground">{fmt(i.date)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
