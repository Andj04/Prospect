import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Columns3, Grid3x3, Orbit, RotateCcw, Search, Table2, Waypoints } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CompanyPreviewSheet } from "@/components/CompanyPreviewSheet";
import { PageHeader } from "@/components/page-header";
import { HeatmapView } from "@/components/cartographie/HeatmapView";
import { MatrixView } from "@/components/cartographie/MatrixView";
import { ProjectBoardView } from "@/components/cartographie/ProjectBoardView";
import { RadialView } from "@/components/cartographie/RadialView";
import { SankeyView } from "@/components/cartographie/SankeyView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompanies } from "@/lib/queries/companies";
import { useProjects } from "@/lib/queries/projects";
import { useSousComposantes } from "@/lib/queries/sous-composantes";

const VIEWS = ["projets", "heatmap", "flux", "radial", "matrice"] as const;
type View = (typeof VIEWS)[number];
type CartoSearch = { vue?: View; projet?: string };

export const Route = createFileRoute("/cartographie")({
  head: () => ({
    meta: [
      { title: "Cartographie — Prospection RSE Amal Biladi" },
      {
        name: "description",
        content: "Carte visuelle des entreprises qualifiées pour chaque projet Amal Biladi.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): CartoSearch => {
    const out: CartoSearch = {};
    const vue = s["vue"];
    const projet = s["projet"];
    if (typeof vue === "string" && (VIEWS as readonly string[]).includes(vue))
      out.vue = vue as View;
    if (typeof projet === "string") out.projet = projet;
    return out;
  },
  component: CartographiePage,
});

const ALL = "__all__";

const TAB_META: { value: View; label: string; icon: typeof Columns3; hint: string }[] = [
  {
    value: "projets",
    label: "Par projet",
    icon: Columns3,
    hint: "Une colonne par projet, les entreprises regroupées par sous-composante.",
  },
  {
    value: "heatmap",
    label: "Secteurs × projets",
    icon: Grid3x3,
    hint: "Quels secteurs peuvent financer quels projets : plus la case est foncée, plus il y a d'entreprises.",
  },
  {
    value: "flux",
    label: "Flux",
    icon: Waypoints,
    hint: "D'où vient le potentiel de financement : pays d'origine, puis secteur, puis projet.",
  },
  {
    value: "radial",
    label: "Mind map",
    icon: Orbit,
    hint: "Un projet au centre, ses sous-composantes, puis ses entreprises.",
  },
  {
    value: "matrice",
    label: "Tableau",
    icon: Table2,
    hint: "Une ligne par entreprise, une colonne par projet.",
  },
];

function CartographiePage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/cartographie" });
  const view: View = search.vue ?? "projets";

  const { data: allCompanies = [] } = useCompanies();
  const { data: projets = [] } = useProjects();
  const { data: sousComposantes = [] } = useSousComposantes();

  const [q, setQ] = useState("");
  const [secteur, setSecteur] = useState(ALL);
  const [pays, setPays] = useState(ALL);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const secteurs = useMemo(
    () => [...new Set(allCompanies.map((c) => c.secteur).filter(Boolean))].sort() as string[],
    [allCompanies],
  );
  const paysList = useMemo(
    () => [...new Set(allCompanies.map((c) => c.paysOrigine).filter(Boolean))].sort() as string[],
    [allCompanies],
  );

  // Les entreprises exclues ne sont pas des cibles : elles restent hors carte.
  const companies = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return allCompanies.filter(
      (c) =>
        !c.exclue &&
        (!needle || c.nom.toLowerCase().includes(needle)) &&
        (secteur === ALL || c.secteur === secteur) &&
        (pays === ALL || c.paysOrigine === pays),
    );
  }, [allCompanies, q, secteur, pays]);

  const setView = (v: string) =>
    void navigate({ search: (prev: CartoSearch) => ({ ...prev, vue: v as View }), replace: true });
  const setProjet = (id: string) =>
    void navigate({ search: (prev: CartoSearch) => ({ ...prev, projet: id }), replace: true });

  const filtered = q.trim() !== "" || secteur !== ALL || pays !== ALL;
  const meta = TAB_META.find((t) => t.value === view)!;

  return (
    <AppShell>
      <div className="space-y-4">
        <PageHeader
          title="Cartographie"
          description="Qui peut financer quel projet Amal Biladi, sous plusieurs angles."
        />

        <Tabs value={view} onValueChange={setView}>
          <TabsList className="h-auto flex-wrap">
            {TAB_META.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="gap-1.5">
                <Icon className="h-4 w-4" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="card-soft flex flex-wrap items-center gap-2 p-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filtrer par nom d'entreprise…"
              className="pl-9"
            />
          </div>
          <Select value={secteur} onValueChange={setSecteur}>
            <SelectTrigger className="w-[210px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous les secteurs</SelectItem>
              {secteurs.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={pays} onValueChange={setPays}>
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous les pays</SelectItem>
              {paysList.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filtered && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                setQ("");
                setSecteur(ALL);
                setPays(ALL);
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {companies.length} entreprise{companies.length > 1 ? "s" : ""}
          </span>
        </div>

        <p className="text-sm text-muted-foreground">{meta.hint}</p>

        <div key={view}>
          {view === "projets" && (
            <ProjectBoardView
              companies={companies}
              projets={projets}
              sousComposantes={sousComposantes}
              focusProjet={search.projet}
              onOpen={setPreviewId}
            />
          )}
          {view === "heatmap" && <HeatmapView companies={companies} projets={projets} />}
          {view === "flux" && <SankeyView companies={companies} projets={projets} />}
          {view === "radial" && (
            <RadialView
              companies={companies}
              projets={projets}
              sousComposantes={sousComposantes}
              projetId={search.projet}
              onProjetChange={setProjet}
              onOpen={setPreviewId}
            />
          )}
          {view === "matrice" && (
            <MatrixView companies={companies} projets={projets} onOpen={setPreviewId} />
          )}
        </div>
      </div>
      <CompanyPreviewSheet companyId={previewId} onOpenChange={(o) => !o && setPreviewId(null)} />
    </AppShell>
  );
}
