import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getProjectColor } from "@/lib/graph-colors";
import type { Company, Projet } from "@/lib/types";

// Diagramme de flux Pays → Secteur → Projet. Chaque flux représente une
// entreprise liée à un projet : une entreprise liée à 3 projets compte 3 fois,
// ce qui garde les trois colonnes cohérentes entre elles.

const W = 1100;
const NODE_W = 14;
const GAP = 10;
const COL_X = [190, 540, W - 250];
const TOP_PAYS = 8;
const TOP_SECTEURS = 15;
const OTHER_PAYS = "Autres pays";
const OTHER_SECTEURS = "Autres secteurs";

const PAYS_COLORS = [
  "#3f8f3f",
  "#2f5aa8",
  "#e08a2b",
  "#703070",
  "#0891b2",
  "#c0392b",
  "#65a30d",
  "#db2777",
];

type Node = {
  key: string;
  label: string;
  col: number;
  value: number;
  color: string;
  y: number;
  h: number;
};
type Link = {
  source: string;
  target: string;
  value: number;
  color: string;
  sy: number;
  ty: number;
  w: number;
};

export function SankeyView({ companies, projets }: { companies: Company[]; projets: Projet[] }) {
  const navigate = useNavigate();
  const [hover, setHover] = useState<string | null>(null);

  const layout = useMemo(() => {
    const pairs = companies.flatMap((c) =>
      c.projets
        .filter((pid) => projets.some((p) => p.id === pid))
        .map((pid) => ({
          pays: c.paysOrigine || "Non renseigné",
          secteur: c.secteur || "Non renseigné",
          projet: pid,
        })),
    );
    const total = pairs.length;
    if (total === 0) return null;

    const rank = (vals: string[], top: number, other: string) => {
      const counts = new Map<string, number>();
      for (const v of vals) counts.set(v, (counts.get(v) ?? 0) + 1);
      const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
      const keep = new Set(sorted.slice(0, top));
      return (v: string) => (keep.has(v) ? v : other);
    };
    const paysOf = rank(
      pairs.map((p) => p.pays),
      TOP_PAYS,
      OTHER_PAYS,
    );
    const secOf = rank(
      pairs.map((p) => p.secteur),
      TOP_SECTEURS,
      OTHER_SECTEURS,
    );
    const flows = pairs.map((p) => ({
      pays: paysOf(p.pays),
      secteur: secOf(p.secteur),
      projet: p.projet,
    }));

    const nodesByCol: Map<string, Node>[] = [new Map(), new Map(), new Map()];
    const add = (col: number, key: string, label: string, color: string) => {
      const m = nodesByCol[col]!;
      const n = m.get(key) ?? { key, label, col, value: 0, color, y: 0, h: 0 };
      n.value += 1;
      m.set(key, n);
    };
    const paysColor = new Map<string, string>();
    for (const f of flows) {
      if (!paysColor.has(f.pays))
        paysColor.set(
          f.pays,
          f.pays === OTHER_PAYS ? "#94a3b8" : PAYS_COLORS[paysColor.size % PAYS_COLORS.length]!,
        );
      add(0, `p:${f.pays}`, f.pays, paysColor.get(f.pays)!);
      add(1, `s:${f.secteur}`, f.secteur, "var(--primary)");
      add(
        2,
        `j:${f.projet}`,
        projets.find((p) => p.id === f.projet)?.nom ?? "Projet",
        getProjectColor(f.projet),
      );
    }

    const maxNodes = Math.max(...nodesByCol.map((m) => m.size));
    const H = Math.max(560, maxNodes * 40);
    const k = (H - GAP * (maxNodes - 1)) / total;
    for (const m of nodesByCol) {
      const sorted = [...m.values()].sort((a, b) => {
        const other = (n: Node) => n.label === OTHER_PAYS || n.label === OTHER_SECTEURS;
        return Number(other(a)) - Number(other(b)) || b.value - a.value;
      });
      const used = sorted.reduce((s, n) => s + n.value * k, 0) + GAP * (sorted.length - 1);
      let y = (H - used) / 2;
      for (const n of sorted) {
        n.h = n.value * k;
        n.y = y;
        y += n.h + GAP;
      }
    }

    const agg = (
      from: (f: (typeof flows)[number]) => string,
      to: (f: (typeof flows)[number]) => string,
    ) => {
      const m = new Map<string, number>();
      for (const f of flows) {
        const key = `${from(f)}|${to(f)}`;
        m.set(key, (m.get(key) ?? 0) + 1);
      }
      return [...m.entries()].map(([key, value]) => {
        const [s, t] = key.split("|") as [string, string];
        return { source: s, target: t, value };
      });
    };
    const rawLinks = [
      ...agg(
        (f) => `p:${f.pays}`,
        (f) => `s:${f.secteur}`,
      ),
      ...agg(
        (f) => `s:${f.secteur}`,
        (f) => `j:${f.projet}`,
      ),
    ];
    const allNodes = new Map<string, Node>();
    for (const m of nodesByCol) for (const [key, n] of m) allNodes.set(key, n);

    const outOff = new Map<string, number>();
    const inOff = new Map<string, number>();
    const links: Link[] = rawLinks
      .sort((a, b) => allNodes.get(a.target)!.y - allNodes.get(b.target)!.y)
      .sort((a, b) => allNodes.get(a.source)!.y - allNodes.get(b.source)!.y)
      .map((l) => {
        const s = allNodes.get(l.source)!;
        const t = allNodes.get(l.target)!;
        const w = l.value * k;
        const sy = s.y + (outOff.get(l.source) ?? 0) + w / 2;
        outOff.set(l.source, (outOff.get(l.source) ?? 0) + w);
        return { ...l, w, sy, ty: 0, color: s.col === 0 ? s.color : t.color };
      });
    for (const l of [...links].sort(
      (a, b) => allNodes.get(a.source)!.y - allNodes.get(b.source)!.y,
    )) {
      const t = allNodes.get(l.target)!;
      l.ty = t.y + (inOff.get(l.target) ?? 0) + l.w / 2;
      inOff.set(l.target, (inOff.get(l.target) ?? 0) + l.w);
    }

    return { nodes: [...allNodes.values()], links, H, total };
  }, [companies, projets]);

  if (!layout) {
    return (
      <p className="card-soft p-8 text-center text-sm text-muted-foreground">
        Aucun lien entreprise-projet pour ces filtres.
      </p>
    );
  }

  const labelOf = (key: string) => key.slice(2);
  const openLink = (l: Link) => {
    const s = labelOf(l.source);
    const t = labelOf(l.target);
    const search: Record<string, string> = {};
    if (l.source.startsWith("p:") && s !== OTHER_PAYS) search["pays"] = s;
    if (l.source.startsWith("s:") && s !== OTHER_SECTEURS) search["secteur"] = s;
    if (l.target.startsWith("s:") && t !== OTHER_SECTEURS) search["secteur"] = t;
    if (l.target.startsWith("j:")) search["projet"] = t;
    void navigate({ to: "/entreprises", search });
  };
  const isActive = (l: Link) => !hover || l.source === hover || l.target === hover;

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      <p className="text-xs text-muted-foreground">
        {layout.total} liens entreprise-projet. Survolez un pays, un secteur ou un projet pour
        isoler ses flux ; cliquez sur un flux pour ouvrir les entreprises concernées.
      </p>
      <div className="card-soft themed-scrollbar overflow-x-auto p-2">
        <svg
          viewBox={`0 0 ${W} ${layout.H + 20}`}
          className="min-w-[860px]"
          role="img"
          aria-label="Flux entre pays d'origine, secteurs et projets Amal Biladi"
        >
          <g transform="translate(0,10)">
            {layout.links.map((l, i) => {
              const s = layout.nodes.find((n) => n.key === l.source)!;
              const t = layout.nodes.find((n) => n.key === l.target)!;
              const x0 = COL_X[s.col]! + NODE_W;
              const x1 = COL_X[t.col]!;
              const mx = (x0 + x1) / 2;
              return (
                <path
                  key={i}
                  d={`M${x0},${l.sy} C${mx},${l.sy} ${mx},${l.ty} ${x1},${l.ty}`}
                  fill="none"
                  stroke={l.color}
                  strokeWidth={Math.max(1, l.w)}
                  strokeOpacity={isActive(l) ? 0.38 : 0.06}
                  className="cursor-pointer transition-[stroke-opacity] duration-200 hover:stroke-opacity-70"
                  onClick={() => openLink(l)}
                >
                  <title>{`${labelOf(l.source)} → ${labelOf(l.target)} : ${l.value}`}</title>
                </path>
              );
            })}
            {layout.nodes.map((n) => {
              const x = COL_X[n.col]!;
              const labelLeft = n.col === 0;
              return (
                <g
                  key={n.key}
                  onMouseEnter={() => setHover(n.key)}
                  onMouseLeave={() => setHover(null)}
                  className="cursor-default"
                >
                  <rect
                    x={x}
                    y={n.y}
                    width={NODE_W}
                    height={Math.max(2, n.h)}
                    rx={3}
                    fill={n.color}
                  />
                  <text
                    x={labelLeft ? x - 8 : x + NODE_W + 8}
                    y={n.y + n.h / 2}
                    dy="0.35em"
                    textAnchor={labelLeft ? "end" : "start"}
                    className="fill-foreground text-[12px] font-medium"
                    style={{ paintOrder: "stroke", stroke: "var(--card)", strokeWidth: 4 }}
                  >
                    {n.label.length > 34 ? `${n.label.slice(0, 33)}…` : n.label}
                    <tspan className="fill-muted-foreground" dx="6">
                      {n.value}
                    </tspan>
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      <div className="grid grid-cols-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Pays d'origine</span>
        <span>Secteur</span>
        <span>Projet Amal Biladi</span>
      </div>
    </div>
  );
}
