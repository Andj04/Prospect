import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Globe, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MarocCarte, regionNom } from "@/components/ong/MarocCarte";
import { TypeStructureBadge } from "@/components/ong/ong-badges";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useOngList } from "@/lib/queries/ong";
import { APPORTS, MILIEUX, TYPE_STRUCTURE_OPTIONS, type RegionCode } from "@/lib/types";

export const Route = createFileRoute("/ong/carte")({
  head: () => ({ meta: [{ title: "Carte des ONG — Prospection RSE Amal Biladi" }] }),
  component: CarteOngPage,
});

const ALL = "__all__";

function CarteOngPage() {
  const { data: list = [], isLoading } = useOngList();
  const [theme, setTheme] = useState(ALL);
  const [apport, setApport] = useState(ALL);
  const [type, setType] = useState(ALL);
  const [milieu, setMilieu] = useState(ALL);
  // 28 ONG sur 69 couvrent tout le pays : si elles comptaient dans chaque
  // région, la carte serait uniformément foncée et ne dirait plus rien.
  const [inclureNationales, setInclureNationales] = useState(false);
  const [selected, setSelected] = useState<RegionCode | null>(null);

  const themes = useMemo(
    () => [...new Set(list.flatMap((o) => o.thematiques))].sort((a, b) => a.localeCompare(b, "fr")),
    [list],
  );

  const filtered = useMemo(
    () =>
      list.filter((o) => {
        if (theme !== ALL && !o.thematiques.includes(theme)) return false;
        if (apport !== ALL && !(o.apports as string[]).includes(apport)) return false;
        if (type !== ALL && o.typeStructure !== type) return false;
        if (milieu !== ALL && !(o.milieu as string[]).includes(milieu)) return false;
        return true;
      }),
    [list, theme, apport, type, milieu],
  );

  const mapped = useMemo(
    () => filtered.filter((o) => inclureNationales || !o.echelle.includes("national")),
    [filtered, inclureNationales],
  );

  const counts = useMemo(() => {
    const c: Partial<Record<RegionCode, number>> = {};
    for (const o of mapped) for (const r of o.regions) c[r] = (c[r] ?? 0) + 1;
    return c;
  }, [mapped]);

  const inRegion = selected ? mapped.filter((o) => o.regions.includes(selected)) : [];
  const nbNationales = filtered.filter((o) => o.echelle.includes("national")).length;
  const nbInternational = filtered.filter((o) => o.echelle.includes("international")).length;
  const nbSansRegion = filtered.filter((o) => o.regions.length === 0).length;
  const dirty = [theme, apport, type, milieu].some((v) => v !== ALL);

  const pick = (
    label: string,
    value: string,
    set: (v: string) => void,
    opts: { value: string; label: string }[],
  ) => (
    <Select value={value} onValueChange={set}>
      <SelectTrigger className="h-9 w-[12rem]" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{label} : tous</SelectItem>
        {opts.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <AppShell>
      <div className="space-y-5">
        <PageHeader
          title="Carte des ONG"
          description="Nombre d'ONG intervenant dans chaque région. Cliquez sur une région pour voir la liste. Les régions sont déduites des lieux cités dans les fiches et doivent être relues."
        />

        <div className="card-soft flex flex-wrap items-center gap-2 p-4">
          {pick(
            "Thématique",
            theme,
            setTheme,
            themes.map((t) => ({ value: t, label: t })),
          )}
          {pick(
            "Apport",
            apport,
            setApport,
            APPORTS.map((a) => ({ value: a, label: a })),
          )}
          {pick("Type", type, setType, TYPE_STRUCTURE_OPTIONS)}
          {pick("Milieu", milieu, setMilieu, MILIEUX)}
          {dirty && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTheme(ALL);
                setApport(ALL);
                setType(ALL);
                setMilieu(ALL);
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser
            </Button>
          )}
          <label className="ml-auto flex items-center gap-2 text-sm">
            <Switch checked={inclureNationales} onCheckedChange={setInclureNationales} />
            Inclure les ONG nationales ({nbNationales})
          </label>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,32rem)_minmax(0,1fr)]">
          <div className="card-soft p-4">
            {isLoading ? (
              <Skeleton className="aspect-[1000/1074] w-full" />
            ) : (
              <MarocCarte counts={counts} selected={selected} onSelect={setSelected} />
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-orange/25 px-2.5 py-1 font-medium text-warning-foreground">
                <Globe className="h-3 w-3" />
                International : {nbInternational} ONG
              </span>
              {nbSansRegion > 0 && (
                <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                  Sans région identifiée : {nbSansRegion}
                </span>
              )}
            </div>
          </div>

          <div className="card-soft p-5">
            {!selected ? (
              <p className="text-sm text-muted-foreground">
                {mapped.length} ONG affichées sur la carte
                {inclureNationales ? "" : ", hors ONG à couverture nationale"}. Choisissez une
                région pour afficher ses ONG.
              </p>
            ) : (
              <>
                <h2 className="text-base font-semibold">
                  {regionNom(selected)}{" "}
                  <span className="font-normal text-muted-foreground">— {inRegion.length} ONG</span>
                </h2>
                {inRegion.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Aucune ONG pour ces critères.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-border">
                    {inRegion.map((o) => (
                      <li key={o.id} className="flex flex-wrap items-center gap-2 py-2">
                        <Link
                          to="/ong/$id"
                          params={{ id: o.id }}
                          className="font-medium text-primary-deep hover:underline dark:text-primary"
                        >
                          {o.nom}
                        </Link>
                        <TypeStructureBadge type={o.typeStructure} />
                        {!o.regionsVerifiees && (
                          <span className="text-[11px] text-muted-foreground">
                            région à vérifier
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
