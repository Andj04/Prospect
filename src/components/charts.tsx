import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Segment = { label: string; value: number; color: string; onClick?: () => void };

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return mounted;
}

// Anneau de répartition (SVG) : chaque segment se dessine à l'arrivée.
export function Donut({
  segments,
  centerValue,
  centerLabel,
  size = 168,
}: {
  segments: Segment[];
  centerValue: ReactNode;
  centerLabel: string;
  size?: number;
}) {
  const mounted = useMounted();
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" strokeWidth="12" className="stroke-muted" />
          {segments.map((s) => {
            const len = total > 0 ? (s.value / total) * c : 0;
            const dash = mounted ? `${Math.max(len - 1.2, 0)} ${c}` : `0 ${c}`;
            const el = (
              <circle
                key={s.label}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth="12"
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                className={cn(
                  "transition-[stroke-dasharray] duration-1000 ease-out motion-reduce:transition-none",
                  s.onClick && "cursor-pointer hover:opacity-80",
                )}
                onClick={s.onClick}
              >
                <title>{`${s.label} : ${s.value}`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-2xl font-extrabold tabular-nums leading-none">{centerValue}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{centerLabel}</p>
          </div>
        </div>
      </div>
      <ul className="w-full space-y-1.5">
        {segments.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          const inner = (
            <>
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="min-w-0 flex-1 truncate text-sm">{s.label}</span>
              <span className="text-sm font-semibold tabular-nums">{s.value}</span>
              <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                {pct}%
              </span>
            </>
          );
          return (
            <li key={s.label}>
              {s.onClick ? (
                <button
                  type="button"
                  onClick={s.onClick}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-secondary"
                >
                  {inner}
                </button>
              ) : (
                <div className="flex items-center gap-2 px-2 py-1">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export type FunnelStage = { label: string; value: number; color: string; onClick?: () => void };

// Entonnoir horizontal : largeur proportionnelle au plus grand palier.
export function Funnel({ stages }: { stages: FunnelStage[] }) {
  const mounted = useMounted();
  const max = Math.max(1, ...stages.map((s) => s.value));
  return (
    <ol className="space-y-2">
      {stages.map((s, i) => {
        const w = (s.value / max) * 100;
        const prev = i > 0 ? stages[i - 1]!.value : null;
        const conv = prev && prev > 0 ? Math.round((s.value / prev) * 100) : null;
        return (
          <li key={s.label}>
            <button
              type="button"
              onClick={s.onClick}
              disabled={!s.onClick}
              className="group flex w-full items-center gap-3 text-left disabled:cursor-default"
            >
              <span className="w-44 shrink-0 truncate text-sm text-foreground/85">{s.label}</span>
              <span className="relative h-7 flex-1 overflow-hidden rounded-md bg-muted">
                <span
                  className="absolute inset-y-0 left-0 rounded-md transition-[width] duration-700 ease-out group-hover:brightness-110 motion-reduce:transition-none"
                  style={{
                    width: mounted ? `${Math.max(w, s.value ? 3 : 0)}%` : "0%",
                    backgroundColor: s.color,
                  }}
                />
                <span className="relative flex h-full items-center px-2 text-xs font-semibold tabular-nums">
                  {s.value}
                </span>
              </span>
              <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {conv !== null ? `${conv}%` : ""}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
