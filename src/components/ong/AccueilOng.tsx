import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BellRing, HeartHandshake, Link2, Search } from "lucide-react";
import { StatCard, StatGrid } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { isOngOverdue, normaliser } from "@/lib/ong-utils";
import { useCompaniesList } from "@/lib/queries/companies";
import { useOngList } from "@/lib/queries/ong";
import { useOngPipeline } from "@/lib/queries/pipeline-ong";
import { cn } from "@/lib/utils";

const MAX = 8;

// Accueil : recherche sur les deux bases (le type est visible dans chaque
// résultat) et repères côté ONG.
export function AccueilOng() {
  const { data: companies = [] } = useCompaniesList();
  const { data: ongs = [] } = useOngList();
  const { data: pipeline = [] } = useOngPipeline();
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const needle = normaliser(q);
    if (needle.length < 2) return [];
    const e = companies
      .filter((c) => !c.exclue && normaliser(c.recherche).includes(needle))
      .map((c) => ({
        key: `e-${c.id}`,
        type: "entreprise" as const,
        id: c.id,
        nom: c.nom,
        detail: c.secteur ?? "",
      }));
    const o = ongs
      .filter((x) => normaliser(x.recherche).includes(needle))
      .map((x) => ({
        key: `o-${x.id}`,
        type: "ong" as const,
        id: x.id,
        nom: x.nom,
        detail: x.siege ?? "",
      }));
    return [...e, ...o].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  }, [q, companies, ongs]);

  const retards = pipeline.filter((p) => isOngOverdue(p)).length;
  const passerelles = ongs.reduce((n, o) => n + o.nbPasserelles, 0);

  return (
    <section className="space-y-4">
      <div className="card-soft p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher dans les entreprises et les ONG…"
            className="pl-9"
            aria-label="Recherche entreprises et ONG"
          />
        </div>
        {q.trim().length >= 2 && (
          <ul className="mt-3 divide-y divide-border">
            {results.slice(0, MAX).map((r) => (
              <li key={r.key} className="flex items-center gap-3 py-2 text-sm">
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    r.type === "ong"
                      ? "bg-brand-orange/25 text-warning-foreground"
                      : "bg-primary/10 text-primary-deep",
                  )}
                >
                  {r.type === "ong" ? "ONG" : "Entreprise"}
                </span>
                {r.type === "ong" ? (
                  <Link to="/ong/$id" params={{ id: r.id }} className="font-medium hover:underline">
                    {r.nom}
                  </Link>
                ) : (
                  <Link
                    to="/entreprises/$id"
                    params={{ id: r.id }}
                    className="font-medium hover:underline"
                  >
                    {r.nom}
                  </Link>
                )}
                <span className="ml-auto truncate text-xs text-muted-foreground">{r.detail}</span>
              </li>
            ))}
            {results.length === 0 && (
              <li className="py-3 text-sm text-muted-foreground">Aucun résultat.</li>
            )}
            {results.length > MAX && (
              <li className="pt-2 text-xs text-muted-foreground">
                {results.length - MAX} autres résultats : affinez la recherche.
              </li>
            )}
          </ul>
        )}
      </div>
      {ongs.length > 0 && (
        <StatGrid>
          <StatCard
            label="ONG partenaires potentielles"
            value={ongs.length}
            icon={<HeartHandshake className="h-5 w-5" />}
            tone="orange"
          />
          <StatCard
            label="Relances ONG en retard"
            value={retards}
            icon={<BellRing className="h-5 w-5" />}
            tone={retards ? "red" : "neutral"}
            index={1}
          />
          <StatCard
            label="Passerelles validées"
            value={passerelles}
            icon={<Link2 className="h-5 w-5" />}
            tone="green"
            index={2}
          />
        </StatGrid>
      )}
    </section>
  );
}
