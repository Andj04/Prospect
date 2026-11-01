import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BellRing, Building2, HeartHandshake, Link2, MapPin } from "lucide-react";
import { DistributionCard, StatCard, StatGrid } from "@/components/page-header";
import { isOngOverdue, typeStructureLabel } from "@/lib/ong-utils";
import { isOverdue } from "@/lib/pipeline-utils";
import { useCompaniesList } from "@/lib/queries/companies";
import { useOngList } from "@/lib/queries/ong";
import { usePipeline } from "@/lib/queries/pipeline";
import { useOngPipeline } from "@/lib/queries/pipeline-ong";
import { regionNom } from "@/components/ong/MarocCarte";
import { STATUTS, STATUTS_ONG } from "@/lib/types";

function count<T>(items: T[], keys: (t: T) => string[]) {
  const m = new Map<string, number>();
  for (const it of items) for (const k of new Set(keys(it))) m.set(k, (m.get(k) ?? 0) + 1);
  return [...m.entries()]
    .map(([label, n]) => ({ label, count: n }))
    .sort((a, b) => b.count - a.count);
}

// Onglet « ONG » du tableau de bord.
export function OngTab() {
  const navigate = useNavigate();
  const { data: list = [] } = useOngList();
  const { data: pipeline = [] } = useOngPipeline();

  const d = useMemo(
    () => ({
      types: count(list, (o) => [typeStructureLabel(o.typeStructure)]),
      themes: count(list, (o) => o.thematiques),
      apports: count(list, (o) => o.apports),
      regions: count(
        list.filter((o) => !o.echelle.includes("national")),
        (o) => o.regions.map(regionNom),
      ),
      statuts: STATUTS_ONG.map((s) => ({
        label: s.label,
        count: pipeline.filter((p) => p.statut === s.value).length,
      })).filter((s) => s.count > 0),
      nationales: list.filter((o) => o.echelle.includes("national")).length,
      transversales: list.filter((o) => o.transversale).length,
      passerelles: list.filter((o) => o.nbPasserelles > 0).length,
      retards: pipeline.filter((p) => isOngOverdue(p)).length,
    }),
    [list, pipeline],
  );

  return (
    <div className="space-y-4">
      <StatGrid>
        <StatCard
          label="ONG dans la base"
          value={list.length}
          icon={<HeartHandshake className="h-5 w-5" />}
          onClick={() => void navigate({ to: "/ong" })}
        />
        <StatCard
          label="Transversales"
          value={d.transversales}
          hint="Réseau d'entreprises documenté"
          icon={<Link2 className="h-5 w-5" />}
          tone="green"
          index={1}
        />
        <StatCard
          label="À couverture nationale"
          value={d.nationales}
          icon={<MapPin className="h-5 w-5" />}
          tone="orange"
          index={2}
          onClick={() => void navigate({ to: "/ong/carte" })}
        />
        <StatCard
          label="Relances en retard"
          value={d.retards}
          icon={<BellRing className="h-5 w-5" />}
          tone={d.retards ? "red" : "neutral"}
          index={3}
          onClick={() => void navigate({ to: "/ong/relances" })}
        />
      </StatGrid>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <DistributionCard title="Type de structure" items={d.types} total={list.length} />
        <DistributionCard
          title="Apports possibles"
          items={d.apports.map((a) => ({ ...a, tone: "green" as const }))}
          total={list.length}
        />
        <DistributionCard
          title="Statut du pipeline ONG"
          items={d.statuts}
          total={pipeline.length}
        />
        <DistributionCard title="Thématiques" items={d.themes} total={list.length} limit={10} />
        <DistributionCard
          title="Régions (hors ONG nationales)"
          items={d.regions.map((r) => ({ ...r, tone: "orange" as const }))}
          total={list.length}
          limit={12}
        />
      </div>
    </div>
  );
}

// Onglet « Global » : les deux bases côte à côte.
export function GlobalTab() {
  const navigate = useNavigate();
  const { data: companies = [] } = useCompaniesList();
  const { data: pipeline = [] } = usePipeline();
  const { data: ongs = [] } = useOngList();
  const { data: ongPipeline = [] } = useOngPipeline();

  const retardsE = pipeline.filter((p) => isOverdue(p)).length;
  const retardsO = ongPipeline.filter((p) => isOngOverdue(p)).length;
  const passerelles = ongs.reduce((n, o) => n + o.nbPasserelles, 0);
  const actives = companies.filter((c) => !c.exclue).length;

  return (
    <div className="space-y-4">
      <StatGrid>
        <StatCard
          label="Entreprises ciblées"
          value={actives}
          hint={`${companies.length} au total`}
          icon={<Building2 className="h-5 w-5" />}
          onClick={() => void navigate({ to: "/entreprises" })}
        />
        <StatCard
          label="ONG"
          value={ongs.length}
          icon={<HeartHandshake className="h-5 w-5" />}
          tone="orange"
          index={1}
          onClick={() => void navigate({ to: "/ong" })}
        />
        <StatCard
          label="Relances en retard"
          value={retardsE + retardsO}
          hint={`${retardsE} entreprises · ${retardsO} ONG`}
          icon={<BellRing className="h-5 w-5" />}
          tone={retardsE + retardsO ? "red" : "neutral"}
          index={2}
          onClick={() => void navigate({ to: "/echeances" })}
        />
        <StatCard
          label="Passerelles validées"
          value={passerelles}
          hint="ONG qui peuvent introduire une entreprise"
          icon={<Link2 className="h-5 w-5" />}
          tone="green"
          index={3}
          onClick={() => void navigate({ to: "/passerelles" })}
        />
      </StatGrid>
      <div className="grid gap-4 lg:grid-cols-2">
        <DistributionCard
          title="Pipeline entreprises"
          items={STATUTS.map((s) => ({
            label: s.label,
            count: pipeline.filter((p) => p.statut === s.value).length,
          })).filter((s) => s.count > 0)}
          total={pipeline.length}
        />
        <DistributionCard
          title="Pipeline ONG"
          items={STATUTS_ONG.map((s) => ({
            label: s.label,
            count: ongPipeline.filter((p) => p.statut === s.value).length,
            tone: "orange" as const,
          })).filter((s) => s.count > 0)}
          total={ongPipeline.length}
        />
      </div>
    </div>
  );
}
