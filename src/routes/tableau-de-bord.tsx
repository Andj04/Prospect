import { createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
  GitBranch,
  Gauge,
  Handshake,
  Landmark,
  MessagesSquare,
  Search,
  Target,
  UsersRound,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Donut, Funnel } from "@/components/charts";
import {
  DistributionCard,
  PageHeader,
  StatCard,
  StatGrid,
  type Tone,
} from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BONUS_CHECKS, REQUIRED_CHECKS } from "@/lib/completeness";
import { useCompanies } from "@/lib/queries/companies";
import { usePipeline } from "@/lib/queries/pipeline";
import { useProjects } from "@/lib/queries/projects";
import { STATUTS, type PipelineStatut, type Priorite } from "@/lib/types";

export const Route = createFileRoute("/tableau-de-bord")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — Amal Biladi" },
      {
        name: "description",
        content:
          "Vue d'ensemble de la base de prospection RSE : entreprises, origine du capital, secteurs, qualité des fiches et pipeline.",
      },
    ],
  }),
  component: TableauDeBordPage,
});

type Onglet = "vue" | "qualite" | "pipeline";

const STATUT_COLOR: Record<PipelineStatut, string> = {
  identifie: "var(--muted-foreground)",
  "premier-contact": "var(--primary-soft)",
  "en-discussion": "var(--primary)",
  "visite-programmee": "var(--brand-orange)",
  "proposition-envoyee": "var(--warning)",
  "partenariat-signe": "var(--success)",
  "sans-suite": "var(--destructive)",
};

const PRIORITE_TONE: Record<Priorite, Tone> = {
  haute: "orange",
  moyenne: "blue",
  basse: "neutral",
};

function severityTone(missing: number, total: number): Tone {
  const pct = total > 0 ? missing / total : 0;
  if (pct >= 0.4) return "red";
  if (pct >= 0.15) return "orange";
  return "green";
}

function countBy<T>(
  items: T[],
  key: (item: T) => string,
  tone: (label: string) => Tone = () => "blue",
) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count, tone: tone(label) }));
}

