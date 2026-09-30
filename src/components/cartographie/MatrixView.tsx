import { useMemo } from "react";
import { Check } from "lucide-react";
import { getProjectColor } from "@/lib/graph-colors";
import type { Company, Projet } from "@/lib/types";

// Vue tableau : une ligne par entreprise, une colonne par projet.
export function MatrixView({
  companies,
  projets,
  onOpen,
}: {
  companies: Company[];
  projets: Projet[];
  onOpen: (id: string) => void;
}) {
  const projetIds = useMemo(() => new Set(projets.map((p) => p.id)), [projets]);

  const rows = useMemo(
    () =>
      companies
        .map((c) => ({ company: c, count: c.projets.filter((id) => projetIds.has(id)).length }))
        .sort((a, b) => b.count - a.count || a.company.nom.localeCompare(b.company.nom)),
    [companies, projetIds],
  );

  return (
    <div className="card-soft themed-scrollbar max-h-[72vh] overflow-auto animate-in fade-in duration-300">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-muted/95 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur">
          <tr>
            <th className="sticky left-0 z-20 bg-muted/95 px-4 py-2.5 text-left font-semibold">
              Entreprise
            </th>
            <th className="px-3 py-2.5 text-center font-semibold">Projets</th>
            {projets.map((p) => (
              <th key={p.id} className="min-w-[110px] px-2 py-2.5 text-center font-semibold">
                <span
                  className="mx-auto mb-1 block h-1 w-8 rounded-full"
                  style={{ backgroundColor: getProjectColor(p.id) }}
                />
                <span className="line-clamp-2 normal-case">{p.nom}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ company, count }) => (
            <tr key={company.id} className="border-t border-border hover:bg-secondary/60">
              <td className="sticky left-0 z-10 bg-card px-4 py-2 font-medium">
                <button
                  type="button"
                  onClick={() => onOpen(company.id)}
                  className="text-left hover:text-primary hover:underline"
                >
                  {company.nom}
                </button>
              </td>
              <td className="px-3 py-2 text-center text-xs text-muted-foreground">{count}</td>
              {projets.map((p) => (
                <td key={p.id} className="px-2 py-2 text-center">
                  {company.projets.includes(p.id) ? (
                    <span
                      className="mx-auto grid h-5 w-5 place-items-center rounded-full text-white"
                      style={{ backgroundColor: getProjectColor(p.id) }}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                  ) : (
                    <span className="text-muted-foreground/30">—</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          Aucune entreprise ne correspond à ces filtres.
        </p>
      )}
    </div>
  );
}
