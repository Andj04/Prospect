import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { Company, Projet } from "@/lib/types";

// Carte de chaleur secteurs × projets : quels secteurs peuvent financer quels
// projets. Plus la case est foncée, plus il y a d'entreprises. Un clic ouvre
// la liste des entreprises correspondantes.
export function HeatmapView({ companies, projets }: { companies: Company[]; projets: Projet[] }) {
  const navigate = useNavigate();

  const { rows, max, colTotals } = useMemo(() => {
    const secteurs = [...new Set(companies.map((c) => c.secteur || "Non renseigné"))];
    const rows = secteurs
      .map((secteur) => {
        const inSecteur = companies.filter((c) => (c.secteur || "Non renseigné") === secteur);
        const cells = projets.map((p) => inSecteur.filter((c) => c.projets.includes(p.id)).length);
        return { secteur, cells, total: inSecteur.length };
      })
      .sort((a, b) => b.total - a.total);
    const max = Math.max(1, ...rows.flatMap((r) => r.cells));
    const colTotals = projets.map((p) => companies.filter((c) => c.projets.includes(p.id)).length);
    return { rows, max, colTotals };
  }, [companies, projets]);

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>Nombre d'entreprises</span>
        <span className="flex items-center gap-1">
          0
          <span
            className="h-3 w-40 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, color-mix(in oklab, var(--primary) 6%, transparent), var(--primary))",
            }}
          />
          {max}
        </span>
        <span>· cliquez sur une case pour voir les entreprises</span>
      </div>
      <div className="card-soft themed-scrollbar max-h-[72vh] overflow-auto">
        <table className="w-full border-separate border-spacing-1 text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr>
              <th className="sticky left-0 z-20 min-w-[200px] bg-card px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Secteur
              </th>
              {projets.map((p, i) => (
                <th key={p.id} className="min-w-[96px] px-1 py-2 align-bottom">
                  <span className="line-clamp-3 text-xs font-semibold leading-tight">{p.nom}</span>
                  <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
                    {colTotals[i]}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.secteur}>
                <th className="sticky left-0 z-10 bg-card px-3 py-1.5 text-left font-medium">
                  <span className="block truncate">{r.secteur}</span>
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {r.total} entreprise{r.total > 1 ? "s" : ""}
                  </span>
                </th>
                {r.cells.map((n, i) => {
                  const p = projets[i]!;
                  const pct = n / max;
                  return (
                    <td key={p.id} className="p-0">
                      <button
                        type="button"
                        disabled={n === 0}
                        title={`${r.secteur} × ${p.nom} : ${n} entreprise${n > 1 ? "s" : ""}`}
                        onClick={() =>
                          void navigate({
                            to: "/entreprises",
                            search: { secteur: r.secteur, projet: p.id },
                          })
                        }
                        className="grid h-11 w-full place-items-center rounded-md text-xs font-semibold tabular-nums transition-transform duration-150 hover:scale-105 hover:ring-2 hover:ring-primary/50 disabled:cursor-default disabled:hover:scale-100 disabled:hover:ring-0"
                        style={{
                          backgroundColor:
                            n === 0
                              ? "var(--muted)"
                              : `color-mix(in oklab, var(--primary) ${Math.round(12 + pct * 88)}%, transparent)`,
                          color: pct > 0.5 ? "var(--primary-foreground)" : "var(--foreground)",
                        }}
                      >
                        {n || ""}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
