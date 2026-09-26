import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-3xl font-extrabold tracking-tight text-primary-deep dark:text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-3xl text-[0.95rem] text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

type Tone = "blue" | "green" | "orange" | "red" | "neutral";

const TONE: Record<Tone, string> = {
  blue: "bg-primary/10 text-primary",
  green: "bg-success/15 text-success",
  orange: "bg-brand-orange/25 text-warning-foreground",
  red: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "blue",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="card-soft flex items-center gap-4 p-4">
      <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", TONE[tone])}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none tabular-nums">{value}</p>
        <p className="mt-1 truncate text-sm font-medium text-foreground/80">{label}</p>
        {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

const BAR_TONE: Record<Tone, string> = {
  blue: "bg-primary",
  green: "bg-success",
  orange: "bg-brand-orange",
  red: "bg-destructive",
  neutral: "bg-muted-foreground/40",
};

// Carte de répartition générique (secteur, pays d'origine, statut pipeline…) :
// une liste d'items triés par l'appelant, chacun avec sa barre proportionnelle
// au total — évite de dupliquer ce calcul pour chaque nouvelle statistique.
export function DistributionCard({
  title,
  items,
  emptyLabel = "Aucune donnée pour l'instant.",
}: {
  title: string;
  items: { label: string; count: number; tone?: Tone }[];
  emptyLabel?: string;
}) {
  const total = items.reduce((sum, i) => sum + i.count, 0);
  return (
    <div className="card-soft p-4 sm:p-5">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map(({ label, count, tone = "blue" }) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <li key={label}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-foreground/85">{label}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {count} <span className="text-xs">({pct}%)</span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", BAR_TONE[tone])}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
