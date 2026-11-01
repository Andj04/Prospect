import { MAROC_REGION_CENTRES, MAROC_REGION_PATHS, MAROC_VIEWBOX } from "@/lib/maroc-regions";
import { REGIONS, type RegionCode } from "@/lib/types";
import { cn } from "@/lib/utils";

export const regionNom = (code: string) => REGIONS.find((r) => r.code === code)?.nom ?? code;

// Teinte primaire de l'app (250) : plus la région compte d'ONG, plus elle est foncée.
function fillFor(count: number, max: number) {
  if (count <= 0) return "var(--muted)";
  const pct = 18 + Math.round((count / Math.max(max, 1)) * 72);
  return `color-mix(in oklab, var(--primary) ${pct}%, var(--card))`;
}

// Carte choroplèthe des 12 régions : un simple <svg> avec douze <path>, sans
// service de tuiles ni bibliothèque cartographique.
export function MarocCarte({
  counts,
  selected,
  onSelect,
  className,
  showCounts = true,
}: {
  counts: Partial<Record<RegionCode, number>>;
  selected?: RegionCode | null;
  onSelect?: (code: RegionCode | null) => void;
  className?: string;
  showCounts?: boolean;
}) {
  const max = Math.max(0, ...Object.values(counts).map((n) => n ?? 0));
  return (
    <figure className={cn("m-0", className)}>
      <svg
        viewBox={MAROC_VIEWBOX}
        role="img"
        aria-label="Carte des régions du Maroc"
        className="h-auto w-full"
      >
        {REGIONS.map(({ code, nom }) => {
          const n = counts[code] ?? 0;
          const active = selected === code;
          return (
            <path
              key={code}
              d={MAROC_REGION_PATHS[code]}
              fill={fillFor(n, max)}
              stroke={active ? "var(--primary-deep)" : "var(--card)"}
              strokeWidth={active ? 5 : 2}
              strokeLinejoin="round"
              className={cn(
                "transition-[fill,stroke-width] duration-200",
                onSelect && "cursor-pointer hover:brightness-95",
              )}
              onClick={onSelect ? () => onSelect(active ? null : code) : undefined}
            >
              <title>{`${nom} : ${n} ONG`}</title>
            </path>
          );
        })}
        {showCounts &&
          REGIONS.map(({ code }) => {
            const n = counts[code] ?? 0;
            if (n === 0) return null;
            const [x, y] = MAROC_REGION_CENTRES[code];
            return (
              <text
                key={code}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={34}
                fontWeight={700}
                className="pointer-events-none select-none"
                fill={
                  n / Math.max(max, 1) > 0.45 ? "var(--primary-foreground)" : "var(--foreground)"
                }
              >
                {n}
              </text>
            );
          })}
      </svg>
      <figcaption className="mt-1 text-[11px] text-muted-foreground">
        Fond de carte : morocco-map, ODbL
      </figcaption>
    </figure>
  );
}

// Mini carte de la fiche ONG : régions de l'ONG surlignées.
export function MiniCarteRegions({
  regions,
  className,
}: {
  regions: RegionCode[];
  className?: string;
}) {
  const counts = Object.fromEntries(regions.map((r) => [r, 1])) as Partial<
    Record<RegionCode, number>
  >;
  return <MarocCarte counts={counts} showCounts={false} {...(className ? { className } : {})} />;
}
