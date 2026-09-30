import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarClock,
  ClipboardCheck,
  FileSpreadsheet,
  FolderKanban,
  History,
  Network,
  Plus,
  UsersRound,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ExportDialog } from "@/components/ExportDialog";
import { StatCard, StatGrid } from "@/components/page-header";
import { reveal } from "@/lib/reveal";
import { StatutBadge } from "@/components/badges";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ACTION_CLASS, ACTION_LABEL, describeEntry } from "@/lib/audit-format";
import { REQUIRED_CHECKS, missingRequired } from "@/lib/completeness";
import { getProjectColor } from "@/lib/graph-colors";
import { useAuditLog } from "@/lib/queries/audit";
import { useCompanies } from "@/lib/queries/companies";
import { usePipeline } from "@/lib/queries/pipeline";
import { useProjects } from "@/lib/queries/projects";
import { cn } from "@/lib/utils";
import logoAmalBiladi from "@/assets/logo-amal-biladi.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Accueil — Prospection RSE Amal Biladi" },
      {
        name: "description",
        content:
          "Base de prospection RSE d'Amal Biladi : entreprises et fondations pouvant financer les projets de l'ONG.",
      },
    ],
  }),
  component: AccueilPage,
});

function greeting() {
  const h = new Date().getHours();
  return h < 5 || h >= 18 ? "Bonsoir" : "Bonjour";
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  const d = Math.floor(diff / 86400);
  if (d < 30) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function Panel({
  title,
  icon,
  action,
  children,
  index,
}: {
  title: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  index: number;
}) {
  const r = reveal(index);
  return (
    <section className={cn("card-soft flex flex-col p-4 sm:p-5", r.className)} style={r.style}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function AccueilPage() {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { data: companies = [], isLoading } = useCompanies();
  const { data: pipeline = [] } = usePipeline();
  const { data: projets = [] } = useProjects();
  const { data: audit = [] } = useAuditLog(isAdmin);

  const stats = useMemo(() => {
    const complete = companies.filter((c) => missingRequired(c).length === 0).length;
    const contacts = companies.reduce((s, c) => s + c.contacts.length, 0);
    const enCours = pipeline.filter((p) =>
      ["premier-contact", "en-discussion", "visite-programmee", "proposition-envoyee"].includes(
        p.statut,
      ),
    ).length;
    return { complete, contacts, enCours };
  }, [companies, pipeline]);

  const priorities = useMemo(
    () =>
      companies
        .filter((c) => !c.exclue)
        .map((c) => ({ company: c, missing: missingRequired(c) }))
        .filter((r) => r.missing.length > 0)
        .sort((a, b) => b.missing.length - a.missing.length)
        .slice(0, 6),
    [companies],
  );

  const nextActions = useMemo(
    () =>
      pipeline
        .filter((p) => !["identifie", "partenariat-signe", "sans-suite"].includes(p.statut))
        .sort((a, b) => (a.priorite === "haute" ? -1 : 0) - (b.priorite === "haute" ? -1 : 0))
        .slice(0, 6),
    [pipeline],
  );

  const projetCounts = useMemo(
    () =>
      projets.map((p) => ({
        projet: p,
        count: companies.filter((c) => c.projets.includes(p.id)).length,
      })),
    [projets, companies],
  );

  const companyName = (id: string) =>
    companies.find((c) => c.id === id)?.nom ?? "Entreprise supprimée";
  const firstName = profile?.fullName.split(" ")[0] ?? "";
  const pctComplete = companies.length ? Math.round((stats.complete / companies.length) * 100) : 0;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Bandeau d'accueil */}
        <section className="relative overflow-hidden rounded-2xl bg-sidebar p-6 text-sidebar-foreground shadow-lg sm:p-8 animate-in fade-in zoom-in-95 duration-500">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-brand-orange/25 blur-3xl" />
          <img
            src={logoAmalBiladi}
            alt=""
            className="pointer-events-none absolute -right-6 bottom-[-30px] hidden h-44 w-44 opacity-15 sm:block"
          />
          <div className="relative max-w-2xl space-y-3">
            <p className="text-sm font-medium text-sidebar-foreground/70">
              {new Date().toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {greeting()} {firstName}
            </h1>
            <p className="text-[0.95rem] text-sidebar-foreground/80">
              La base compte <strong className="text-white">{companies.length} entreprises</strong>{" "}
              et fondations, dont <strong className="text-white">{pctComplete} %</strong> de fiches
              complètes.{" "}
              {priorities.length > 0 &&
                isAdmin &&
                "Quelques fiches attendent encore des informations."}
            </p>
            <div className="brand-stripe h-1 w-24 rounded-full" />
          </div>
        </section>

        <StatGrid>
          <StatCard
            index={0}
            label="Entreprises & fondations"
            value={companies.length}
            icon={<Building2 className="h-5 w-5" />}
            tone="blue"
            onClick={() => navigate({ to: "/entreprises" })}
          />
          <StatCard
            index={1}
            label="Fiches complètes"
            value={stats.complete}
            hint={`${pctComplete} % de la base`}
            icon={<ClipboardCheck className="h-5 w-5" />}
            tone="green"
            onClick={() => navigate({ to: "/tableau-de-bord", hash: "qualite" })}
          />
          <StatCard
            index={2}
            label="Contacts enregistrés"
            value={stats.contacts}
            icon={<UsersRound className="h-5 w-5" />}
            tone="orange"
            onClick={() => navigate({ to: "/entreprises" })}
          />
          <StatCard
            index={3}
            label="Dossiers en cours"
            value={stats.enCours}
            hint="dans le pipeline"
            icon={<CalendarClock className="h-5 w-5" />}
            tone="neutral"
            onClick={() => navigate({ to: "/pipeline" })}
          />
        </StatGrid>

        {/* Raccourcis */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ...(isAdmin
              ? [
                  {
                    key: "add",
                    icon: <Plus className="h-5 w-5" />,
                    title: "Ajouter une entreprise",
                    text: "Créer une nouvelle fiche de prospection",
                    to: "/entreprises/nouvelle",
                  },
                ]
              : []),
            {
              key: "carto",
              icon: <Network className="h-5 w-5" />,
              title: "Explorer la cartographie",
              text: "Qui peut financer quel projet",
              to: "/cartographie",
            },
            {
              key: "stats",
              icon: <BarChart3 className="h-5 w-5" />,
              title: "Voir le tableau de bord",
              text: "Chiffres, répartitions et qualité",
              to: "/tableau-de-bord",
            },
          ].map((s, i) => {
            const r = reveal(i + 4);
            return (
              <Link
                key={s.key}
                to={s.to}
                className={cn(
                  "card-soft group flex items-center gap-3 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
                  r.className,
                )}
                style={r.style}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  {s.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{s.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{s.text}</span>
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            );
          })}
          <ExportDialog
            trigger={
              <button
                type="button"
                className={cn(
                  "card-soft group flex items-center gap-3 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
                  reveal(7).className,
                )}
                style={reveal(7).style}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success/15 text-success transition-transform group-hover:scale-110">
                  <FileSpreadsheet className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">Exporter en Excel</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    Avec statistiques et contacts
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </button>
            }
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {isAdmin && (
            <Panel
              index={8}
              title="À compléter en priorité"
              icon={<ClipboardCheck className="h-4 w-4" />}
              action={
                <Link
                  to="/tableau-de-bord"
                  hash="qualite"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Tout voir
                </Link>
              }
            >
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Chargement…</p>
              ) : priorities.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Toutes les fiches sont complètes. Bravo !
                </p>
              ) : (
                <ul className="space-y-1">
                  {priorities.map(({ company, missing }) => (
                    <li key={company.id}>
                      <Link
                        to="/entreprises/$id"
                        params={{ id: company.id }}
                        className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-secondary"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-destructive/10 text-xs font-bold tabular-nums text-destructive">
                          {REQUIRED_CHECKS.length - missing.length}/{REQUIRED_CHECKS.length}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{company.nom}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            Manque : {missing.join(", ")}
                          </span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          <Panel
            index={9}
            title="Prochaines actions"
            icon={<CalendarClock className="h-4 w-4" />}
            action={
              <Link to="/pipeline" className="text-xs font-medium text-primary hover:underline">
                Pipeline
              </Link>
            }
          >
            {nextActions.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Aucun dossier en cours pour l'instant.
                </p>
                <Link to="/pipeline" className="text-sm font-medium text-primary hover:underline">
                  Commencer à prospecter
                </Link>
              </div>
            ) : (
              <ul className="space-y-1">
                {nextActions.map((p) => (
                  <li key={p.companyId}>
                    <Link
                      to="/entreprises/$id"
                      params={{ id: p.companyId }}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-secondary"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {companyName(p.companyId)}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {p.prochaineAction || "Aucune action planifiée"}
                        </span>
                      </span>
                      <StatutBadge statut={p.statut} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {isAdmin && (
            <Panel
              index={10}
              title="Activité récente"
              icon={<History className="h-4 w-4" />}
              action={
                <Link to="/journal" className="text-xs font-medium text-primary hover:underline">
                  Journal
                </Link>
              }
            >
              {audit.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Aucune activité enregistrée.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {audit.slice(0, 7).map((e) => (
                    <li key={e.id} className="flex items-start gap-3 text-sm">
                      <span
                        className={cn(
                          "mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                          ACTION_CLASS[e.action],
                        )}
                      >
                        {ACTION_LABEL[e.action]}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {describeEntry(e, companyName)}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {e.actorName || "Système"} · {timeAgo(e.createdAt)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          <Panel
            index={11}
            title="Projets Amal Biladi"
            icon={<FolderKanban className="h-4 w-4" />}
            action={
              <Link to="/cartographie" className="text-xs font-medium text-primary hover:underline">
                Cartographie
              </Link>
            }
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {projetCounts.map(({ projet, count }) => (
                <Link
                  key={projet.id}
                  to="/cartographie"
                  search={{ vue: "projets", projet: projet.id }}
                  className="group flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
                >
                  <span
                    className="h-8 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: getProjectColor(projet.id) }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{projet.nom}</span>
                    <span className="block text-xs text-muted-foreground">
                      {count} entreprise{count > 1 ? "s" : ""}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
