import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type DragEvent } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  ArrowUpRight,
  BellRing,
  CalendarClock,
  Coins,
  GitBranch,
  Handshake,
  KanbanSquare,
  RotateCcw,
  Search,
  Table2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PrioriteBadge, STATUT_DOT, StatutBadge } from "@/components/badges";
import { PageHeader, StatCard, StatGrid } from "@/components/page-header";
import { DossierPanel } from "@/components/pipeline/DossierPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth/AuthProvider";
import { daysSince, formatMAD, isInactive, isOverdue, weightedAmount } from "@/lib/pipeline-utils";
import { useCompaniesList, useCompany } from "@/lib/queries/companies";
import { useMoveStatut, usePipeline } from "@/lib/queries/pipeline";
import { useProjects } from "@/lib/queries/projects";
import { useUsers } from "@/lib/queries/users";
import {
  STATUTS,
  STATUTS_EN_COURS,
  type PipelineItem,
  type PipelineStatut,
  type Priorite,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline de prospection — Amal Biladi" },
      {
        name: "description",
        content:
          "Suivi du pipeline de prospection RSE : étapes, responsables, relances, montants et historique.",
      },
    ],
  }),
  component: PipelinePage,
});

const ALL = "__all__";
const PRIORITES: Priorite[] = ["haute", "moyenne", "basse"];
const PAGE = 40;

type SortKey = "nom" | "statut" | "echeance" | "montant" | "contact";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  );
}

