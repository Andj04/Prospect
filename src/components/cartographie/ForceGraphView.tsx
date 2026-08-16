import { useEffect, useMemo, useRef, useState } from "react";
import type { ForceGraphMethods, LinkObject, NodeObject } from "react-force-graph-2d";
import Fuse from "fuse.js";
import { Filter, RotateCcw, Search, X } from "lucide-react";
import { EntrepriseDetailsSheet } from "@/components/cartographie/EntrepriseDetailsSheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { getEntrepriseColors, getProjectColor, GRAPH_NEUTRAL_COLOR } from "@/lib/graph-colors";
import { useCompanies } from "@/lib/queries/companies";
import { usePipeline } from "@/lib/queries/pipeline";
import { useProjects } from "@/lib/queries/projects";
import { SECTEUR_OPTIONS, STATUTS, type PipelineStatut } from "@/lib/types";

const NODE_REL_SIZE = 4;

type ProjetNodeData = {
  kind: "projet";
  projetId: string;
  nom: string;
  color: string;
};

type EntrepriseNodeData = {
  kind: "entreprise";
  entrepriseId: string;
  nom: string;
  secteur?: string;
  logoUrl?: string;
  projetIds: string[];
  colors: string[];
};

type GraphNodeData = ProjetNodeData | EntrepriseNodeData;
type LinkData = object;
type GraphNode = NodeObject<GraphNodeData>;
type GraphLink = LinkObject<GraphNodeData, LinkData>;

