import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Plus, RotateCcw, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { projetLabel } from "@/components/badges";
import { OddBadge, OngStatutBadge, Tag } from "@/components/ong/ong-badges";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  downloadCsv,
  echelleLabel,
  milieuLabel,
  normaliser,
  typeStructureLabel,
} from "@/lib/ong-utils";
import { useOngList, usePatchOng } from "@/lib/queries/ong";
import { useOngPipeline } from "@/lib/queries/pipeline-ong";
import { useAllProjects } from "@/lib/queries/projects";
import {
  APPORTS,
  ECHELLES,
  MILIEUX,
  REGIONS,
  TYPE_STRUCTURE_OPTIONS,
  type OngListItem,
  type TypeStructure,
} from "@/lib/types";
import { regionNom } from "@/components/ong/MarocCarte";

export const Route = createFileRoute("/ong/")({
  head: () => ({
    meta: [
      { title: "ONG — Prospection RSE Amal Biladi" },
      { name: "description", content: "Base des ONG et fondations partenaires d'Amal Biladi." },
    ],
  }),
  component: OngPage,
});

const ALL = "__all__";

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[11.5rem]" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{label} : tous</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SiegeCell({ ong, editable }: { ong: OngListItem; editable: boolean }) {
  const patch = usePatchOng();
  if (!editable) return <span>{ong.siege ?? "—"}</span>;
  return (
    <Input
      key={ong.siege ?? ""}
      defaultValue={ong.siege ?? ""}
      aria-label={`Siège de ${ong.nom}`}
      className="h-8 w-36"
      onBlur={(e) =>
        e.target.value !== (ong.siege ?? "") &&
        patch.mutate({ id: ong.id, patch: { siege: e.target.value } })
      }
    />
  );
}

function OngPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { data: list = [], isLoading } = useOngList();
  const { data: pipeline = [] } = useOngPipeline();
  const { data: projets = [] } = useAllProjects();
  const patch = usePatchOng();

  const [q, setQ] = useState("");
  const [type, setType] = useState(ALL);
  const [theme, setTheme] = useState(ALL);
  const [region, setRegion] = useState(ALL);
  const [milieu, setMilieu] = useState(ALL);
  const [echelle, setEchelle] = useState(ALL);
  const [apport, setApport] = useState(ALL);
  const [projet, setProjet] = useState(ALL);
  const [transversale, setTransversale] = useState(false);

  const statutOf = useMemo(() => new Map(pipeline.map((p) => [p.ongId, p.statut])), [pipeline]);
  const themes = useMemo(
    () => [...new Set(list.flatMap((o) => o.thematiques))].sort((a, b) => a.localeCompare(b, "fr")),
    [list],
  );

  const rows = useMemo(() => {
    const needle = normaliser(q);
    return list.filter((o) => {
      if (needle && !normaliser(o.recherche).includes(needle)) return false;
      if (type !== ALL && o.typeStructure !== type) return false;
      if (theme !== ALL && !o.thematiques.includes(theme)) return false;
      if (region !== ALL && !(o.regions as string[]).includes(region)) return false;
      if (milieu !== ALL && !(o.milieu as string[]).includes(milieu)) return false;
      if (echelle !== ALL && !(o.echelle as string[]).includes(echelle)) return false;
      if (apport !== ALL && !(o.apports as string[]).includes(apport)) return false;
      if (projet !== ALL && !o.projets.includes(projet)) return false;
      if (transversale && !o.transversale) return false;
      return true;
    });
  }, [list, q, type, theme, region, milieu, echelle, apport, projet, transversale]);

  const filtered =
    q.trim() !== "" ||
    [type, theme, region, milieu, echelle, apport, projet].some((v) => v !== ALL) ||
    transversale;
  const reset = () => {
    setQ("");
    setType(ALL);
    setTheme(ALL);
    setRegion(ALL);
    setMilieu(ALL);
    setEchelle(ALL);
    setApport(ALL);
    setProjet(ALL);
    setTransversale(false);
  };

  const exportCsv = () =>
    downloadCsv(
      "ong-amal-biladi.csv",
      [
        "Nom",
        "Acronyme",
        "Type",
        "Siège",
        "Thématiques",
        "Échelle",
        "Milieu",
        "Régions",
        "Apports",
        "Projet principal",
        "Transversale",
        "Statut",
      ],
      rows.map((o) => [
        o.nom,
        o.acronyme ?? "",
        typeStructureLabel(o.typeStructure),
        o.siege ?? "",
        o.thematiques.join(", "),
        o.echelle.map(echelleLabel).join(", "),
        o.milieu.map(milieuLabel).join(", "),
        o.regions.map(regionNom).join(", "),
        o.apports.join(", "),
        o.projetPrincipalId ? projetLabel(projets, o.projetPrincipalId) : "",
        o.transversale ? "Oui" : "",
        statutOf.get(o.id) ?? "",
      ]),
    );

  return (
    <AppShell>
      <div className="space-y-5">
        <PageHeader
          title="ONG"
          description={`${list.length} ONG et fondations partenaires potentielles. Les ONG ne sont pas des financeurs : elles apportent réseau, expertise ou relais terrain.`}
          actions={
            <>
              <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
                <Download className="h-4 w-4" />
                Exporter ({rows.length})
              </Button>
              {isAdmin && (
                <Button asChild>
                  <Link to="/ong/nouvelle">
                    <Plus className="h-4 w-4" />
                    Ajouter une ONG
                  </Link>
                </Button>
              )}
            </>
          }
        />

        <div className="card-soft space-y-3 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un nom, un acronyme, une ville, une thématique, un partenaire…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter label="Type" value={type} onChange={setType} options={TYPE_STRUCTURE_OPTIONS} />
            <Filter
              label="Thématique"
              value={theme}
              onChange={setTheme}
              options={themes.map((t) => ({ value: t, label: t }))}
            />
            <Filter
              label="Région"
              value={region}
              onChange={setRegion}
              options={REGIONS.map((r) => ({ value: r.code, label: r.nom }))}
            />
            <Filter label="Milieu" value={milieu} onChange={setMilieu} options={MILIEUX} />
            <Filter label="Échelle" value={echelle} onChange={setEchelle} options={ECHELLES} />
            <Filter
              label="Apport"
              value={apport}
              onChange={setApport}
              options={APPORTS.map((a) => ({ value: a, label: a }))}
            />
            <Filter
              label="Projet"
              value={projet}
              onChange={setProjet}
              options={projets.map((p) => ({ value: p.id, label: p.nom }))}
            />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={transversale}
                onCheckedChange={(c) => setTransversale(c === true)}
              />
              Transversales
            </label>
            {filtered && (
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="h-4 w-4" />
                Réinitialiser
              </Button>
            )}
          </div>
        </div>

        <div className="card-soft overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-64">ONG</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Siège</TableHead>
                <TableHead className="min-w-56">Thématiques</TableHead>
                <TableHead>ODD</TableHead>
                <TableHead>Territoire</TableHead>
                <TableHead className="min-w-48">Apports possibles</TableHead>
                <TableHead>Projet principal</TableHead>
                <TableHead>Réseau</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={10}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Aucune ONG ne correspond à ces critères.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((o) => {
                const statut = statutOf.get(o.id);
                return (
                  <TableRow
                    key={o.id}
                    className="cursor-pointer align-top"
                    onClick={() => navigate({ to: "/ong/$id", params: { id: o.id } })}
                  >
                    <TableCell>
                      <p className="font-semibold">{o.nom}</p>
                      {o.acronyme && o.acronyme !== o.nom && (
                        <p className="text-xs text-muted-foreground">{o.acronyme}</p>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => isAdmin && e.stopPropagation()}>
                      {isAdmin ? (
                        <Select
                          value={o.typeStructure}
                          onValueChange={(v) =>
                            patch.mutate({ id: o.id, patch: { typeStructure: v as TypeStructure } })
                          }
                        >
                          <SelectTrigger className="h-8 w-44" aria-label={`Type de ${o.nom}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TYPE_STRUCTURE_OPTIONS.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        typeStructureLabel(o.typeStructure)
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => isAdmin && e.stopPropagation()}>
                      <SiegeCell ong={o} editable={isAdmin} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {o.thematiques.slice(0, 4).map((t) => (
                          <Tag key={t}>{t}</Tag>
                        ))}
                        {o.thematiques.length > 4 && (
                          <span
                            className="text-xs text-muted-foreground"
                            title={o.thematiques.slice(4).join(", ")}
                          >
                            +{o.thematiques.length - 4}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-40 flex-wrap gap-1">
                        {o.odd.slice(0, 6).map((n) => (
                          <OddBadge key={n} n={n} />
                        ))}
                        {o.odd.length > 6 && (
                          <span className="text-xs text-muted-foreground">+{o.odd.length - 6}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {o.echelle.length > 0 && <p>{o.echelle.map(echelleLabel).join(", ")}</p>}
                      <p className="text-xs text-muted-foreground">
                        {o.regions.length > 0
                          ? `${o.regions.length} région${o.regions.length > 1 ? "s" : ""}`
                          : "—"}
                        {o.milieu.length > 0 && ` · ${o.milieu.map(milieuLabel).join(", ")}`}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {o.apports.map((a) => (
                          <span
                            key={a}
                            className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary-deep dark:text-primary"
                          >
                            {a.length > 26 ? `${a.slice(0, 24)}…` : a}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {o.projetPrincipalId ? projetLabel(projets, o.projetPrincipalId) : "—"}
                      {o.transversale && (
                        <span className="ml-1 rounded bg-success/15 px-1.5 py-0.5 text-[11px] font-medium text-success">
                          transversale
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {o.nbContacts} contact{o.nbContacts > 1 ? "s" : ""}
                      <br />
                      {o.nbPartenaires} partenaires
                      {o.nbPasserelles > 0 && (
                        <span className="text-success">
                          {" "}
                          · {o.nbPasserelles} passerelle{o.nbPasserelles > 1 ? "s" : ""}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{statut ? <OngStatutBadge statut={statut} /> : "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppShell>
  );
}
