import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCompanies } from "@/lib/queries/companies";
import { useProjects } from "@/lib/queries/projects";

export function MatrixView() {
  const { data: companies = [] } = useCompanies();
  const { data: projets = [] } = useProjects();
  const [search, setSearch] = useState("");

  const projetIds = useMemo(() => new Set(projets.map((p) => p.id)), [projets]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return companies
      .filter((c) => !c.exclue)
      .filter((c) => !term || c.nom.toLowerCase().includes(term))
      .map((c) => ({ company: c, count: c.projets.filter((id) => projetIds.has(id)).length }))
      .sort((a, b) => b.count - a.count || a.company.nom.localeCompare(b.company.nom));
  }, [companies, search, projetIds]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Vue en lecture seule — l'édition des relations se fait depuis la fiche entreprise ou la mind
        map.
      </p>
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une entreprise…"
          className="pl-9"
        />
      </div>

      <div className="card-soft themed-scrollbar max-h-[70vh] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-muted/95 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur">
            <tr>
              <th className="sticky left-0 z-20 bg-muted/95 px-4 py-2.5 text-left font-semibold">
                Entreprise
              </th>
              <th className="px-3 py-2.5 text-center font-semibold">Projets</th>
              {projets.map((p) => (
                <th key={p.id} className="min-w-[110px] px-2 py-2.5 text-center font-semibold">
                  <span className="line-clamp-2">{p.nom}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ company, count }) => (
              <tr key={company.id} className="border-t border-border hover:bg-muted/40">
                <td className="sticky left-0 z-10 bg-card px-4 py-2 font-medium">{company.nom}</td>
                <td className="px-3 py-2 text-center text-xs text-muted-foreground">{count}</td>
                {projets.map((p) => (
                  <td key={p.id} className="px-2 py-2 text-center">
                    {company.projets.includes(p.id) ? (
                      <span className="mx-auto grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
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
            Aucune entreprise ne correspond à votre recherche.
          </p>
        )}
      </div>
    </div>
  );
}
