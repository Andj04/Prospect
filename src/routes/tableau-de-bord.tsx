import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Building2,
  ClipboardCheck,
  Flag,
  Globe2,
  Handshake,
  Landmark,
  MessagesSquare,
  Search,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DistributionCard, PageHeader, StatCard, StatGrid } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { useCompanies } from "@/lib/queries/companies";
import { usePipeline } from "@/lib/queries/pipeline";
import { BONUS_CHECKS, REQUIRED_CHECKS } from "@/lib/completeness";
import { STATUTS, type PipelineStatut, type Priorite } from "@/lib/types";

const PRIORITE_OPTIONS: Priorite[] = ["haute", "moyenne", "basse"];

export const Route = createFileRoute("/tableau-de-bord")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — Amal Biladi" },
      {
        name: "description",
        content:
          "Vue d'ensemble de la base de prospection RSE : entreprises, origine du capital, secteurs et pipeline.",
      },
    ],
  }),
  component: TableauDeBordPage,
});

type Tone = "blue" | "green" | "orange" | "red" | "neutral";

const STATUT_TONE: Record<PipelineStatut, Tone> = {
  identifie: "neutral",
  "premier-contact": "blue",
  "en-discussion": "blue",
  "visite-programmee": "orange",
  "proposition-envoyee": "orange",
  "partenariat-signe": "green",
  "sans-suite": "red",
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

// Compte les occurrences d'une clé (secteur, pays, statut…) et trie par
// fréquence décroissante — la même forme sert à chaque carte de répartition
// de cette page.
function countBy<T>(items: T[], key: (item: T) => string, tone?: (label: string) => Tone) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count, tone: tone ? tone(label) : ("blue" as Tone) }));
}

