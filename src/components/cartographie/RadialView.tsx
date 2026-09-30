import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProjectColor } from "@/lib/graph-colors";
import type { Company, Projet, SousComposante } from "@/lib/types";
import { cn } from "@/lib/utils";

// Arbre radial d'un projet : le projet au centre, ses sous-composantes sur un
// premier anneau, les entreprises en périphérie. Un seul projet à la fois
// pour rester lisible même au-delà de 150 entreprises.

const R1 = 175;

type Leaf = { company: Company; angle: number; branch: string };
type Branch = { key: string; label: string; angle: number; count: number };

export function RadialView({
  companies,
  projets,
  sousComposantes,
  projetId,
  onProjetChange,
  onOpen,
}: {
  companies: Company[];
  projets: Projet[];
  sousComposantes: SousComposante[];
  projetId: string | undefined;
  onProjetChange: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const current = projets.find((p) => p.id === projetId) ?? projets[0];
  const color = current ? getProjectColor(current.id) : "var(--primary)";
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoverBranch, setHoverBranch] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Écouteur non passif : sinon la page défile en même temps qu'on zoome.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      setZoom((z) => Math.min(3, Math.max(0.5, z * (e.deltaY < 0 ? 1.1 : 0.9))));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [projets.length, companies.length]);

  const tree = useMemo(() => {
    if (!current) return null;
    const linked = companies.filter((c) => c.projets.includes(current.id));
    const scs = sousComposantes.filter((s) => s.projetId === current.id);
    const groups = scs
      .map((s) => ({
        key: s.id,
        label: s.nom,
        members: linked.filter((c) => c.sousComposantes.includes(s.id)),
      }))
      .filter((g) => g.members.length > 0);
    const orphans = linked.filter((c) => !scs.some((s) => c.sousComposantes.includes(s.id)));
    if (orphans.length)
      groups.push({ key: "none", label: "Sans sous-composante", members: orphans });
    // Alterne grandes et petites branches pour que les petites ne se
    // retrouvent pas côte à côte (étiquettes qui se chevauchent).
    const bySize = [...groups].sort((x, y) => y.members.length - x.members.length);
    groups.length = 0;
    while (bySize.length) {
      groups.push(bySize.shift()!);
      if (bySize.length) groups.push(bySize.pop()!);
    }

    const leavesCount = groups.reduce((s, g) => s + g.members.length, 0);
    const gapSlots = groups.length; // un espace vide entre deux branches
    const step = (2 * Math.PI) / Math.max(1, leavesCount + gapSlots);
    const leaves: Leaf[] = [];
    const branches: Branch[] = [];
    let a = -Math.PI / 2;
    for (const g of groups) {
      const start = a;
      for (const c of [...g.members].sort((x, y) => x.nom.localeCompare(y.nom))) {
        leaves.push({ company: c, angle: a + step / 2, branch: g.key });
        a += step;
      }
      branches.push({
        key: g.key,
        label: g.label,
        angle: (start + a) / 2,
        count: g.members.length,
      });
      a += step;
    }
    const r2 = Math.min(420, Math.max(260, leavesCount * 2.4));
    return { leaves, branches, r2, total: linked.length };
  }, [companies, sousComposantes, current]);

  if (!current || !tree) {
    return <p className="card-soft p-8 text-center text-sm text-muted-foreground">Aucun projet.</p>;
  }

  const polar = (r: number, angle: number) => ({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
  const onDown = (e: PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  };
  const onMove = (e: PointerEvent) => {
    if (!drag.current) return;
    setPan({
      x: drag.current.px + (e.clientX - drag.current.x),
      y: drag.current.py + (e.clientY - drag.current.y),
    });
  };
  const fontSize = tree.leaves.length > 120 ? 9 : tree.leaves.length > 60 ? 10.5 : 12;
  // Marge pour les noms d'entreprise écrits vers l'extérieur de l'anneau.
  const half = tree.r2 + fontSize * 20;

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      <div className="flex flex-wrap gap-1.5">
        {projets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              onProjetChange(p.id);
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
              p.id === current.id
                ? "border-transparent text-white shadow-sm"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
            style={p.id === current.id ? { backgroundColor: getProjectColor(p.id) } : undefined}
          >
            {p.nom}
          </button>
        ))}
      </div>

      <div className="card-soft relative overflow-hidden">
        <div className="absolute right-3 top-3 z-10 flex gap-1">
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => setZoom((z) => Math.min(3, z * 1.2))}
            aria-label="Zoomer"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => setZoom((z) => Math.max(0.5, z / 1.2))}
            aria-label="Dézoomer"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            aria-label="Recentrer"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        <p className="absolute left-4 top-3 z-10 text-xs text-muted-foreground">
          {tree.total} entreprises · molette pour zoomer, glisser pour déplacer
        </p>
        <svg
          viewBox={`${-half} ${-half} ${half * 2} ${half * 2}`}
          className="h-[72vh] w-full cursor-grab touch-none active:cursor-grabbing"
          ref={svgRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={() => (drag.current = null)}
          role="img"
          aria-label={`Entreprises liées au projet ${current.nom}`}
        >
          <g
            transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}
            className="transition-transform duration-150"
          >
            {tree.branches.map((b) => {
              const p1 = polar(R1, b.angle);
              const dim = hoverBranch && hoverBranch !== b.key;
              return (
                <line
                  key={b.key}
                  x1={0}
                  y1={0}
                  x2={p1.x}
                  y2={p1.y}
                  stroke={color}
                  strokeWidth={2.5}
                  strokeOpacity={dim ? 0.15 : 0.6}
                />
              );
            })}
            {tree.leaves.map((l, i) => {
              const b = tree.branches.find((x) => x.key === l.branch)!;
              const p1 = polar(R1, b.angle);
              const p2 = polar(tree.r2 - 8, l.angle);
              const c = polar((R1 + tree.r2) / 2, l.angle);
              const dim = hoverBranch && hoverBranch !== l.branch;
              return (
                <path
                  key={`${l.company.id}-${i}`}
                  d={`M${p1.x},${p1.y} Q${c.x},${c.y} ${p2.x},${p2.y}`}
                  fill="none"
                  stroke={color}
                  strokeOpacity={dim ? 0.05 : 0.28}
                  strokeWidth={1}
                />
              );
            })}
            {tree.leaves.map((l, i) => {
              const p = polar(tree.r2, l.angle);
              const deg = (l.angle * 180) / Math.PI;
              const flip = Math.cos(l.angle) < 0;
              const dim = hoverBranch && hoverBranch !== l.branch;
              const name =
                l.company.nom.length > 38 ? `${l.company.nom.slice(0, 37)}…` : l.company.nom;
              return (
                <g
                  key={`leaf-${l.company.id}-${i}`}
                  transform={`translate(${p.x} ${p.y}) rotate(${flip ? deg + 180 : deg})`}
                  className="cursor-pointer"
                  opacity={dim ? 0.25 : 1}
                  onClick={() => onOpen(l.company.id)}
                >
                  <circle r={3.5} cx={flip ? 4 : -4} fill={color} />
                  <text
                    x={flip ? -4 : 4}
                    dy="0.35em"
                    textAnchor={flip ? "end" : "start"}
                    className="fill-foreground transition-colors hover:fill-primary"
                    style={{ fontSize }}
                  >
                    {name}
                  </text>
                </g>
              );
            })}
            {tree.branches.map((b) => {
              const p1 = polar(R1, b.angle);
              const right = Math.cos(b.angle) >= 0;
              const off = polar(16, b.angle);
              return (
                <g
                  key={`b-${b.key}`}
                  transform={`translate(${p1.x} ${p1.y})`}
                  onMouseEnter={() => setHoverBranch(b.key)}
                  onMouseLeave={() => setHoverBranch(null)}
                  className="cursor-default"
                >
                  <circle r={9} fill="var(--card)" stroke={color} strokeWidth={3} />
                  <text
                    x={off.x + (right ? 4 : -4)}
                    y={off.y}
                    dy="0.35em"
                    textAnchor={right ? "start" : "end"}
                    className="fill-foreground text-[12px] font-semibold"
                    style={{ paintOrder: "stroke", stroke: "var(--card)", strokeWidth: 5 }}
                  >
                    {b.label.length > 30 ? `${b.label.slice(0, 29)}…` : b.label} ({b.count})
                  </text>
                </g>
              );
            })}
            <circle r={62} fill={color} />
            <foreignObject x={-58} y={-40} width={116} height={80}>
              <div className="flex h-full items-center justify-center text-center text-[13px] font-bold leading-tight text-white">
                {current.nom}
              </div>
            </foreignObject>
          </g>
        </svg>
      </div>
    </div>
  );
}
