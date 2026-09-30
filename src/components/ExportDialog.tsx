import { useMemo, useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COLUMN_GROUPS,
  exportCompaniesToExcel,
  type ColumnGroup,
  type ContactsMode,
} from "@/lib/export";
import { useCompanies } from "@/lib/queries/companies";
import { usePipeline } from "@/lib/queries/pipeline";
import { useAllProjects } from "@/lib/queries/projects";
import { useSousComposantes } from "@/lib/queries/sous-composantes";
import type { Company } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL = "__all__";
type Scope = "filtered" | "all";

export function ExportDialog({
  filtered,
  trigger,
}: {
  /** Entreprises actuellement affichées (après filtres), si l'appelant en a. */
  filtered?: Company[];
  trigger?: React.ReactNode;
}) {
  const { data: companies = [] } = useCompanies();
  const { data: pipeline = [] } = usePipeline();
  const { data: projets = [] } = useAllProjects();
  const { data: sousComposantes = [] } = useSousComposantes();

  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<Scope>(filtered ? "filtered" : "all");
  const [projet, setProjet] = useState(ALL);
  const [secteur, setSecteur] = useState(ALL);
  const [pays, setPays] = useState(ALL);
  const [groups, setGroups] = useState<Set<ColumnGroup>>(new Set(COLUMN_GROUPS.map((g) => g.key)));
  const [contactsMode, setContactsMode] = useState<ContactsMode>("both");
  const [includeStats, setIncludeStats] = useState(true);
  const [busy, setBusy] = useState(false);

  const base = scope === "filtered" && filtered ? filtered : companies;
  const secteurs = useMemo(
    () => [...new Set(companies.map((c) => c.secteur).filter(Boolean))].sort() as string[],
    [companies],
  );
  const paysList = useMemo(
    () => [...new Set(companies.map((c) => c.paysOrigine).filter(Boolean))].sort() as string[],
    [companies],
  );

  const selection = useMemo(
    () =>
      base.filter(
        (c) =>
          (projet === ALL || c.projets.includes(projet)) &&
          (secteur === ALL || c.secteur === secteur) &&
          (pays === ALL || c.paysOrigine === pays),
      ),
    [base, projet, secteur, pays],
  );

  const toggle = (key: ColumnGroup) =>
    setGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const run = async () => {
    setBusy(true);
    try {
      const parts = [
        scope === "filtered" ? "résultats affichés" : "toute la base",
        projet !== ALL ? `projet ${projets.find((p) => p.id === projet)?.nom}` : null,
        secteur !== ALL ? `secteur ${secteur}` : null,
        pays !== ALL ? `pays ${pays}` : null,
      ].filter(Boolean);
      await exportCompaniesToExcel(selection, pipeline, projets, sousComposantes, {
        groups: [...groups],
        contactsMode,
        includeStats,
        scopeLabel: `${selection.length} entreprises (${parts.join(", ")})`,
      });
      toast.success(`${selection.length} entreprises exportées`);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'export");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <FileSpreadsheet className="h-4 w-4" />
            Exporter en Excel
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Exporter en Excel</DialogTitle>
          <DialogDescription>
            Choisissez les entreprises, les informations et les onglets à inclure.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">1. Quelles entreprises ?</h3>
            {filtered && (
              <RadioGroup
                value={scope}
                onValueChange={(v) => setScope(v as Scope)}
                className="grid gap-2 sm:grid-cols-2"
              >
                {(
                  [
                    ["filtered", `Résultats affichés (${filtered.length})`],
                    ["all", `Toute la base (${companies.length})`],
                  ] as const
                ).map(([v, label]) => (
                  <Label
                    key={v}
                    htmlFor={`scope-${v}`}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm font-normal transition-colors",
                      scope === v && "border-primary bg-primary/5",
                    )}
                  >
                    <RadioGroupItem id={`scope-${v}`} value={v} />
                    {label}
                  </Label>
                ))}
              </RadioGroup>
            )}
            <div className="grid gap-2 sm:grid-cols-3">
              <Select value={projet} onValueChange={setProjet}>
                <SelectTrigger aria-label="Projet">
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
              <Select value={secteur} onValueChange={setSecteur}>
                <SelectTrigger aria-label="Secteur">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tous les secteurs</SelectItem>
                  {secteurs.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={pays} onValueChange={setPays}>
                <SelectTrigger aria-label="Pays">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tous les pays</SelectItem>
                  {paysList.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{selection.length}</strong> entreprise
              {selection.length > 1 ? "s" : ""} seront exportées.
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">2. Quelles informations ?</h3>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setGroups(new Set(COLUMN_GROUPS.map((g) => g.key)))}
                >
                  Tout cocher
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:underline"
                  onClick={() => setGroups(new Set())}
                >
                  Tout décocher
                </button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {COLUMN_GROUPS.map((g) => (
                <Label
                  key={g.key}
                  htmlFor={`grp-${g.key}`}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 rounded-lg border border-border p-3 font-normal transition-colors",
                    groups.has(g.key) && "border-primary/50 bg-primary/5",
                  )}
                >
                  <Checkbox
                    id={`grp-${g.key}`}
                    checked={groups.has(g.key)}
                    onCheckedChange={() => toggle(g.key)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block text-sm font-medium">{g.label}</span>
                    <span className="block text-xs text-muted-foreground">{g.description}</span>
                  </span>
                </Label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Le nom de l'entreprise est toujours inclus.
            </p>
          </section>

          {groups.has("contacts") && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">3. Format des contacts</h3>
              <RadioGroup
                value={contactsMode}
                onValueChange={(v) => setContactsMode(v as ContactsMode)}
                className="grid gap-2 sm:grid-cols-3"
              >
                {(
                  [
                    ["cell", "Dans une cellule", "Tous les contacts d'une fiche regroupés"],
                    ["sheet", "Onglet séparé", "Une ligne par contact"],
                    ["both", "Les deux", "Cellule + onglet Contacts"],
                  ] as const
                ).map(([v, label, hint]) => (
                  <Label
                    key={v}
                    htmlFor={`ct-${v}`}
                    className={cn(
                      "flex cursor-pointer items-start gap-2 rounded-lg border border-border p-3 font-normal",
                      contactsMode === v && "border-primary bg-primary/5",
                    )}
                  >
                    <RadioGroupItem id={`ct-${v}`} value={v} className="mt-0.5" />
                    <span>
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="block text-xs text-muted-foreground">{hint}</span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </section>
          )}

          <Label
            htmlFor="stats"
            className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border p-3 font-normal"
          >
            <Checkbox
              id="stats"
              checked={includeStats}
              onCheckedChange={(v) => setIncludeStats(v === true)}
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm font-medium">Ajouter un onglet « Statistiques »</span>
              <span className="block text-xs text-muted-foreground">
                Chiffres clés, répartition par secteur, pays, projet et statut, qualité des fiches —
                calculés sur les entreprises exportées.
              </span>
            </span>
          </Label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={run} disabled={busy || selection.length === 0}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            Exporter {selection.length} entreprise{selection.length > 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
