import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useCountUp } from "@/hooks/use-count-up";
import { cn } from "@/lib/utils";
import { reveal } from "@/lib/reveal";

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
    <div className="flex flex-wrap items-start justify-between gap-4 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="min-w-0">
        <h1 className="text-3xl font-extrabold tracking-tight text-primary-deep text-balance dark:text-foreground">
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

export type Tone = "blue" | "green" | "orange" | "red" | "neutral";

const TONE: Record<Tone, string> = {
  blue: "bg-primary/10 text-primary",
  green: "bg-success/15 text-success",
  orange: "bg-brand-orange/25 text-warning-foreground",
  red: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

export function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const v = useCountUp(value);
  return (
    <>
      {v.toLocaleString("fr-FR", {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
      })}
    </>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "blue",
  onClick,
  index = 0,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: ReactNode;
  tone?: Tone;
  onClick?: () => void;
  index?: number;
}) {
  const r = reveal(index);
  const content = (
    <>
      <span
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110",
          TONE[tone],
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 text-left">
        <p className="text-2xl font-bold leading-none tabular-nums">
          {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
        </p>
        <p className="mt-1 truncate text-sm font-medium text-foreground/80">{label}</p>
        {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
    </>
  );
  const base = cn(
    "card-soft group flex items-center gap-4 p-4 transition-all duration-200",
    onClick &&
      "cursor-pointer hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary",
    r.className,
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={base} style={r.style}>
      {content}
    </button>
  ) : (
    <div className={base} style={r.style}>
      {content}
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

// Carte de répartition générique (secteur, pays, champs manquants…).
// - `total` : base du pourcentage (ex. nombre d'entreprises). Par défaut, la
//   somme des lignes — ce qui n'a de sens que si les lignes sont exclusives.
// - `limit` : au-delà, les lignes suivantes sont repliées derrière un bouton.
// - `onItemClick` : rend chaque ligne cliquable (ex. ouvrir la liste filtrée).
export function DistributionCard({
  title,
  items,
  emptyLabel = "Aucune donnée pour l'instant.",
  total,
  limit = 8,
  onItemClick,
  action,
}: {
  title: string;
  items: { label: string; count: number; tone?: Tone }[];
  emptyLabel?: string;
  total?: number;
  limit?: number;
  onItemClick?: (label: string) => void;
  action?: ReactNode;
}) {
  const base = total ?? items.reduce((sum, i) => sum + i.count, 0);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const visible = expanded ? items : items.slice(0, limit);
  const hidden = items.length - visible.length;

  return (
    <div className="card-soft flex flex-col p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="space-y-1">
          {visible.map(({ label, count, tone = "blue" }) => {
            const pct = base > 0 ? Math.round((count / base) * 100) : 0;
            const row = (
              <>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-foreground/85">{label}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {count} <span className="text-xs">({pct}%)</span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none",
                      BAR_TONE[tone],
                    )}
                    style={{ width: mounted ? `${pct}%` : "0%" }}
                  />
                </div>
              </>
            );
            return (
              <li key={label}>
                {onItemClick ? (
                  <button
                    type="button"
                    onClick={() => onItemClick(label)}
                    className="block w-full rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-secondary"
                  >
                    {row}
                  </button>
                ) : (
                  <div className="px-2 py-1.5">{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {items.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 inline-flex items-center gap-1 self-start rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/5"
        >
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")}
          />
          {expanded ? "Réduire" : `Afficher les ${hidden} autres`}
        </button>
      )}
    </div>
  );
}
