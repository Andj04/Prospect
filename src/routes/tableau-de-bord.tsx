import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Building2, Flag, Globe2, Handshake, Landmark, MessagesSquare } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DistributionCard, PageHeader, StatCard, StatGrid } from "@/components/page-header";
import { useCompanies } from "@/lib/queries/companies";
import { usePipeline } from "@/lib/queries/pipeline";
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
      </div>
    </AppShell>
  );
}