function DossierCard({
  p,
  nom,
  draggable,
  onOpen,
}: {
  p: PipelineItem;
  nom: string;
  draggable: boolean;
  onOpen: () => void;
}) {
  const overdue = isOverdue(p);
  const inactive = isInactive(p);
  return (
    <article
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", p.companyId);
        e.dataTransfer.effectAllowed = "move";
        e.currentTarget.classList.add("opacity-50");
      }}
      onDragEnd={(e) => e.currentTarget.classList.remove("opacity-50")}
      onClick={onOpen}
      className={cn(
        "card-soft group cursor-pointer space-y-2 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
        draggable && "active:cursor-grabbing",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold leading-snug group-hover:text-primary">{nom}</h4>
        <PrioriteBadge priorite={p.priorite} />
      </div>
      {p.prochaineAction && (
        <p className="flex items-start gap-1.5 text-xs text-foreground/80">
          <CalendarClock
            className={cn(
              "mt-0.5 h-3.5 w-3.5 shrink-0",
              overdue ? "text-destructive" : "text-brand-orange",
            )}
          />
          <span className="line-clamp-2">
            {p.prochaineAction}
            {p.prochaineActionDate && (
              <span className={cn("ml-1 font-medium", overdue && "text-destructive")}>
                ·{" "}
                {new Date(p.prochaineActionDate).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            )}
          </span>
        </p>
      )}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {p.responsable ? (
          <span
            title={p.responsable}
            className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary"
          >
            {initials(p.responsable)}
          </span>
        ) : (
          <span className="text-muted-foreground/60">Non assigné</span>
        )}
        {p.montantVise ? <span className="tabular-nums">{formatMAD(p.montantVise)}</span> : null}
        {inactive && (
          <span
            className="ml-auto inline-flex items-center gap-1 text-warning-foreground"
            title="Aucune activité depuis 30 jours"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Inactif
          </span>
        )}
      </div>
    </article>
  );
}

function PipelinePage() {
  const { isAdmin, profile } = useAuth();
  const { data: companies = [] } = useCompaniesList();
  const { data: pipeline = [] } = usePipeline();
  const { data: projets = [] } = useProjects();
  const { data: users = [] } = useUsers();
  const move = useMoveStatut();

  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [q, setQ] = useState("");
  const [prio, setPrio] = useState(ALL);
  const [resp, setResp] = useState(ALL);
  const [projet, setProjet] = useState(ALL);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<PipelineStatut | null>(null);
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "echeance", dir: 1 });

  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);
  const nameOf = (id: string) => companyById.get(id)?.nom ?? "—";

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return pipeline.filter((p) => {
      const c = companyById.get(p.companyId);
      if (!c || c.exclue) return false;
      if (needle && !c.nom.toLowerCase().includes(needle)) return false;
      if (prio !== ALL && p.priorite !== prio) return false;
      if (resp === "me" && p.responsableId !== profile?.id) return false;
      if (resp !== ALL && resp !== "me" && p.responsableId !== resp) return false;
      if (projet !== ALL && p.projetCibleId !== projet && !c.projets.includes(projet)) return false;
      return true;
    });
  }, [pipeline, companyById, q, prio, resp, projet, profile?.id]);

  const kpi = useMemo(() => {
    const enCours = rows.filter((p) => STATUTS_EN_COURS.includes(p.statut));
    return {
      engages: rows.filter((p) => p.statut !== "identifie").length,
      retard: rows.filter((p) => isOverdue(p)).length,
      inactifs: rows.filter((p) => isInactive(p)).length,
      vise: enCours.reduce((s, p) => s + (p.montantVise ?? 0), 0),
      pondere: enCours.reduce((s, p) => s + weightedAmount(p), 0),
      obtenu: rows
        .filter((p) => p.statut === "partenariat-signe")
        .reduce((s, p) => s + (p.montantObtenu ?? p.montantVise ?? 0), 0),
    };
  }, [rows]);

  const sorted = useMemo(() => {
    const order = new Map(STATUTS.map((s, i) => [s.value, i]));
    const val = (p: PipelineItem): string | number => {
      switch (sort.key) {
        case "nom":
          return nameOf(p.companyId).toLowerCase();
        case "statut":
          return order.get(p.statut) ?? 0;
        case "echeance":
          return p.prochaineActionDate ?? "9999";
        case "montant":
          return p.montantVise ?? -1;
        case "contact":
          return p.dernierContact ?? "0000";
      }
    };
    return [...rows].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort, companyById]);

  const onDrop = (e: DragEvent, to: PipelineStatut) => {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData("text/plain");
    const p = pipeline.find((x) => x.companyId === id);
    if (!p || p.statut === to) return;
    move.mutate(
      { companyId: id, from: p.statut, to, auteur: profile?.fullName || "Admin" },
      {
        onSuccess: () => {
          toast.success(`${nameOf(id)} → ${STATUTS.find((s) => s.value === to)?.label}`);
          if (to === "sans-suite") setOpenId(id);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Échec du déplacement"),
      },
    );
  };

  const current = openId ? pipeline.find((p) => p.companyId === openId) : undefined;
  // Fiche complète du dossier ouvert : l'email de prospection et les
  // sous-composantes en ont besoin, la liste allégée ne suffit pas.
  const { data: currentCompany } = useCompany(openId ?? undefined);
  const filtersActive = q.trim() !== "" || prio !== ALL || resp !== ALL || projet !== ALL;

  const th = (key: SortKey, label: string) => (
    <th className="px-4 py-3 text-left font-semibold">
      <button
        className="inline-flex items-center gap-1 hover:text-primary"
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}
      >
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </button>
    </th>
  );

  return (
    <AppShell>
      <div className="space-y-5">
        <PageHeader
          title="Pipeline de prospection"
          description={
            isAdmin
              ? "Glissez une carte d'une colonne à l'autre pour changer d'étape ; cliquez pour ouvrir le dossier."
              : "Consultation en lecture seule."
          }
          actions={
            <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
              {(
                [
                  ["kanban", "Kanban", KanbanSquare],
                  ["table", "Tableau", Table2],
                ] as const
              ).map(([v, label, Icon]) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    view === v
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          }
        />

        <StatGrid>
          <StatCard
            index={0}
            label="Dossiers engagés"
            value={kpi.engages}
            hint={`${kpi.inactifs} sans activité depuis 30 j`}
            icon={<GitBranch className="h-5 w-5" />}
            tone="blue"
          />
          <StatCard
            index={1}
            label="Relances en retard"
            value={kpi.retard}
            icon={<BellRing className="h-5 w-5" />}
            tone={kpi.retard > 0 ? "red" : "green"}
          />
          <StatCard
            index={2}
            label="Montant pondéré attendu"
            value={formatMAD(kpi.pondere)}
            hint={`sur ${formatMAD(kpi.vise)} visés (dossiers en cours)`}
            icon={<TrendingUp className="h-5 w-5" />}
            tone="orange"
          />
          <StatCard
            index={3}
            label="Montant obtenu"
            value={formatMAD(kpi.obtenu)}
            hint="partenariats signés"
            icon={<Coins className="h-5 w-5" />}
            tone="green"
          />
        </StatGrid>

        <div className="card-soft flex flex-wrap items-center gap-2 p-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher une entreprise…"
              className="pl-9"
            />
          </div>
          <Select value={resp} onValueChange={setResp}>
            <SelectTrigger className="w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous les responsables</SelectItem>
              <SelectItem value="me">Mes dossiers</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.nomComplet || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={prio} onValueChange={setPrio}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Toutes priorités</SelectItem>
              {PRIORITES.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={projet} onValueChange={setProjet}>
            <SelectTrigger className="w-[210px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous les projets</SelectItem>
              {projets.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filtersActive && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                setQ("");
                setPrio(ALL);
                setResp(ALL);
                setProjet(ALL);
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser
            </Button>
          )}
        </div>

        {view === "kanban" ? (
          <div className="themed-scrollbar flex gap-3 overflow-x-auto pb-3 animate-in fade-in duration-150">
            {STATUTS.map((col) => {
              const items = rows
                .filter((p) => p.statut === col.value)
                .sort(
                  (a, b) =>
                    (a.prochaineActionDate ?? "9999").localeCompare(
                      b.prochaineActionDate ?? "9999",
                    ) || nameOf(a.companyId).localeCompare(nameOf(b.companyId)),
                );
              const limit = limits[col.value] ?? PAGE;
              return (
                <section
                  key={col.value}
                  onDragOver={(e) => {
                    if (!isAdmin) return;
                    e.preventDefault();
                    setDragOver(col.value);
                  }}
                  onDragLeave={() => setDragOver((d) => (d === col.value ? null : d))}
                  onDrop={(e) => isAdmin && onDrop(e, col.value)}
                  className={cn(
                    "flex max-h-[70vh] w-[270px] shrink-0 flex-col rounded-2xl border bg-secondary/50 transition-all duration-200",
                    dragOver === col.value
                      ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                      : "border-border",
                  )}
                >
                  <header className="flex items-center gap-2 px-3 py-2.5">
                    <span className={cn("h-2.5 w-2.5 rounded-full", STATUT_DOT[col.value])} />
                    <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{col.label}</h3>
                    <span className="rounded-full bg-card px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
                      {items.length}
                    </span>
                  </header>
                  <div className="themed-scrollbar flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
                    {items.slice(0, limit).map((p) => (
                      <DossierCard
                        key={p.companyId}
                        p={p}
                        nom={nameOf(p.companyId)}
                        draggable={isAdmin}
                        onOpen={() => setOpenId(p.companyId)}
                      />
                    ))}
                    {items.length > limit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLimits((l) => ({ ...l, [col.value]: limit + PAGE }))}
                      >
                        Afficher {Math.min(PAGE, items.length - limit)} de plus
                      </Button>
                    )}
                    {items.length === 0 && (
                      <p className="rounded-lg border border-dashed border-border px-2 py-6 text-center text-xs text-muted-foreground">
                        {isAdmin ? "Déposez un dossier ici" : "Aucun dossier"}
                      </p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="card-soft themed-scrollbar overflow-x-auto animate-in fade-in duration-150">
            <table className="w-full min-w-[1000px] border-collapse text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  {th("nom", "Entreprise")}
                  {th("statut", "Étape")}
                  <th className="px-4 py-3 text-left font-semibold">Priorité</th>
                  <th className="px-4 py-3 text-left font-semibold">Responsable</th>
                  <th className="px-4 py-3 text-left font-semibold">Prochaine action</th>
                  {th("echeance", "Échéance")}
                  {th("montant", "Montant visé")}
                  {th("contact", "Dernier contact")}
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => {
                  const overdue = isOverdue(p);
                  const since = daysSince(p.dernierContact);
                  return (
                    <tr
                      key={p.companyId}
                      onClick={() => setOpenId(p.companyId)}
                      className="cursor-pointer border-t border-border transition-colors hover:bg-secondary"
                    >
                      <td className="px-4 py-3 font-medium">
                        {nameOf(p.companyId)}
                        {isInactive(p) && (
                          <AlertTriangle className="ml-1.5 inline h-3.5 w-3.5 text-warning-foreground" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatutBadge statut={p.statut} />
                      </td>
                      <td className="px-4 py-3">
                        <PrioriteBadge priorite={p.priorite} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.responsable || "—"}</td>
                      <td className="max-w-[260px] truncate px-4 py-3 text-muted-foreground">
                        {p.prochaineAction || "—"}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 tabular-nums",
                          overdue ? "font-semibold text-destructive" : "text-muted-foreground",
                        )}
                      >
                        {p.prochaineActionDate
                          ? new Date(p.prochaineActionDate).toLocaleDateString("fr-FR")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {p.montantVise ? formatMAD(p.montantVise) : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {since === null
                          ? "Jamais"
                          : since === 0
                            ? "Aujourd'hui"
                            : `il y a ${since} j`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {sorted.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                Aucun dossier pour ces filtres.
              </p>
            )}
          </div>
        )}
      </div>

      <Sheet open={Boolean(current && currentCompany)} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {current && currentCompany && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 pr-6">
                  <Handshake className="h-5 w-5 text-primary" />
                  {currentCompany.nom}
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2">
                  Dossier de prospection
                  <Link
                    to="/entreprises/$id"
                    params={{ id: currentCompany.id }}
                    className="inline-flex items-center gap-0.5 text-primary hover:underline"
                  >
                    Voir la fiche <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-8">
                <DossierPanel company={currentCompany} dossier={current} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
