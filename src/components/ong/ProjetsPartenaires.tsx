import { Link } from "@tanstack/react-router";
import { useCompaniesList } from "@/lib/queries/companies";
import { useOngList } from "@/lib/queries/ong";
import { useAllProjects } from "@/lib/queries/projects";

// Par projet : les entreprises (financeurs) et les ONG partenaires qui lui sont liées.
export function ProjetsPartenaires() {
  const { data: projets = [] } = useAllProjects();
  const { data: companies = [] } = useCompaniesList();
  const { data: ongs = [] } = useOngList();

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">Financeurs et ONG partenaires par projet</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {projets
          .filter((p) => p.actif)
          .map((p) => {
            const fin = companies.filter((c) => !c.exclue && c.projets.includes(p.id));
            const part = ongs.filter((o) => o.projets.includes(p.id));
            return (
              <div key={p.id} className="card-soft space-y-3 p-4">
                <h3 className="font-semibold">{p.nom}</h3>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Financeurs · {fin.length}
                  </p>
                  <p className="flex flex-wrap gap-1.5">
                    {fin.slice(0, 12).map((c) => (
                      <Link
                        key={c.id}
                        to="/entreprises/$id"
                        params={{ id: c.id }}
                        className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary-deep hover:underline dark:text-primary"
                      >
                        {c.nom}
                      </Link>
                    ))}
                    {fin.length > 12 && (
                      <span className="text-xs text-muted-foreground">+{fin.length - 12}</span>
                    )}
                    {fin.length === 0 && (
                      <span className="text-xs text-muted-foreground">Aucun</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    ONG partenaires · {part.length}
                  </p>
                  <p className="flex flex-wrap gap-1.5">
                    {part.slice(0, 12).map((o) => (
                      <Link
                        key={o.id}
                        to="/ong/$id"
                        params={{ id: o.id }}
                        className="rounded-md bg-brand-orange/25 px-2 py-0.5 text-xs font-medium text-warning-foreground hover:underline"
                      >
                        {o.nom}
                      </Link>
                    ))}
                    {part.length > 12 && (
                      <span className="text-xs text-muted-foreground">+{part.length - 12}</span>
                    )}
                    {part.length === 0 && (
                      <span className="text-xs text-muted-foreground">Aucune</span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
      </div>
    </section>
  );
}
