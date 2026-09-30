import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BellRing,
  CalendarCheck,
  CalendarClock,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { StatutBadge } from "@/components/badges";
import { PageHeader, StatCard, StatGrid } from "@/components/page-header";
import { DossierPanel } from "@/components/pipeline/DossierPanel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  BUCKET_LABEL,
  isInactive,
  relanceBucket,
  todayIso,
  type RelanceBucket,
} from "@/lib/pipeline-utils";
import { useCompaniesList, useCompany } from "@/lib/queries/companies";
import { useAddHistorique, usePipeline } from "@/lib/queries/pipeline";
import { reveal } from "@/lib/reveal";
import { TYPES_ECHANGE, type PipelineItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/relances")({
  head: () => ({ meta: [{ title: "Relances — Prospection RSE Amal Biladi" }] }),
  component: RelancesPage,
});

const ORDER: RelanceBucket[] = ["retard", "aujourdhui", "semaine", "plus-tard", "sans-date"];
const TONE: Record<RelanceBucket, string> = {
  retard: "text-destructive",
  aujourdhui: "text-brand-orange",
  semaine: "text-primary",
  "plus-tard": "text-muted-foreground",
  "sans-date": "text-muted-foreground",
};

function addDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// Clôture d'une relance : on note ce qui s'est passé et on planifie la suite.
function DoneDialog({
  dossier,
  nom,
  onClose,
}: {
  dossier: PipelineItem | null;
  nom: string;
  onClose: () => void;
}) {
  const { profile } = useAuth();
  const addHistorique = useAddHistorique();
  const [type, setType] = useState("Appel");
  const [resume, setResume] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextDate, setNextDate] = useState(addDays(14));

  return (
    <Dialog open={Boolean(dossier)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Relance faite — {nom}</DialogTitle>
          <DialogDescription>{dossier?.prochaineAction || "Relance"}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger aria-label="Type d'échange">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES_ECHANGE.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              rows={3}
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              placeholder="Ce qui s'est passé…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Relance suivante</Label>
            <div className="grid gap-2 sm:grid-cols-[1fr_160px]">
              <Input
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder="Ex. Envoyer la proposition"
              />
              <Input
                type="date"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                aria-label="Date"
              />
            </div>
            <div className="flex gap-1.5">
              {[
                ["Dans 1 semaine", 7],
                ["2 semaines", 14],
                ["1 mois", 30],
              ].map(([label, n]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setNextDate(addDays(n as number))}
                  className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={!resume.trim() || addHistorique.isPending}
            onClick={() =>
              dossier &&
              addHistorique.mutate(
                {
                  companyId: dossier.companyId,
                  entry: {
                    date: todayIso(),
                    type,
                    resume: resume.trim(),
                    auteur: profile?.fullName || "Admin",
                  },
                  next: { action: nextAction.trim(), date: nextDate || null },
                },
                {
                  onSuccess: () => {
                    toast.success("Relance enregistrée");
                    setResume("");
                    setNextAction("");
                    onClose();
                  },
                  onError: (e) => toast.error(e instanceof Error ? e.message : "Échec"),
                },
              )
            }
          >
            <Check className="h-4 w-4" />
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RelancesPage() {
  const { isAdmin, profile } = useAuth();
  const { data: pipeline = [] } = usePipeline();
  const { data: companies = [] } = useCompaniesList();
  const [mine, setMine] = useState(false);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);
  const nameOf = (id: string) => companyById.get(id)?.nom ?? "—";

  // Une relance = un dossier engagé (au-delà d'« Identifié ») et non clos, ou
  // n'importe quel dossier auquel une échéance a été donnée.
  const relances = useMemo(
    () =>
      pipeline.filter(
        (p) =>
          p.statut !== "partenariat-signe" &&
          p.statut !== "sans-suite" &&
          (p.statut !== "identifie" || Boolean(p.prochaineActionDate)) &&
          (!mine || p.responsableId === profile?.id),
      ),
    [pipeline, mine, profile?.id],
  );

  const groups = useMemo(() => {
    const today = todayIso();
    const m = new Map<RelanceBucket, PipelineItem[]>();
    for (const p of relances) {
      const b = relanceBucket(p, today);
      m.set(b, [...(m.get(b) ?? []), p]);
    }
    for (const list of m.values())
      list.sort((a, b) =>
        (a.prochaineActionDate ?? "9999").localeCompare(b.prochaineActionDate ?? "9999"),
      );
    return m;
  }, [relances]);

  const count = (b: RelanceBucket) => groups.get(b)?.length ?? 0;
  const done = doneId ? (pipeline.find((p) => p.companyId === doneId) ?? null) : null;
  const open = openId ? pipeline.find((p) => p.companyId === openId) : undefined;
  const { data: openCompany } = useCompany(openId ?? undefined);
  let idx = 0;

  return (
    <AppShell>
      <div className="space-y-5">
        <PageHeader
          title="Relances"
          description="Les prochaines actions prévues sur les dossiers en cours, par échéance."
          actions={
            <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
              {[
                [false, "Toutes"],
                [true, "Mes relances"],
              ].map(([v, label]) => (
                <button
                  key={String(v)}
                  onClick={() => setMine(v as boolean)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    mine === v
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label as string}
                </button>
              ))}
            </div>
          }
        />

        <StatGrid>
          <StatCard
            index={0}
            label="En retard"
            value={count("retard")}
            icon={<AlertTriangle className="h-5 w-5" />}
            tone={count("retard") ? "red" : "green"}
          />
          <StatCard
            index={1}
            label="Aujourd'hui"
            value={count("aujourdhui")}
            icon={<BellRing className="h-5 w-5" />}
            tone="orange"
          />
          <StatCard
            index={2}
            label="Cette semaine"
            value={count("semaine")}
            icon={<CalendarClock className="h-5 w-5" />}
            tone="blue"
          />
          <StatCard
            index={3}
            label="Sans échéance"
            value={count("sans-date")}
            hint="dossiers en cours à planifier"
            icon={<CalendarCheck className="h-5 w-5" />}
            tone="neutral"
          />
        </StatGrid>

        {relances.length === 0 ? (
          <div className="card-soft flex flex-col items-center gap-2 px-6 py-14 text-center">
            <CalendarCheck className="h-10 w-10 text-success" />
            <h3 className="text-lg font-bold">Aucune relance à faire</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Les relances apparaissent ici dès qu'un dossier du pipeline a une prochaine action
              datée ou dépasse l'étape « Identifié ».
            </p>
            <Button asChild variant="outline" className="mt-2">
              <Link to="/pipeline">Ouvrir le pipeline</Link>
            </Button>
          </div>
        ) : (
          ORDER.filter((b) => count(b) > 0).map((b) => (
            <section key={b} className="space-y-2">
              <h2 className={cn("flex items-center gap-2 text-sm font-semibold", TONE[b])}>
                {BUCKET_LABEL[b]}
                <span className="rounded-full bg-muted px-2 text-xs tabular-nums text-muted-foreground">
                  {count(b)}
                </span>
              </h2>
              <ul className="space-y-2">
                {groups.get(b)!.map((p) => {
                  const r = reveal(idx++);
                  return (
                    <li
                      key={p.companyId}
                      className={cn(
                        "card-soft flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap",
                        r.className,
                      )}
                      style={r.style}
                    >
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => setOpenId(p.companyId)}
                          className="text-left text-sm font-semibold hover:text-primary"
                        >
                          {nameOf(p.companyId)}
                        </button>
                        <p className="truncate text-sm text-muted-foreground">
                          {p.prochaineAction || "Prochaine action à définir"}
                        </p>
                      </div>
                      <StatutBadge statut={p.statut} />
                      {isInactive(p) && (
                        <span
                          title="Aucune activité depuis 30 jours"
                          className="text-warning-foreground"
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </span>
                      )}
                      <span className="w-24 text-right text-xs text-muted-foreground">
                        {p.responsable || "Non assigné"}
                      </span>
                      <span
                        className={cn("w-24 text-right text-sm font-medium tabular-nums", TONE[b])}
                      >
                        {p.prochaineActionDate
                          ? new Date(p.prochaineActionDate).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                            })
                          : "—"}
                      </span>
                      {isAdmin && (
                        <Button size="sm" variant="outline" onClick={() => setDoneId(p.companyId)}>
                          <Check className="h-4 w-4" />
                          Fait
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>

      <DoneDialog
        dossier={done}
        nom={done ? nameOf(done.companyId) : ""}
        onClose={() => setDoneId(null)}
      />

      <Sheet open={Boolean(open && openCompany)} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {open && openCompany && (
            <>
              <SheetHeader>
                <SheetTitle className="pr-6">{openCompany.nom}</SheetTitle>
                <SheetDescription>
                  <Link
                    to="/entreprises/$id"
                    params={{ id: openCompany.id }}
                    className="inline-flex items-center gap-0.5 text-primary hover:underline"
                  >
                    Voir la fiche <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-8">
                <DossierPanel company={openCompany} dossier={open} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
