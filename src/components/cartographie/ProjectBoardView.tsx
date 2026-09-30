import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { CompanyAvatar } from "@/components/CompanyPreviewSheet";
import { getProjectColor } from "@/lib/graph-colors";
import { getSousComposanteIcon } from "@/lib/sous-composante-icons";
import type { Company, Projet, SousComposante } from "@/lib/types";
import { cn } from "@/lib/utils";

type Group = { key: string; label: string; icon: string | null; companies: Company[] };

function ProjectColumn({
  projet,
  groups,
  total,
  highlighted,
  onOpen,
}: {
  projet: Projet;
  groups: Group[];
  total: number;
  highlighted: boolean;
  onOpen: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const color = getProjectColor(projet.id);
  return (
    <section
      id={`col-${projet.id}`}
      className={cn(
        "flex max-h-[72vh] w-[300px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border bg-secondary/50 transition-shadow duration-500",
        highlighted ? "border-primary shadow-lg ring-2 ring-primary/30" : "border-border",
      )}
    >
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="mb-2 h-1 w-10 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="text-sm font-bold leading-snug">{projet.nom}</h3>
        <p className="text-xs text-muted-foreground">
          {total} entreprise{total > 1 ? "s" : ""}
        </p>
      </header>
      <div className="themed-scrollbar flex-1 space-y-2 overflow-y-auto p-2">
        {groups.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            Aucune entreprise pour ces filtres.
          </p>
        )}
        {groups.map((g) => {
          const Icon = g.icon ? getSousComposanteIcon(g.icon) : null;
          const isCollapsed = collapsed.has(g.key);
          return (
            <div key={g.key} className="rounded-xl bg-card shadow-sm">
              <button
                type="button"
                onClick={() =>
                  setCollapsed((prev) => {
                    const next = new Set(prev);
                    if (next.has(g.key)) next.delete(g.key);
                    else next.add(g.key);
                    return next;
                  })
                }
                className="flex w-full items-center gap-2 px-3 py-2 text-left"
              >
                {Icon ? (
                  <Icon className="h-4 w-4 shrink-0" style={{ color }} />
                ) : (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" />
                )}
                <span className="min-w-0 flex-1 truncate text-xs font-semibold">{g.label}</span>
                <span className="rounded-full bg-muted px-1.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
                  {g.companies.length}
                </span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-muted-foreground transition-transform",
                    isCollapsed && "-rotate-90",
                  )}
                />
              </button>
              {!isCollapsed && (
                <ul className="space-y-0.5 px-1.5 pb-1.5">
                  {g.companies.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => onOpen(c.id)}
                        className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-sm transition-colors hover:bg-secondary"
                      >
                        <CompanyAvatar company={c} size={24} />
                        <span className="min-w-0 truncate">{c.nom}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Tableau façon Kanban : une colonne par projet, les entreprises regroupées
// par sous-composante. Une entreprise liée à plusieurs sous-composantes
// apparaît dans chacune.
export function ProjectBoardView({
  companies,
  projets,
  sousComposantes,
  focusProjet,
  onOpen,
}: {
  companies: Company[];
  projets: Projet[];
  sousComposantes: SousComposante[];
  focusProjet?: string | undefined;
  onOpen: (id: string) => void;
}) {
  const boardRef = useRef<HTMLDivElement>(null);

  const columns = useMemo(
    () =>
      projets.map((p) => {
        const linked = companies.filter((c) => c.projets.includes(p.id));
        const scs = sousComposantes.filter((s) => s.projetId === p.id);
        const groups: Group[] = scs
          .map((s) => ({
            key: s.id,
            label: s.nom,
            icon: s.icone,
            companies: linked.filter((c) => c.sousComposantes.includes(s.id)),
          }))
          .filter((g) => g.companies.length > 0)
          .sort((a, b) => b.companies.length - a.companies.length);
        const orphans = linked.filter((c) => !scs.some((s) => c.sousComposantes.includes(s.id)));
        if (orphans.length)
          groups.push({
            key: `${p.id}-none`,
            label: "Sans sous-composante précisée",
            icon: null,
            companies: orphans,
          });
        return { projet: p, groups, total: linked.length };
      }),
    [companies, projets, sousComposantes],
  );

  useEffect(() => {
    if (!focusProjet) return;
    const el = boardRef.current?.querySelector(`#col-${CSS.escape(focusProjet)}`);
    el?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }, [focusProjet]);

  return (
    <div
      ref={boardRef}
      className="themed-scrollbar flex snap-x gap-3 overflow-x-auto pb-3 animate-in fade-in duration-300"
    >
      {columns.map((col) => (
        <ProjectColumn
          key={col.projet.id}
          projet={col.projet}
          groups={col.groups}
          total={col.total}
          highlighted={focusProjet === col.projet.id}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}