function initials(nom: string) {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function nodeVal(node: GraphNode): number {
  return node.kind === "projet" ? 10 : Math.min(9, 2.5 + node.projetIds.length * 1.5);
}

function resolveEndpointId(
  endpoint: string | number | NodeObject<GraphNodeData> | undefined,
): string {
  if (endpoint == null) return "";
  if (typeof endpoint === "object") return String(endpoint.id ?? "");
  return String(endpoint);
}

function toggleInSet<T>(setter: (updater: (prev: Set<T>) => Set<T>) => void, value: T) {
  setter((prev) => {
    const next = new Set(prev);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  });
}

export function ForceGraphView() {
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const { data: projets = [], isLoading: projetsLoading } = useProjects();
  const { data: pipeline = [] } = usePipeline();

  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods<GraphNodeData, LinkData>>(undefined);
  const logoCache = useRef(new Map<string, HTMLImageElement>());
  const initializedRef = useRef(false);

  // react-force-graph-2d (and its force-graph dependency) touch `window` at
  // module scope, which crashes during SSR — load it dynamically so the
  // import only ever runs in the browser.
  const [ForceGraph2D, setForceGraph2D] = useState<
    (typeof import("react-force-graph-2d"))["default"] | null
  >(null);
  useEffect(() => {
    let cancelled = false;
    void import("react-force-graph-2d").then((mod) => {
      if (!cancelled) setForceGraph2D(() => mod.default);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [graphData, setGraphData] = useState<{
    nodes: GraphNode[];
    links: GraphLink[];
  }>({ nodes: [], links: [] });

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isolatedNodeId, setIsolatedNodeId] = useState<string | null>(null);
  const [filterProjetIds, setFilterProjetIds] = useState<Set<string>>(new Set());
  const [filterSecteurs, setFilterSecteurs] = useState<Set<string>>(new Set());
  const [filterStatuts, setFilterStatuts] = useState<Set<PipelineStatut>>(new Set());
  const [minLinks, setMinLinks] = useState(0);

  const [detailsEntrepriseId, setDetailsEntrepriseId] = useState<string | null>(null);
  const [detailsProjetIds, setDetailsProjetIds] = useState<string[]>([]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const activeProjetIds = useMemo(() => new Set(projets.map((p) => p.id)), [projets]);

  // One-time graph construction — never rebuilt after, so the physics
  // simulation and any manual drag repositioning are never disturbed by a
  // filter or search change.
  useEffect(() => {
    if (initializedRef.current) return;
    if (companiesLoading || projetsLoading) return;

    const projetNodes: GraphNode[] = projets.map((p) => ({
      id: `projet:${p.id}`,
      kind: "projet",
      projetId: p.id,
      nom: p.nom,
      color: getProjectColor(p.id),
    }));

    const entrepriseNodes: GraphNode[] = companies
      .filter((c) => !c.exclue)
      .map((c) => {
        const linkedActive = c.projets.filter((id) => activeProjetIds.has(id));
        return {
          id: `entreprise:${c.id}`,
          kind: "entreprise",
          entrepriseId: c.id,
          nom: c.nom,
          ...(c.secteur ? { secteur: c.secteur } : {}),
          ...(c.logoUrl ? { logoUrl: c.logoUrl } : {}),
          projetIds: linkedActive,
          colors: getEntrepriseColors(linkedActive),
        };
      });

    const links: GraphLink[] = [];
    for (const c of companies) {
      if (c.exclue) continue;
      for (const pid of c.projets) {
        if (!activeProjetIds.has(pid)) continue;
        links.push({ source: `entreprise:${c.id}`, target: `projet:${pid}` });
      }
    }

    setGraphData({ nodes: [...projetNodes, ...entrepriseNodes], links });
    initializedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companiesLoading, projetsLoading]);

  useEffect(() => {
    if (!ForceGraph2D || graphData.nodes.length === 0) return;
    // Default d3-force spacing is tuned for small graphs — with ~100 nodes
    // it reads as a dense, illegible clump. Push nodes further apart and
    // lengthen links so the layout uses the full canvas.
    const charge = fgRef.current?.d3Force("charge") as
      { strength?: (v: number) => void } | undefined;
    charge?.strength?.(-300);
    const link = fgRef.current?.d3Force("link") as { distance?: (v: number) => void } | undefined;
    link?.distance?.(100);
    fgRef.current?.d3ReheatSimulation();
    // Frame the connected cluster, not the handful of unlinked companies
    // that drift far off to the side — otherwise the initial zoom-to-fit
    // shrinks the whole graph down just to include those outliers.
    const t = setTimeout(
      () => fgRef.current?.zoomToFit(600, 80, (n) => n.kind === "projet" || n.projetIds.length > 0),
      600,
    );
    return () => clearTimeout(t);
  }, [ForceGraph2D, graphData.nodes.length]);

  // Adjacency (entreprise node id <-> projet node id), derived straight from
  // the source data rather than the (possibly link-mutated) graphData so it
  // stays cheap to recompute and independent of force-graph's internals.
  const neighborsByNodeId = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const add = (a: string, b: string) => {
      if (!map.has(a)) map.set(a, new Set());
      map.get(a)?.add(b);
    };
    for (const c of companies) {
      if (c.exclue) continue;
      const eid = `entreprise:${c.id}`;
      for (const pid of c.projets) {
        if (!activeProjetIds.has(pid)) continue;
        const pid_ = `projet:${pid}`;
        add(eid, pid_);
        add(pid_, eid);
      }
    }
    return map;
  }, [companies, activeProjetIds]);

  const focusNodeId = isolatedNodeId ?? hoveredNodeId;
  const focusSet = useMemo(() => {
    if (!focusNodeId) return null;
    const neighbors = neighborsByNodeId.get(focusNodeId) ?? new Set<string>();
    return new Set([focusNodeId, ...neighbors]);
  }, [focusNodeId, neighborsByNodeId]);

  const searchableItems = useMemo(
    () => graphData.nodes.map((n) => ({ id: String(n.id), nom: n.nom })),
    [graphData.nodes],
  );
  const fuse = useMemo(
    () => new Fuse(searchableItems, { keys: ["nom"], threshold: 0.35, ignoreLocation: true }),
    [searchableItems],
  );
  const matchedIds = useMemo(() => {
    const term = debouncedSearch.trim();
    if (!term) return null;
    return new Set(fuse.search(term).map((r) => r.item.id));
  }, [fuse, debouncedSearch]);

  function computeOpacity(id: string): number {
    let op = 1;
    if (matchedIds && !matchedIds.has(id)) op = Math.min(op, 0.2);
    if (focusSet && !focusSet.has(id)) op = Math.min(op, 0.12);
    return op;
  }

  const statusByCompany = useMemo(() => {
    const map = new Map<string, PipelineStatut>();
    for (const p of pipeline) map.set(p.companyId, p.statut);
    return map;
  }, [pipeline]);

  const maxDegree = useMemo(() => {
    let max = 0;
    for (const n of graphData.nodes) {
      if (n.kind === "entreprise") max = Math.max(max, n.projetIds.length);
    }
    return max;
  }, [graphData.nodes]);

  function passesFilters(node: GraphNode): boolean {
    if (node.kind === "projet") {
      return filterProjetIds.size === 0 || filterProjetIds.has(node.projetId);
    }
    if (filterProjetIds.size > 0 && !node.projetIds.some((id) => filterProjetIds.has(id)))
      return false;
    if (filterSecteurs.size > 0 && !(node.secteur && filterSecteurs.has(node.secteur)))
      return false;
    if (filterStatuts.size > 0) {
      const statut = statusByCompany.get(node.entrepriseId);
      if (!statut || !filterStatuts.has(statut)) return false;
    }
    if (minLinks > 0 && node.projetIds.length < minLinks) return false;
    return true;
  }

  const visibleNodeIds = useMemo(() => {
    const set = new Set<string>();
    for (const n of graphData.nodes) {
      if (passesFilters(n)) set.add(String(n.id));
    }
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData.nodes, filterProjetIds, filterSecteurs, filterStatuts, minLinks, statusByCompany]);

  const filtersActive =
    filterProjetIds.size > 0 || filterSecteurs.size > 0 || filterStatuts.size > 0 || minLinks > 0;

  const resetFilters = () => {
    setFilterProjetIds(new Set());
    setFilterSecteurs(new Set());
    setFilterStatuts(new Set());
    setMinLinks(0);
  };

  const isolatedNode = isolatedNodeId
    ? graphData.nodes.find((n) => String(n.id) === isolatedNodeId)
    : undefined;

  const detailsCompany = detailsEntrepriseId
    ? companies.find((c) => c.id === detailsEntrepriseId)
    : undefined;
  const detailsProjetNoms = useMemo(
    () =>
      detailsProjetIds
        .map((id) => projets.find((p) => p.id === id)?.nom)
        .filter((n): n is string => Boolean(n)),
    [detailsProjetIds, projets],
  );
  const detailsStatut = detailsCompany ? statusByCompany.get(detailsCompany.id) : undefined;

  const drawNode = (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const r = Math.sqrt(nodeVal(node)) * NODE_REL_SIZE;
    const opacity = computeOpacity(String(node.id));
    const x = node.x ?? 0;
    const y = node.y ?? 0;

    ctx.save();
    ctx.globalAlpha = opacity;

    if (node.kind === "projet") {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fillStyle = node.color;
      ctx.fill();
      ctx.lineWidth = 1.5 / globalScale;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    } else {
      const colors = node.colors.length > 0 ? node.colors : [GRAPH_NEUTRAL_COLOR];
      if (colors.length === 1) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fillStyle = colors[0] ?? GRAPH_NEUTRAL_COLOR;
        ctx.fill();
      } else {
        const slice = (2 * Math.PI) / colors.length;
        colors.forEach((color, i) => {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.arc(x, y, r, i * slice - Math.PI / 2, (i + 1) * slice - Math.PI / 2);
          ctx.closePath();
          ctx.fillStyle = color;
          ctx.fill();
        });
      }
      ctx.lineWidth = 1 / globalScale;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.stroke();

      const innerR = r * 0.68;
      let img = node.logoUrl ? logoCache.current.get(node.logoUrl) : undefined;
      if (node.logoUrl && !img) {
        img = new Image();
        img.src = node.logoUrl;
        logoCache.current.set(node.logoUrl, img);
      }
      if (img?.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, innerR, 0, 2 * Math.PI);
        ctx.clip();
        ctx.drawImage(img, x - innerR, y - innerR, innerR * 2, innerR * 2);
        ctx.restore();
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.font = `${Math.max(4, innerR)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(initials(node.nom), x, y);
      }
    }

    if (globalScale > 0.35) {
      ctx.font = `${10 / globalScale}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#374151";
      ctx.fillText(node.nom, x, y + r + 3 / globalScale);
    }

    ctx.restore();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une entreprise ou un projet…"
            className="pl-9"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4" />
              Filtres{filtersActive ? " •" : ""}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Projet
              </p>
              <div className="max-h-32 space-y-1.5 overflow-y-auto">
                {projets.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={filterProjetIds.has(p.id)}
                      onCheckedChange={() => toggleInSet(setFilterProjetIds, p.id)}
                    />
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: getProjectColor(p.id) }}
                    />
                    <span className="truncate">{p.nom}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Secteur
              </p>
              <div className="max-h-32 space-y-1.5 overflow-y-auto">
                {SECTEUR_OPTIONS.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={filterSecteurs.has(s)}
                      onCheckedChange={() => toggleInSet(setFilterSecteurs, s)}
                    />
                    <span className="truncate">{s}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Statut pipeline
              </p>
              <div className="max-h-32 space-y-1.5 overflow-y-auto">
                {STATUTS.map((s) => (
                  <label key={s.value} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={filterStatuts.has(s.value)}
                      onCheckedChange={() => toggleInSet(setFilterStatuts, s.value)}
                    />
                    <span className="truncate">{s.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Projets liés (minimum)</span>
                <span className="normal-case text-foreground">
                  {minLinks === 0 ? "Tous" : `${minLinks}+`}
                </span>
              </p>
              <Slider
                value={[minLinks]}
                onValueChange={([v]) => setMinLinks(v ?? 0)}
                min={0}
                max={Math.max(1, maxDegree)}
                step={1}
              />
            </div>
            <Button variant="ghost" size="sm" className="w-full" onClick={resetFilters}>
              <RotateCcw className="h-4 w-4" />
              Réinitialiser les filtres
            </Button>
          </PopoverContent>
        </Popover>

        {isolatedNode && (
          <button
            onClick={() => setIsolatedNodeId(null)}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent/70"
          >
            Isolé : {isolatedNode.nom}
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        className="h-[75vh] w-full overflow-hidden rounded-xl border border-border bg-card"
      >
        {!ForceGraph2D && (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            Chargement du graphe…
          </div>
        )}
        {ForceGraph2D && size.width > 0 && size.height > 0 && (
          <ForceGraph2D<GraphNodeData, LinkData>
            ref={fgRef}
            graphData={graphData}
            width={size.width}
            height={size.height}
            nodeRelSize={NODE_REL_SIZE}
            nodeVal={nodeVal}
            nodeCanvasObject={drawNode}
            nodeVisibility={(n) => visibleNodeIds.has(String(n.id))}
            linkVisibility={(l) =>
              visibleNodeIds.has(resolveEndpointId(l.source)) &&
              visibleNodeIds.has(resolveEndpointId(l.target))
            }
            linkColor={() => "rgba(0, 0, 0, 0)"}
            onNodeHover={(node) => setHoveredNodeId(node ? String(node.id) : null)}
            onNodeClick={(node) => {
              setIsolatedNodeId(String(node.id));
              if (node.kind === "entreprise") {
                setDetailsEntrepriseId(node.entrepriseId);
                setDetailsProjetIds(node.projetIds);
              }
            }}
            onBackgroundClick={() => setIsolatedNodeId(null)}
            autoPauseRedraw={false}
            cooldownTime={8000}
          />
        )}
      </div>

      <EntrepriseDetailsSheet
        company={detailsCompany}
        projetNoms={detailsProjetNoms}
        pipelineStatut={detailsStatut}
        open={detailsEntrepriseId !== null}
        onOpenChange={(o) => !o && setDetailsEntrepriseId(null)}
      />
    </div>
  );
}
