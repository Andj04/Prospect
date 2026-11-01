import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, BellRing, CalendarCheck, CalendarClock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { OngStatutBadge } from "@/components/ong/ong-badges";
import { OngSuiviPanel } from "@/components/ong/OngSuiviPanel";
import { PageHeader, StatCard, StatGrid } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ongRelanceBucket } from "@/lib/ong-utils";
import { BUCKET_LABEL, type RelanceBucket } from "@/lib/pipeline-utils";
import { useOngList } from "@/lib/queries/ong";
import { STATUTS_ONG_CLOS, useOngPipeline } from "@/lib/queries/pipeline-ong";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ong/relances")({
  head: () => ({ meta: [{ title: "Relances ONG — Prospection RSE Amal Biladi" }] }),
  component: RelancesOngPage,
});

const ORDER: RelanceBucket[] = ["retard", "aujourdhui", "semaine", "plus-tard", "sans-date"];
const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "");

function RelancesOngPage() {
  const { data: list = [], isLoading } = useOngList();
  const { data: pipeline = [] } = useOngPipeline();
  const [openId, setOpenId] = useState<string | null>(null);

  const nameOf = useMemo(() => new Map(list.map((o) => [o.id, o.nom])), [list]);
  const actifs = pipeline.filter(
    (p) => !STATUTS_ONG_CLOS.includes(p.statut) && nameOf.has(p.ongId),
  );
  // « Sans échéance » ne concerne que les dossiers déjà engagés, pas les 65 « à contacter ».
  const buckets = useMemo(() => {
    const by = new Map<RelanceBucket, typeof actifs>();
    for (const p of actifs) {
      const b = ongRelanceBucket(p);
      if (b === "sans-date" && p.statut === "a-contacter") continue;
      by.set(b, [...(by.get(b) ?? []), p]);
    }
    for (const arr of by.values())
      arr.sort((a, b) =>
        (a.prochaineActionDate ?? "9").localeCompare(b.prochaineActionDate ?? "9"),
      );
    return by;
  }, [actifs]);

  const open = openId ? pipeline.find((p) => p.ongId === openId) : undefined;

  return (
    <AppShell>
      <div className="space-y-5">
        <PageHeader
          title="Relances ONG"
          description="Prochaines actions à mener avec les ONG, de la plus urgente à la plus lointaine."
        />
        <StatGrid>
          <StatCard
            label="En retard"
            value={buckets.get("retard")?.length ?? 0}
            icon={<AlertTriangle className="h-5 w-5" />}
            tone="red"
            index={0}
          />
          <StatCard
            label="Aujourd'hui"
            value={buckets.get("aujourdhui")?.length ?? 0}
            icon={<BellRing className="h-5 w-5" />}
            tone="orange"
            index={1}
          />
          <StatCard
            label="Cette semaine"
            value={buckets.get("semaine")?.length ?? 0}
            icon={<CalendarClock className="h-5 w-5" />}
            tone="blue"
            index={2}
          />
          <StatCard
            label="Plus tard"
            value={buckets.get("plus-tard")?.length ?? 0}
            icon={<CalendarCheck className="h-5 w-5" />}
            tone="green"
            index={3}
          />
        </StatGrid>

        {isLoading ? (
          <Skeleton className="h-64" />
        ) : buckets.size === 0 ? (
          <p className="card-soft p-8 text-center text-sm text-muted-foreground">
            Aucune relance planifiée. Les échéances se définissent dans le suivi de chaque fiche
            ONG.
          </p>
        ) : (
          ORDER.filter((b) => buckets.has(b)).map((b) => (
            <section key={b} className="space-y-2">
              <h2
                className={cn(
                  "text-sm font-semibold uppercase tracking-wide",
                  b === "retard" ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {BUCKET_LABEL[b]} · {buckets.get(b)!.length}
              </h2>
              <ul className="card-soft divide-y divide-border">
                {buckets.get(b)!.map((p) => (
                  <li key={p.ongId} className="flex flex-wrap items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/ong/$id"
                        params={{ id: p.ongId }}
                        className="font-semibold hover:underline"
                      >
                        {nameOf.get(p.ongId)}
                      </Link>
                      <p className="truncate text-sm text-muted-foreground">
                        {p.prochaineAction || "Aucune action définie"}
                        {p.prochaineActionDate && ` · ${fmt(p.prochaineActionDate)}`}
                        {p.responsable && ` · ${p.responsable}`}
                      </p>
                    </div>
                    <OngStatutBadge statut={p.statut} />
                    <Button size="sm" variant="outline" onClick={() => setOpenId(p.ongId)}>
                      Ouvrir le suivi
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      <Sheet open={Boolean(open)} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{open ? nameOf.get(open.ongId) : ""}</SheetTitle>
            <SheetDescription>Suivi de la relation avec l'ONG.</SheetDescription>
          </SheetHeader>
          {open && (
            <div className="px-4 pb-6">
              <OngSuiviPanel ongId={open.ongId} dossier={open} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