function TableauDeBordPage() {
  const navigate = useNavigate();
  const hash = useRouterState({ select: (s) => s.location.hash });
  const initial: Onglet = hash === "qualite" || hash === "pipeline" ? hash : "vue";
  const [onglet, setOnglet] = useState<Onglet>(initial);

  const { data: companies = [] } = useCompanies();
  const { data: pipeline = [] } = usePipeline();
  const { data: projets = [] } = useProjects();

  const total = companies.length;
  const goList = (search: Record<string, string>) => void navigate({ to: "/entreprises", search });

  /* ------------------------- Vue d'ensemble ------------------------- */
  const overview = useMemo(() => {
    const marocaines = companies.filter((c) => c.paysOrigine === "Maroc").length;
    const etrangeres = companies.filter((c) => c.paysOrigine && c.paysOrigine !== "Maroc").length;
    return {
      marocaines,
      etrangeres,
      inconnu: total - marocaines - etrangeres,
      fondations: companies.filter((c) => c.structureDediee).length,
      contacts: companies.reduce((s, c) => s + c.contacts.length, 0),
      couvertes: companies.filter((c) => c.contacts.length > 0).length,
      avecProjet: companies.filter((c) => c.projets.length > 0).length,
      secteurs: countBy(companies, (c) => c.secteur || "Non renseigné"),
      pays: countBy(
        companies,
        (c) => c.paysOrigine || "Non renseigné",
        (l) => (l === "Maroc" ? "green" : l === "Non renseigné" ? "neutral" : "blue"),
      ),
      parProjet: projets
        .map((p) => ({
          label: p.nom,
          id: p.id,
          count: companies.filter((c) => c.projets.includes(p.id)).length,
          tone: "blue" as Tone,
        }))
        .sort((a, b) => b.count - a.count),
    };
  }, [companies, projets, total]);

  /* ------------------------- Qualité des fiches ------------------------- */
  const [qualiteSearch, setQualiteSearch] = useState("");
  const quality = useMemo(() => {
    const rows = companies.map((c) => ({
      company: c,
      missingRequired: REQUIRED_CHECKS.filter((f) => !f.test(c)).map((f) => f.label),
      missingBonus: BONUS_CHECKS.filter((f) => !f.test(c)).map((f) => f.label),
    }));
    const complete = rows.filter((r) => r.missingRequired.length === 0).length;
    const sumReq = rows.reduce((s, r) => s + r.missingRequired.length, 0);
    const sumBonus = rows.reduce((s, r) => s + r.missingBonus.length, 0);
    return {
      complete,
      heavy: rows.filter((r) => r.missingRequired.length >= 5).length,
      avgRequired: total ? REQUIRED_CHECKS.length - sumReq / total : 0,
      avgBonus: total ? BONUS_CHECKS.length - sumBonus / total : 0,
      requiredItems: REQUIRED_CHECKS.map((f) => {
        const count = rows.filter((r) => r.missingRequired.includes(f.label)).length;
        return { label: f.label, count, tone: severityTone(count, total) };
      })
        .filter((i) => i.count > 0)
        .sort((a, b) => b.count - a.count),
      bonusItems: BONUS_CHECKS.map((f) => ({
        label: f.label,
        count: rows.filter((r) => r.missingBonus.includes(f.label)).length,
        tone: "neutral" as Tone,
      }))
        .filter((i) => i.count > 0)
        .sort((a, b) => b.count - a.count),
      incomplete: rows
        .filter((r) => r.missingRequired.length > 0)
        .sort((a, b) => b.missingRequired.length - a.missingRequired.length),
    };
  }, [companies, total]);

  const filteredIncomplete = useMemo(() => {
    const q = qualiteSearch.trim().toLowerCase();
    return q
      ? quality.incomplete.filter((r) => r.company.nom.toLowerCase().includes(q))
      : quality.incomplete;
  }, [quality.incomplete, qualiteSearch]);

  /* ------------------------- Pipeline ------------------------- */
  const pipe = useMemo(() => {
    const by = (s: PipelineStatut) => pipeline.filter((p) => p.statut === s).length;
    const engaged = pipeline.filter((p) => p.statut !== "identifie").length;
    const closed = by("partenariat-signe") + by("sans-suite");
    return {
      engaged,
      enCours: engaged - closed,
      signes: by("partenariat-signe"),
      sansSuite: by("sans-suite"),
      taux: closed > 0 ? Math.round((by("partenariat-signe") / closed) * 100) : null,
      funnel: STATUTS.filter((s) => s.value !== "sans-suite").map((s) => ({
        label: s.label,
        value: by(s.value),
        color: STATUT_COLOR[s.value],
        onClick: () => void navigate({ to: "/pipeline" }),
      })),
      priorites: (["haute", "moyenne", "basse"] as Priorite[]).map((p) => ({
        label: p.charAt(0).toUpperCase() + p.slice(1),
        count: pipeline.filter((x) => x.priorite === p && x.statut !== "identifie").length,
        tone: PRIORITE_TONE[p],
      })),
    };
  }, [pipeline, navigate]);

  const changeTab = (v: string) => {
    setOnglet(v as Onglet);
    void navigate({ to: "/tableau-de-bord", hash: v === "vue" ? "" : v, replace: true });
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Tableau de bord"
          description="Cliquez sur un chiffre, un secteur, un pays ou un champ manquant pour ouvrir la liste filtrée."
        />

        <Tabs value={onglet} onValueChange={changeTab} className="space-y-6">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="vue" className="gap-1.5">
              <Gauge className="h-4 w-4" />
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger value="qualite" className="gap-1.5">
              <ClipboardList className="h-4 w-4" />
              Qualité des fiches
              {quality.incomplete.length > 0 && (
                <span className="ml-1 rounded-full bg-destructive/15 px-1.5 text-[11px] font-semibold tabular-nums text-destructive">
                  {quality.incomplete.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="gap-1.5">
              <GitBranch className="h-4 w-4" />
              Pipeline
            </TabsTrigger>
          </TabsList>

          {/* ------------------------- Vue d'ensemble ------------------------- */}
          <TabsContent value="vue" className="space-y-4 animate-in fade-in duration-300">
            <StatGrid>
              <StatCard
                index={0}
                label="Entreprises & fondations"
                value={total}
                icon={<Building2 className="h-5 w-5" />}
                tone="blue"
                onClick={() => goList({})}
              />
              <StatCard
                index={1}
                label="Avec fondation dédiée"
                value={overview.fondations}
                hint={
                  total ? `${Math.round((overview.fondations / total) * 100)} % de la base` : ""
                }
                icon={<Landmark className="h-5 w-5" />}
                tone="green"
                onClick={() => goList({ vue: "fondations" })}
              />
              <StatCard
                index={2}
                label="Contacts enregistrés"
                value={overview.contacts}
                hint={`${total - overview.couvertes} entreprises sans contact`}
                icon={<UsersRound className="h-5 w-5" />}
                tone="orange"
                onClick={() => goList({ vue: "sans-contact" })}
              />
              <StatCard
                index={3}
                label="Liées à un projet"
                value={overview.avecProjet}
                hint={`sur ${projets.length} projets Amal Biladi`}
                icon={<FolderKanban className="h-5 w-5" />}
                tone="neutral"
                onClick={() => void navigate({ to: "/cartographie" })}
              />
            </StatGrid>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="card-soft p-4 sm:p-5">
                <h3 className="mb-4 text-sm font-semibold">Origine du capital</h3>
                <Donut
                  centerValue={total}
                  centerLabel="entreprises"
                  segments={[
                    {
                      label: "Marocaines",
                      value: overview.marocaines,
                      color: "var(--success)",
                      onClick: () => goList({ pays: "Maroc" }),
                    },
                    { label: "Étrangères", value: overview.etrangeres, color: "var(--primary)" },
                    ...(overview.inconnu > 0
                      ? [
                          {
                            label: "Non renseigné",
                            value: overview.inconnu,
                            color: "var(--muted-foreground)",
                          },
                        ]
                      : []),
                  ]}
                />
              </div>
              <DistributionCard
                title="Pays d'origine"
                items={overview.pays}
                total={total}
                limit={7}
                onItemClick={(label) => goList({ pays: label })}
              />
              <DistributionCard
                title="Secteurs d'activité"
                items={overview.secteurs}
                total={total}
                limit={7}
                onItemClick={(label) => goList({ secteur: label })}
              />
            </div>

            <DistributionCard
              title="Entreprises par projet Amal Biladi"
              items={overview.parProjet}
              total={total}
              limit={9}
              onItemClick={(label) => {
                const id = overview.parProjet.find((p) => p.label === label)?.id;
                if (id) goList({ projet: id });
              }}
            />
          </TabsContent>

          {/* ------------------------- Qualité des fiches ------------------------- */}
          <TabsContent value="qualite" className="space-y-4 animate-in fade-in duration-300">
            <p className="max-w-3xl text-sm text-muted-foreground">
              Une fiche est complète quand ses 10 informations essentielles sont renseignées : nom,
              pays d'origine, secteur, mode d'accès au financement, descriptif, programmes ou
              projets déjà financés, alignement thématique, contacts, projet(s) et
              sous-composante(s) liés. Le reste est un bonus.
            </p>
            <StatGrid>
              <StatCard
                index={0}
                label="Fiches complètes"
                value={quality.complete}
                hint={total ? `${Math.round((quality.complete / total) * 100)} % de la base` : ""}
                icon={<CheckCircle2 className="h-5 w-5" />}
                tone="green"
              />
              <StatCard
                index={1}
                label="Fiches à compléter"
                value={total - quality.complete}
                icon={<ClipboardList className="h-5 w-5" />}
                tone="orange"
                onClick={() => goList({ vue: "incompletes" })}
              />
              <StatCard
                index={2}
                label="5 champs requis ou plus manquants"
                value={quality.heavy}
                icon={<AlertTriangle className="h-5 w-5" />}
                tone={quality.heavy > 0 ? "red" : "green"}
              />
              <StatCard
                index={3}
                label="Champs requis remplis en moyenne"
                value={`${quality.avgRequired.toFixed(1)} / ${REQUIRED_CHECKS.length}`}
                hint={`bonus : ${quality.avgBonus.toFixed(1)} / ${BONUS_CHECKS.length}`}
                icon={<Gauge className="h-5 w-5" />}
                tone="blue"
              />
            </StatGrid>

            <div className="grid gap-4 lg:grid-cols-2">
              <DistributionCard
                title="Champs requis manquants"
                items={quality.requiredItems}
                total={total}
                limit={10}
                emptyLabel="Aucun champ requis manquant."
                onItemClick={(label) => goList({ manque: label })}
              />
              <DistributionCard
                title="Informations bonus manquantes"
                items={quality.bonusItems}
                total={total}
                limit={8}
                emptyLabel="Rien à signaler."
              />
            </div>

            <div className="card-soft p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">
                  Fiches à compléter en priorité
                  <span className="ml-2 font-normal text-muted-foreground">
                    ({filteredIncomplete.length})
                  </span>
                </h3>
                <div className="relative w-full max-w-[260px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={qualiteSearch}
                    onChange={(e) => setQualiteSearch(e.target.value)}
                    placeholder="Rechercher une entreprise…"
                    className="pl-9"
                  />
                </div>
              </div>
              {filteredIncomplete.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {quality.incomplete.length === 0
                    ? "Toutes les fiches sont complètes."
                    : "Aucune entreprise ne correspond à la recherche."}
                </p>
              ) : (
                <div className="themed-scrollbar max-h-[480px] space-y-1 overflow-y-auto pr-1">
                  {filteredIncomplete.map(({ company, missingRequired }) => (
                    <Link
                      key={company.id}
                      to="/entreprises/$id"
                      params={{ id: company.id }}
                      className="flex flex-wrap items-start gap-x-3 gap-y-1 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-secondary"
                    >
                      <span className="w-10 shrink-0 pt-0.5 text-right text-xs font-bold tabular-nums text-destructive">
                        {REQUIRED_CHECKS.length - missingRequired.length}/{REQUIRED_CHECKS.length}
                      </span>
                      <span className="min-w-[160px] shrink-0 font-medium">{company.nom}</span>
                      <span className="flex flex-1 flex-wrap gap-1">
                        {missingRequired.map((label) => (
                          <span
                            key={label}
                            className="rounded-md bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive"
                          >
                            {label}
                          </span>
                        ))}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ------------------------- Pipeline ------------------------- */}
          <TabsContent value="pipeline" className="space-y-4 animate-in fade-in duration-300">
            {pipe.engaged === 0 ? (
              <div className="card-soft flex flex-col items-center gap-3 px-6 py-14 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Target className="h-7 w-7" />
                </span>
                <h3 className="text-lg font-bold">Commencez à prospecter</h3>
                <p className="max-w-md text-sm text-muted-foreground">
                  Les {pipeline.length} entreprises sont au statut « Identifié ». Dès qu'un premier
                  contact est pris, l'entonnoir de conversion et les taux de réussite s'afficheront
                  ici.
                </p>
                <Button asChild>
                  <Link to="/pipeline">Ouvrir le pipeline</Link>
                </Button>
              </div>
            ) : (
              <>
                <StatGrid>
                  <StatCard
                    index={0}
                    label="Dossiers engagés"
                    value={pipe.engaged}
                    hint="au-delà de « Identifié »"
                    icon={<GitBranch className="h-5 w-5" />}
                    tone="blue"
                  />
                  <StatCard
                    index={1}
                    label="Échanges en cours"
                    value={pipe.enCours}
                    icon={<MessagesSquare className="h-5 w-5" />}
                    tone="orange"
                  />
                  <StatCard
                    index={2}
                    label="Partenariats signés"
                    value={pipe.signes}
                    hint={pipe.taux !== null ? `${pipe.taux} % des dossiers clos` : ""}
                    icon={<Handshake className="h-5 w-5" />}
                    tone="green"
                  />
                  <StatCard
                    index={3}
                    label="Classés sans suite"
                    value={pipe.sansSuite}
                    icon={<XCircle className="h-5 w-5" />}
                    tone="red"
                  />
                </StatGrid>
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="card-soft p-4 sm:p-5 lg:col-span-2">
                    <h3 className="mb-4 text-sm font-semibold">
                      Entonnoir de prospection
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        (% = passage depuis l'étape précédente)
                      </span>
                    </h3>
                    <Funnel stages={pipe.funnel} />
                  </div>
                  <DistributionCard
                    title="Priorité des dossiers engagés"
                    items={pipe.priorites}
                    emptyLabel="Aucun dossier engagé."
                  />
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