function TableauDeBordPage() {
  const { data: companies = [] } = useCompanies();
  const { data: pipeline = [] } = usePipeline();

  const avecFondation = companies.filter((c) => c.structureDediee).length;
  const inProgress = pipeline.filter((p) =>
    ["premier-contact", "en-discussion", "visite-programmee", "proposition-envoyee"].includes(
      p.statut,
    ),
  ).length;
  const signed = pipeline.filter((p) => p.statut === "partenariat-signe").length;

  const marocaines = companies.filter((c) => c.paysOrigine === "Maroc").length;
  const etrangeres = companies.filter((c) => c.paysOrigine && c.paysOrigine !== "Maroc").length;
  const origineRenseignee = marocaines + etrangeres;
  const ratio = (n: number) =>
    origineRenseignee > 0 ? Math.round((n / origineRenseignee) * 100) : 0;

  const paysItems = useMemo(
    () =>
      countBy(
        companies,
        (c) => c.paysOrigine || "Non renseigné",
        (label) => (label === "Maroc" ? "green" : label === "Non renseigné" ? "neutral" : "blue"),
      ),
    [companies],
  );

  const secteurItems = useMemo(
    () => countBy(companies, (c) => c.secteur || "Non renseigné"),
    [companies],
  );

  const statutItems = useMemo(
    () =>
      STATUTS.map(({ value, label }) => ({
        label,
        count: pipeline.filter((p) => p.statut === value).length,
        tone: STATUT_TONE[value],
      })).filter((i) => i.count > 0),
    [pipeline],
  );

  const prioriteItems = useMemo(
    () =>
      PRIORITE_OPTIONS.map((value) => ({
        label: value.charAt(0).toUpperCase() + value.slice(1),
        count: pipeline.filter((p) => p.priorite === value).length,
        tone: PRIORITE_TONE[value],
      })).filter((i) => i.count > 0),
    [pipeline],
  );

  // Complétude des fiches : recalculée à chaque changement de `companies`
  // (React Query relit Supabase dès qu'un champ est modifié quelque part
  // dans l'app), donc les chiffres suivent en direct chaque mise à jour.
  const completion = useMemo(() => {
    const rows = companies.map((c) => {
      const missingRequired = REQUIRED_CHECKS.filter((f) => !f.test(c)).map((f) => f.label);
      const missingBonus = BONUS_CHECKS.filter((f) => !f.test(c)).map((f) => f.label);
      return { company: c, missingRequired, missingBonus };
    });
    const total = rows.length;
    const complete = rows.filter((r) => r.missingRequired.length === 0).length;
    const avgRequiredFilled = total
      ? REQUIRED_CHECKS.length - rows.reduce((s, r) => s + r.missingRequired.length, 0) / total
      : 0;
    const avgBonusFilled = total
      ? BONUS_CHECKS.length - rows.reduce((s, r) => s + r.missingBonus.length, 0) / total
      : 0;
    const heavy = rows.filter((r) => r.missingRequired.length >= 5).length;

    const requiredItems = REQUIRED_CHECKS.map((f) => {
      const count = rows.filter((r) => r.missingRequired.includes(f.label)).length;
      return { label: f.label, count, tone: severityTone(count, total) };
    }).sort((a, b) => b.count - a.count);

    const bonusItems = BONUS_CHECKS.map((f) => {
      const count = rows.filter((r) => r.missingBonus.includes(f.label)).length;
      return { label: f.label, count, tone: "neutral" as Tone };
    }).sort((a, b) => b.count - a.count);

    const incomplete = rows
      .filter((r) => r.missingRequired.length > 0)
      .sort((a, b) => b.missingRequired.length - a.missingRequired.length);

    return {
      total,
      complete,
      avgRequiredFilled,
      avgBonusFilled,
      heavy,
      requiredItems,
      bonusItems,
      incomplete,
    };
  }, [companies]);

  const [completionSearch, setCompletionSearch] = useState("");
  const filteredIncomplete = useMemo(() => {
    const q = completionSearch.trim().toLowerCase();
    if (!q) return completion.incomplete;
    return completion.incomplete.filter((r) => r.company.nom.toLowerCase().includes(q));
  }, [completion.incomplete, completionSearch]);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Tableau de bord"
          description="Vue d'ensemble de la base de prospection : entreprises, origine du capital, secteurs et pipeline."
        />

        <StatGrid>
          <StatCard
            label="Entreprises & fondations"
            value={companies.length}
            hint="dans la base"
            icon={<Building2 className="h-5 w-5" />}
            tone="blue"
          />
          <StatCard
            label="Avec fondation dédiée"
            value={avecFondation}
            icon={<Landmark className="h-5 w-5" />}
            tone="neutral"
          />
          <StatCard
            label="Échanges en cours"
            value={inProgress}
            hint="contact, discussion, proposition"
            icon={<MessagesSquare className="h-5 w-5" />}
            tone="orange"
          />
          <StatCard
            label="Partenariats signés"
            value={signed}
            icon={<Handshake className="h-5 w-5" />}
            tone="green"
          />
          <StatCard
            label="Entreprises marocaines"
            value={marocaines}
            hint={
              origineRenseignee > 0
                ? `${ratio(marocaines)} % des origines renseignées`
                : "pays d'origine non renseigné"
            }
            icon={<Flag className="h-5 w-5" />}
            tone="green"
          />
          <StatCard
            label="Entreprises étrangères"
            value={etrangeres}
            hint={
              origineRenseignee > 0
                ? `${ratio(etrangeres)} % des origines renseignées`
                : "pays d'origine non renseigné"
            }
            icon={<Globe2 className="h-5 w-5" />}
            tone="blue"
          />
        </StatGrid>

        <div className="grid gap-3 lg:grid-cols-2">
          <DistributionCard title="Origine du capital" items={paysItems} />
          <DistributionCard title="Répartition par secteur" items={secteurItems} />
          <DistributionCard
            title="Statut du pipeline"
            items={statutItems}
            emptyLabel="Aucune entrée de pipeline pour l'instant."
          />
          <DistributionCard
            title="Priorité des dossiers"
            items={prioriteItems}
            emptyLabel="Aucune entrée de pipeline pour l'instant."
          />
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Niveau de remplissage des fiches</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Une fiche est complète quand ses 10 informations essentielles sont renseignées : nom,
              pays d'origine, secteur, mode d'accès au financement, descriptif, programmes/projets
              déjà financés, alignement thématique, contacts, projet(s) et sous-composante(s) liés.
              Le reste (budget, contexte, notes…) est un bonus.
            </p>
          </div>

          <StatGrid>
            <StatCard
              label="Fiches complètes"
              value={completion.complete}
              {...(completion.total > 0
                ? {
                    hint: `${Math.round((completion.complete / completion.total) * 100)} % de la base`,
                  }
                : {})}
              icon={<ClipboardCheck className="h-5 w-5" />}
              tone={completion.complete === completion.total ? "green" : "neutral"}
            />
            <StatCard
              label="Fiches à compléter"
              value={completion.total - completion.complete}
              icon={<ClipboardCheck className="h-5 w-5" />}
              tone="orange"
            />
            <StatCard
              label="Fiches avec 5+ champs requis manquants"
              value={completion.heavy}
              icon={<ClipboardCheck className="h-5 w-5" />}
              tone={completion.heavy > 0 ? "red" : "green"}
            />
            <StatCard
              label="Champs requis remplis en moyenne"
              value={`${completion.avgRequiredFilled.toFixed(1)} / ${REQUIRED_CHECKS.length}`}
              hint={`bonus : ${completion.avgBonusFilled.toFixed(1)} / ${BONUS_CHECKS.length} en moyenne`}
              icon={<ClipboardCheck className="h-5 w-5" />}
              tone="blue"
            />
          </StatGrid>

          <div className="grid gap-3 lg:grid-cols-2">
            <DistributionCard title="Champs requis manquants" items={completion.requiredItems} />
            <DistributionCard
              title="Informations bonus manquantes"
              items={completion.bonusItems}
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
                  value={completionSearch}
                  onChange={(e) => setCompletionSearch(e.target.value)}
                  placeholder="Rechercher une entreprise…"
                  className="pl-9"
                />
              </div>
            </div>
            {filteredIncomplete.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {completion.incomplete.length === 0
                  ? "Toutes les fiches sont complètes."
                  : "Aucune entreprise ne correspond à la recherche."}
              </p>
            ) : (
              <div className="max-h-[480px] space-y-1 overflow-y-auto pr-1">
                {filteredIncomplete.map(({ company, missingRequired }) => (
                  <Link
                    key={company.id}
                    to="/entreprises/$id"
                    params={{ id: company.id }}
                    className="flex flex-wrap items-start gap-x-3 gap-y-1 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-secondary"
                  >
                    <span className="w-6 shrink-0 pt-0.5 text-right text-xs font-bold tabular-nums text-destructive">
                      {missingRequired.length}
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
        </div>
      </div>
    </AppShell>
  );
}
