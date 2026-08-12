import { useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Filter, RotateCcw, Save, Search } from "lucide-react";
import { toast } from "sonner";
import {
  EntrepriseNode,
  type EntrepriseFlowNode,
  type EntrepriseNodeData,
} from "@/components/mindmap/EntrepriseNode";
import {
  ProjetNode,
  type ProjetFlowNode,
  type ProjetNodeData,
} from "@/components/mindmap/ProjetNode";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  useAddEntrepriseProjet,
  useCompanies,
  useRemoveEntrepriseProjet,
} from "@/lib/queries/companies";
import { useMindmapPositions, useSaveMindmapPositions } from "@/lib/queries/mindmap";
import { usePipeline } from "@/lib/queries/pipeline";
import { useProjects } from "@/lib/queries/projects";
import { buildOccurrences, computeDefaultLayout } from "@/lib/mindmap-layout";
import { STATUTS, type MindmapPosition, type PipelineStatut } from "@/lib/types";

// Defined outside the component so React Flow doesn't remount every node on
// each render (a well-known perf gotcha with inline nodeTypes objects).
const nodeTypes: NodeTypes = { projet: ProjetNode, entreprise: EntrepriseNode };

type FlowNode = ProjetFlowNode | EntrepriseFlowNode;
type LinkEdge = Edge<{ entrepriseId: string; projetId: string; entrepriseNom: string }>;

type PendingLink = {
  mode: "create" | "delete";
  entrepriseId: string;
  entrepriseNom: string;
  projetId: string;
  projetNom: string;
};

function toggleInSet<T>(setter: (updater: (prev: Set<T>) => Set<T>) => void, value: T) {
  setter((prev) => {
    const next = new Set(prev);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  });
}

