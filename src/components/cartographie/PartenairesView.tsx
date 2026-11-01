import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { HeartHandshake } from "lucide-react";
import { typeStructureLabel } from "@/lib/ong-utils";
import { useOngList } from "@/lib/queries/ong";
import type { CompanyListItem, Projet } from "@/lib/types";
import { cn } from "@/lib/utils";

// Les projets au centre, les financeurs (entreprises) d'un côté, les ONG
// partenaires de l'autre : qui peut financer, et qui peut relayer ou conseiller.
export function PartenairesView({
  companies,
  projets,
  focusProjet,
  onOpen,
}: {
  companies: CompanyListItem[];
  projets: Projet[];
  focusProjet?: string | undefined;
  onOpen: (id: string) => void;
}) {
  const { data: ongs = [] } = useOngList();
  const [choisi, setChoisi] = useState<string | undefined>(focusProjet);
  const actif = projets.find((p) => p.id === choisi) ?? projets[0];

  const financeurs = actif ? companies.filter((c) => c.projets.includes(actif.id)) : [];
  const partenaires = actif ? ongs.filter((o) => o.projets.includes(actif.id)) : [];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_16rem_1fr]">
      <section className="card-soft p-4">
        <h3 className="mb-3 text-sm font-semibold">Financeurs · {financeurs.length}</h3>
        <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
          {financeurs.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onOpen(c.id)}
                className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary"
              >
                {c.nom}
                {c.secteur && (
                  <span className="block text-xs text-muted-foreground">{c.secteur}</span>
                )}
              </button>
            </li>
          ))}
          {financeurs.length === 0 && (
            <li className="text-sm text-muted-foreground">Aucune entreprise pour ce projet.</li>
          )}
        </ul>
      </section>

      <nav aria-label="Projets" className="order-first space-y-2 lg:order-none">
        {projets.map((p) => {
          const on = p.id === actif?.id;
          const nf = companies.filter((c) => c.projets.includes(p.id)).length;
          const no = ongs.filter((o) => o.projets.includes(p.id)).length;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              onClick={() => setChoisi(p.id)}
              className={cn(
                "w-full rounded-xl border p-3 text-left transition-all",
                on
                  ? "brand-gradient border-transparent text-primary-foreground shadow-md"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <span className="block text-sm font-semibold">{p.nom}</span>
              <span
                className={cn(
                  "text-xs",
                  on ? "text-primary-foreground/80" : "text-muted-foreground",
                )}
              >
                {nf} financeurs · {no} ONG
              </span>
            </button>
          );
        })}
      </nav>

      <section className="card-soft p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <HeartHandshake className="h-4 w-4 text-brand-orange" />
          ONG partenaires · {partenaires.length}
        </h3>
        <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
          {partenaires.map((o) => (
            <li key={o.id}>
              <Link
                to="/ong/$id"
                params={{ id: o.id }}
                className="block rounded-md px-2 py-1.5 text-sm hover:bg-secondary"
              >
                {o.nom}
                <span className="block text-xs text-muted-foreground">
                  {typeStructureLabel(o.typeStructure)}
                  {o.projetPrincipalId === actif?.id && " · projet principal"}
                </span>
              </Link>
            </li>
          ))}
          {partenaires.length === 0 && (
            <li className="text-sm text-muted-foreground">Aucune ONG pour ce projet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