export function MindMapView() {
  const { isAdmin } = useAuth();
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const { data: projets = [], isLoading: projetsLoading } = useProjects();
  const { data: pipeline = [] } = usePipeline();
  const { data: savedPositions = [], isLoading: positionsLoading } = useMindmapPositions();
  const saveMindmapPositions = useSaveMindmapPositions();
  const addLink = useAddEntrepriseProjet();
  const removeLink = useRemoveEntrepriseProjet();

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<LinkEdge>([]);
  const initializedRef = useRef(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterProjets, setFilterProjets] = useState<Set<string>>(new Set());
  const [filterSecteurs, setFilterSecteurs] = useState<Set<string>>(new Set());
  const [filterStatuts, setFilterStatuts] = useState<Set<PipelineStatut>>(new Set());
  const [pendingLink, setPendingLink] = useState<PendingLink | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const occurrences = useMemo(() => buildOccurrences(companies, projets), [companies, projets]);

  const statusByCompany = useMemo(() => {
    const map = new Map<string, PipelineStatut>();
    for (const p of pipeline) map.set(p.companyId, p.statut);
    return map;
  }, [pipeline]);

  const secteurs = useMemo(
    () => Array.from(new Set(companies.map((c) => c.secteur).filter(Boolean))) as string[],
    [companies],
  );

  // One-time node/edge construction once all data is ready — never rebuilt
  // afterwards, so filters/search/drag never lose position state.
  useEffect(() => {
    if (initializedRef.current) return;
    if (companiesLoading || projetsLoading || positionsLoading) return;
    if (projets.length === 0) {
      initializedRef.current = true;
      return;
    }

    const positionByKey = new Map<string, { x: number; y: number }>();
    for (const p of savedPositions) {
      const key =
        p.type === "projet"
          ? `projet::${p.entiteId}`
          : `entreprise::${p.entiteId}::${p.projetContextId}`;
      positionByKey.set(key, { x: p.x, y: p.y });
    }

    const defaults = computeDefaultLayout(projets, occurrences);

    const projetNodes: ProjetFlowNode[] = projets.map((projet) => {
      const count = occurrences.filter((o) => o.projetId === projet.id).length;
      const pos = positionByKey.get(`projet::${projet.id}`) ??
        defaults.projetPositions.get(projet.id) ?? { x: 0, y: 0 };
      return {
        id: `projet:${projet.id}`,
        type: "projet",
        position: pos,
        data: { projetId: projet.id, nom: projet.nom, count },
      };
    });

    const entrepriseNodes: EntrepriseFlowNode[] = occurrences.map((occ) => {
      const pos = positionByKey.get(`entreprise::${occ.company.id}::${occ.projetId}`) ??
        defaults.entreprisePositions.get(occ.key) ?? { x: 0, y: 0 };
      return {
        id: `entreprise:${occ.key}`,
        type: "entreprise",
        position: pos,
        data: {
          entrepriseId: occ.company.id,
          projetId: occ.projetId,
          nom: occ.company.nom,
          ...(occ.company.secteur ? { secteur: occ.company.secteur } : {}),
          ...(occ.company.logoUrl ? { logoUrl: occ.company.logoUrl } : {}),
        },
      };
    });

    const initialEdges: LinkEdge[] = occurrences.map((occ) => ({
      id: `edge:${occ.key}`,
      source: `projet:${occ.projetId}`,
      target: `entreprise:${occ.key}`,
      data: {
        entrepriseId: occ.company.id,
        projetId: occ.projetId,
        entrepriseNom: occ.company.nom,
      },
    }));

    setNodes([...projetNodes, ...entrepriseNodes]);
    setEdges(initialEdges);
    initializedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companiesLoading, projetsLoading, positionsLoading]);

  // Search: highlight matches, dim the rest — never hides anything.
  useEffect(() => {
    if (!initializedRef.current) return;
    const term = debouncedSearch.trim().toLowerCase();
    setNodes((nds) =>
      nds.map((n) => {
        const matched = term.length > 0 && n.data.nom.toLowerCase().includes(term);
        const dimmed = term.length > 0 && !matched;
        if (n.data.matched === matched && n.data.dimmed === dimmed) return n;
        if (n.type === "projet") return { ...n, data: { ...n.data, matched, dimmed } };
        return { ...n, data: { ...n.data, matched, dimmed } };
      }),
    );
  }, [debouncedSearch, setNodes]);

  const filtersActive = filterProjets.size > 0 || filterSecteurs.size > 0 || filterStatuts.size > 0;

  const visibleOccurrenceKeys = useMemo(() => {
    const set = new Set<string>();
    for (const occ of occurrences) {
      if (filterProjets.size > 0 && !filterProjets.has(occ.projetId)) continue;
      if (
        filterSecteurs.size > 0 &&
        !(occ.company.secteur && filterSecteurs.has(occ.company.secteur))
      )
        continue;
      if (filterStatuts.size > 0) {
        const statut = statusByCompany.get(occ.company.id);
        if (!statut || !filterStatuts.has(statut)) continue;
      }
      set.add(occ.key);
    }
    return set;
  }, [occurrences, filterProjets, filterSecteurs, filterStatuts, statusByCompany]);

  const visibleProjetIds = useMemo(() => {
    if (!filtersActive) return null;
    const set = new Set<string>();
    for (const occ of occurrences) {
      if (visibleOccurrenceKeys.has(occ.key)) set.add(occ.projetId);
    }
    return set;
  }, [filtersActive, occurrences, visibleOccurrenceKeys]);

  // Filters: hide nodes/edges outright (unlike search).
  useEffect(() => {
    if (!initializedRef.current) return;
    setNodes((nds) =>
      nds.map((n) => {
        const hidden =
          n.type === "entreprise"
            ? !visibleOccurrenceKeys.has(`${n.data.entrepriseId}::${n.data.projetId}`)
            : visibleProjetIds !== null && !visibleProjetIds.has(n.data.projetId);
        if (n.hidden === hidden) return n;
        return { ...n, hidden };
      }),
    );
    setEdges((eds) =>
      eds.map((e) => {
        const d = e.data;
        const hidden = !d || !visibleOccurrenceKeys.has(`${d.entrepriseId}::${d.projetId}`);
        if (e.hidden === hidden) return e;
        return { ...e, hidden };
      }),
    );
  }, [visibleOccurrenceKeys, visibleProjetIds, setNodes, setEdges]);

  const isValidConnection = (connection: Connection | Edge) => {
    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);
    return Boolean(sourceNode && targetNode && sourceNode.type !== targetNode.type);
  };

  const onConnect = (connection: Connection) => {
    if (!isAdmin) return;
    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);
    if (!sourceNode || !targetNode) return;
    const projetNode =
      sourceNode.type === "projet" ? sourceNode : targetNode.type === "projet" ? targetNode : null;
    const entNode =
      sourceNode.type === "entreprise"
        ? sourceNode
        : targetNode.type === "entreprise"
          ? targetNode
          : null;
    if (!projetNode || !entNode) return;
    if (entNode.data.projetId === projetNode.data.projetId) return;

    setPendingLink({
      mode: "create",
      entrepriseId: entNode.data.entrepriseId,
      entrepriseNom: entNode.data.nom,
      projetId: projetNode.data.projetId,
      projetNom: projetNode.data.nom,
    });
  };

  const onNodeClick = (_event: unknown, node: FlowNode) => {
    if (!isAdmin || node.type !== "entreprise") return;
    const projetNode = nodes.find(
      (n): n is ProjetFlowNode => n.type === "projet" && n.data.projetId === node.data.projetId,
    );
    setPendingLink({
      mode: "delete",
      entrepriseId: node.data.entrepriseId,
      entrepriseNom: node.data.nom,
      projetId: node.data.projetId,
      projetNom: projetNode?.data.nom ?? "",
    });
  };

  const onEdgeClick = (_event: unknown, edge: LinkEdge) => {
    if (!isAdmin || !edge.data) return;
    const projetNode = nodes.find(
      (n): n is ProjetFlowNode => n.type === "projet" && n.data.projetId === edge.data?.projetId,
    );
    setPendingLink({
      mode: "delete",
      entrepriseId: edge.data.entrepriseId,
      entrepriseNom: edge.data.entrepriseNom,
      projetId: edge.data.projetId,
      projetNom: projetNode?.data.nom ?? "",
    });
  };

  const confirmPendingLink = () => {
    if (!pendingLink) return;
    const link = pendingLink;
    setPendingLink(null);

    if (link.mode === "create") {
      addLink.mutate(
        { entrepriseId: link.entrepriseId, projetId: link.projetId },
        {
          onSuccess: () => {
            toast.success(`${link.entrepriseNom} associée à ${link.projetNom}`);
            const projetNode = nodes.find(
              (n): n is ProjetFlowNode => n.type === "projet" && n.data.projetId === link.projetId,
            );
            const company = companies.find((c) => c.id === link.entrepriseId);
            if (!projetNode || !company) return;
            const key = `${link.entrepriseId}::${link.projetId}`;
            const newNode: EntrepriseFlowNode = {
              id: `entreprise:${key}`,
              type: "entreprise",
              position: {
                x: projetNode.position.x + Math.random() * 120 - 60,
                y: projetNode.position.y + 200 + Math.random() * 60,
              },
              data: {
                entrepriseId: company.id,
                projetId: link.projetId,
                nom: company.nom,
                ...(company.secteur ? { secteur: company.secteur } : {}),
                ...(company.logoUrl ? { logoUrl: company.logoUrl } : {}),
              },
            };
            setNodes((nds) => [...nds, newNode]);
            setEdges((eds) => [
              ...eds,
              {
                id: `edge:${key}`,
                source: `projet:${link.projetId}`,
                target: `entreprise:${key}`,
                data: {
                  entrepriseId: company.id,
                  projetId: link.projetId,
                  entrepriseNom: company.nom,
                },
              },
            ]);
          },
          onError: (err) =>
            toast.error(err instanceof Error ? err.message : "Échec de l'association"),
        },
      );
    } else {
      removeLink.mutate(
        { entrepriseId: link.entrepriseId, projetId: link.projetId },
        {
          onSuccess: () => {
            toast.success(`${link.entrepriseNom} retirée de ${link.projetNom}`);
            const key = `${link.entrepriseId}::${link.projetId}`;
            setNodes((nds) => nds.filter((n) => n.id !== `entreprise:${key}`));
            setEdges((eds) => eds.filter((e) => e.id !== `edge:${key}`));
          },
          onError: (err) =>
            toast.error(err instanceof Error ? err.message : "Échec de la suppression"),
        },
      );
    }
  };

  const handleSaveLayout = () => {
    const positions: MindmapPosition[] = nodes.map((n) =>
      n.type === "projet"
        ? {
            type: "projet",
            entiteId: n.data.projetId,
            projetContextId: n.data.projetId,
            x: n.position.x,
            y: n.position.y,
          }
        : {
            type: "entreprise",
            entiteId: n.data.entrepriseId,
            projetContextId: n.data.projetId,
            x: n.position.x,
            y: n.position.y,
          },
    );
    saveMindmapPositions.mutate(positions, {
      onSuccess: () => toast.success("Disposition sauvegardée"),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Échec de la sauvegarde"),
    });
  };

  const resetFilters = () => {
    setFilterProjets(new Set());
    setFilterSecteurs(new Set());
    setFilterStatuts(new Set());
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
                      checked={filterProjets.has(p.id)}
                      onCheckedChange={() => toggleInSet(setFilterProjets, p.id)}
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
                {secteurs.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={filterSecteurs.has(s)}
                      onCheckedChange={() => toggleInSet(setFilterSecteurs, s)}
                    />
                    <span className="truncate">{s}</span>
                  </label>
                ))}
                {secteurs.length === 0 && (
                  <p className="text-xs text-muted-foreground">Aucun secteur renseigné.</p>
                )}
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
            <Button variant="ghost" size="sm" className="w-full" onClick={resetFilters}>
              <RotateCcw className="h-4 w-4" />
              Réinitialiser les filtres
            </Button>
          </PopoverContent>
        </Popover>

        {isAdmin && (
          <div className="ml-auto flex items-center gap-2">
            <p className="hidden text-xs text-muted-foreground lg:block">
              Créer/supprimer un lien est immédiat · ce bouton ne sauvegarde que la disposition
            </p>
            <Button size="sm" onClick={handleSaveLayout} disabled={saveMindmapPositions.isPending}>
              <Save className="h-4 w-4" />
              {saveMindmapPositions.isPending ? "Sauvegarde…" : "Sauvegarder la disposition"}
            </Button>
          </div>
        )}
      </div>

      <div className="h-[75vh] w-full overflow-hidden rounded-xl border border-border">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          isValidConnection={isValidConnection}
          nodeTypes={nodeTypes}
          nodesDraggable={isAdmin}
          nodesConnectable={isAdmin}
          fitView
          minZoom={0.1}
        >
          <Background />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>

      <AlertDialog
        open={pendingLink !== null}
        onOpenChange={(open) => !open && setPendingLink(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingLink?.mode === "create" ? "Associer au projet" : "Retirer du projet"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingLink?.mode === "create"
                ? `Ceci va associer ${pendingLink.entrepriseNom} au projet ${pendingLink.projetNom} dans sa fiche. Confirmer ?`
                : pendingLink
                  ? `Ceci va retirer ${pendingLink.entrepriseNom} du projet ${pendingLink.projetNom} dans sa fiche. Confirmer ?`
                  : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPendingLink}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
