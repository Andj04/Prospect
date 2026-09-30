import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowUpDown,
  Building2,
  ChevronDown,
  ChevronRight,
  Columns3,
  FileSpreadsheet,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { DualScrollTable } from "@/components/DualScrollTable";
import { PageHeader } from "@/components/page-header";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjetTag, StatutBadge, projetLabel } from "@/components/badges";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  useCompanies,
  useDeleteCompany,
  usePatchEntreprise,
  type PatchableField,
} from "@/lib/queries/companies";
import { useImportBatches, useRenameImportBatch } from "@/lib/queries/import-batches";
import { usePipeline } from "@/lib/queries/pipeline";
import { useAllProjects, useProjects } from "@/lib/queries/projects";
import { useSousComposantes } from "@/lib/queries/sous-composantes";
import { ExportDialog } from "@/components/ExportDialog";
import { PAYS_OPTIONS, SECTEUR_OPTIONS, type Company } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Entreprises — Prospection RSE Amal Biladi" },
      {
        name: "description",
        content:
          "Base de prospection RSE d'Amal Biladi : entreprises et fondations pouvant financer les projets de l'ONG.",
      },
      { property: "og:title", content: "Entreprises — Prospection RSE Amal Biladi" },
      {
        property: "og:description",
        content: "Gérez et consultez les entreprises et fondations partenaires potentielles.",
      },
    ],
  }),
  component: EntreprisesPage,
});

const ALL = "__all__";

function useFiltered() {
  const { data: companies = [] } = useCompanies();
  const { data: projets = [] } = useProjects();
  const [q, setQ] = useState("");
  const [projet, setProjet] = useState(ALL);
  const [secteur, setSecteur] = useState(ALL);
  const [fondation, setFondation] = useState(ALL);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return companies.filter((c) => {
      if (needle) {
        const hay = JSON.stringify(c).toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (projet !== ALL && !c.projets.includes(projet)) return false;
      if (secteur !== ALL && c.secteur !== secteur) return false;
      if (fondation !== ALL && String(!!c.structureDediee) !== fondation) return false;
      return true;
    });
  }, [companies, q, projet, secteur, fondation]);

  const activeFilters = [
    q.trim() !== "",
    projet !== ALL,
    secteur !== ALL,
    fondation !== ALL,
  ].filter(Boolean).length;
  const reset = () => {
    setQ("");
    setProjet(ALL);
    setSecteur(ALL);
    setFondation(ALL);
  };

  const filters = (
    <div className="card-soft flex flex-wrap items-center gap-2 p-3">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une entreprise, un secteur, un contact…"
          className="pl-9"
        />
      </div>
      <Select value={projet} onValueChange={setProjet}>
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Projet" />
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
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Secteur" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tous les secteurs</SelectItem>
          {SECTEUR_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={fondation} onValueChange={setFondation}>
        <SelectTrigger className="w-[190px]">
          <SelectValue placeholder="Structure dédiée" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Structure : toutes</SelectItem>
          <SelectItem value="true">Fondation existante</SelectItem>
          <SelectItem value="false">Sans fondation / non renseigné</SelectItem>
        </SelectContent>
      </Select>
      {activeFilters > 0 && (
        <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
          <RotateCcw className="h-4 w-4" />
          Réinitialiser ({activeFilters})
        </Button>
      )}
    </div>
  );

  return { list, filters, total: companies.length };
}

function EntreprisesPage() {
  const { isAdmin } = useAuth();
  return <AppShell>{isAdmin ? <AdminTable /> : <UserGrid />}</AppShell>;
}

/* ---------------- Admin : tableau type Excel ---------------- */

type SortKey = "nom" | "secteur" | "groupe";

function LongCell({ text, title }: { text: string | undefined; title: string }) {
  const [open, setOpen] = useState(false);
  if (!text) return <span className="text-muted-foreground/60">—</span>;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="block max-w-[220px] truncate text-left text-foreground/80 underline-offset-2 hover:text-primary hover:underline"
        title={text}
      >
        {text}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="whitespace-pre-wrap text-left text-foreground">
              {text}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LogoCell({ value, onSave }: { value: string | undefined; onSave: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [imgError, setImgError] = useState(false);

  return (
    <>
      <button
        onClick={() => {
          setDraft(value ?? "");
          setImgError(false);
          setOpen(true);
        }}
        className="grid h-8 w-8 place-items-center overflow-hidden rounded-full border border-border bg-muted hover:border-primary/40"
      >
        {value && !imgError ? (
          <img
            src={value}
            alt=""
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-[9px] text-muted-foreground">—</span>
        )}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>URL du logo</DialogTitle>
          </DialogHeader>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="https://…/logo.png"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onSave(draft);
                setOpen(false);
              }}
            >
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EditableLongCell({
  value,
  title,
  onSave,
}: {
  value: string | undefined;
  title: string;
  onSave: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  return (
    <>
      <button
        onClick={() => {
          setDraft(value ?? "");
          setOpen(true);
        }}
        className="block max-w-[220px] truncate text-left text-foreground/80 underline-offset-2 hover:text-primary hover:underline"
        title={value}
      >
        {value || <span className="text-muted-foreground/60">—</span>}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <Textarea rows={6} autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onSave(draft);
                setOpen(false);
              }}
            >
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ExclusionCell({
  exclue,
  raison,
  onSave,
}: {
  exclue: boolean;
  raison: string | undefined;
  onSave: (exclue: boolean, raison: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftExclue, setDraftExclue] = useState(exclue);
  const [draftRaison, setDraftRaison] = useState(raison ?? "");

  return (
    <>
      <button
        onClick={() => {
          setDraftExclue(exclue);
          setDraftRaison(raison ?? "");
          setOpen(true);
        }}
        className="block max-w-[200px] truncate text-left text-xs hover:underline"
      >
        {exclue ? (
          <span className="font-medium text-destructive">Exclue — {raison || "—"}</span>
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Statut d'exclusion</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <Label htmlFor="excl-toggle" className="text-sm font-normal">
              Entreprise exclue de la prospection
            </Label>
            <Switch id="excl-toggle" checked={draftExclue} onCheckedChange={setDraftExclue} />
          </div>
          {draftExclue && (
            <Textarea
              rows={3}
              placeholder="Raison de l'exclusion"
              value={draftRaison}
              onChange={(e) => setDraftRaison(e.target.value)}
            />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onSave(draftExclue, draftRaison);
                setOpen(false);
              }}
            >
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EditableCell({
  value,
  onCommit,
  className,
}: {
  value: string;
  onCommit: (v: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (editing) {
    return (
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft !== value) onCommit(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="h-8 w-[180px]"
      />
    );
  }
  return (
    <button
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className={cn(
        "group/cell block w-full min-w-[110px] rounded px-1.5 py-1 text-left transition-colors hover:bg-accent",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        {value || <span className="text-muted-foreground/60">—</span>}
        <Pencil className="h-3 w-3 shrink-0 text-muted-foreground/0 transition-colors group-hover/cell:text-muted-foreground/60" />
      </span>
    </button>
  );
}

// Suppression irréversible (contacts, liens projets et pipeline partent en
// cascade) : on demande toujours une confirmation explicite.
function DeleteCompanyButton({ nom, onConfirm }: { nom: string; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Supprimer ${nom}`}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer {nom} ?</AlertDialogTitle>
          <AlertDialogDescription>
            La fiche, ses contacts, ses liens aux projets et son suivi pipeline seront
            définitivement supprimés.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const ADMIN_TABLE_COLUMN_COUNT = 19;

// Colonnes secondaires masquables du tableau admin (le reste — #, entreprise,
// groupe, secteur, statut, actions — est toujours affiché).
const OPTIONAL_COLUMNS: { key: string; label: string }[] = [
  { key: "pays", label: "Pays d'origine" },
  { key: "logo", label: "Logo" },
  { key: "fondation", label: "Fondation" },
  { key: "modeAcces", label: "Mode d'accès" },
  { key: "budget", label: "Budget RSE" },
  { key: "engagement", label: "Engagement" },
  { key: "descriptif", label: "Descriptif" },
  { key: "programmes", label: "Programmes" },
  { key: "projetsFinances", label: "Projets financés" },
  { key: "alignement", label: "Alignement" },
  { key: "contacts", label: "Contacts" },
  { key: "projetsAB", label: "Projets AB" },
  { key: "exclusion", label: "Exclusion" },
];
const DEFAULT_HIDDEN = ["modeAcces", "budget", "programmes", "projetsFinances", "contacts"];
const HIDDEN_COLS_STORAGE_KEY = "entreprises-hidden-columns";

function useHiddenColumns() {
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set(DEFAULT_HIDDEN));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HIDDEN_COLS_STORAGE_KEY);
      if (raw) setHiddenCols(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* stockage indisponible : on garde les valeurs par défaut */
    }
  }, []);

  const persist = (next: Set<string>) => {
    setHiddenCols(next);
    try {
      localStorage.setItem(HIDDEN_COLS_STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      /* ignoré */
    }
  };

  const toggleCol = (key: string) => {
    const next = new Set(hiddenCols);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    persist(next);
  };

  return { hiddenCols, toggleCol, resetCols: () => persist(new Set(DEFAULT_HIDDEN)) };
}

function ColumnsMenu({
  hidden,
  onToggle,
  onReset,
}: {
  hidden: Set<string>;
  onToggle: (key: string) => void;
  onReset: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Columns3 className="h-4 w-4" />
          Colonnes
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Colonnes affichées</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONAL_COLUMNS.map(({ key, label }) => (
          <DropdownMenuCheckboxItem
            key={key}
            checked={!hidden.has(key)}
            onCheckedChange={() => onToggle(key)}
            onSelect={(e) => e.preventDefault()}
          >
            {label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <button
          onClick={onReset}
          className="w-full rounded-sm px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent"
        >
          Rétablir l'affichage par défaut
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type NumberedCompany = { company: Company; number: number };

type CompanyGroup = {
  key: string;
  label: string;
  createdAt?: string;
  batchId?: string;
  rows: NumberedCompany[];
};

function BatchDividerRow({
  label,
  count,
  createdAt,
  onRename,
  collapsed,
  onToggleCollapse,
}: {
  label: string;
  count: number;
  createdAt?: string;
  onRename?: (label: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <tr className="border-t-2 border-primary/25 bg-primary/5">
      <td colSpan={ADMIN_TABLE_COLUMN_COUNT} className="px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onToggleCollapse}
            className="grid h-6 w-6 shrink-0 place-items-center rounded hover:bg-primary/15"
            aria-label={collapsed ? "Déplier la section" : "Replier la section"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 text-primary-deep" />
            ) : (
              <ChevronDown className="h-4 w-4 text-primary-deep" />
            )}
          </button>
          {onRename ? (
            <EditableCell
              value={label}
              onCommit={(v) => v.trim() && onRename(v.trim())}
              className="text-sm font-semibold text-primary-deep"
            />
          ) : (
            <span className="px-1.5 py-1 text-sm font-semibold text-muted-foreground">{label}</span>
          )}
          <span className="text-xs text-muted-foreground">
            {count} entreprise{count > 1 ? "s" : ""}
            {createdAt && ` · importé le ${new Date(createdAt).toLocaleDateString("fr-FR")}`}
          </span>
        </div>
      </td>
    </tr>
  );
}

function AdminTable() {
  const { list, filters } = useFiltered();
  const { data: pipeline = [] } = usePipeline();
  const { hiddenCols, toggleCol, resetCols } = useHiddenColumns();
  const { data: allProjets = [] } = useAllProjects();
  const { data: sousComposantes = [] } = useSousComposantes();
  const { data: importBatches = [] } = useImportBatches();
  const renameImportBatch = useRenameImportBatch();
  const patchEntreprise = usePatchEntreprise();
  const deleteCompany = useDeleteCompany();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "nom", dir: 1 });
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const toggleGroupCollapsed = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const sorted = useMemo(
    () => [...list].sort((a, b) => (a[sort.key] ?? "").localeCompare(b[sort.key] ?? "") * sort.dir),
    [list, sort],
  );

  // Group by lot d'import so a freshly imported batch never blends into the
  // existing rows — most recent batch first, un-batched companies last. The
  // per-column sort above is preserved within each group (filter keeps order).
  const groups = useMemo((): CompanyGroup[] => {
    const byBatch = new Map<string, Company[]>();
    const baseline: Company[] = [];
    for (const c of sorted) {
      if (c.importBatchId) {
        const arr = byBatch.get(c.importBatchId) ?? [];
        arr.push(c);
        byBatch.set(c.importBatchId, arr);
      } else {
        baseline.push(c);
      }
    }
    const orderedBatches = [...importBatches].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
    // Numbering runs continuously across every group (a row keeps its number
    // even if an earlier group gets collapsed), rather than resetting per
    // section — easier to reference "l'entreprise n°47" unambiguously.
    let n = 0;
    const numberRows = (rows: Company[]): NumberedCompany[] =>
      rows.map((company) => ({ company, number: ++n }));
    return [
      ...orderedBatches.map((b) => ({
        key: b.id,
        label: b.label,
        createdAt: b.createdAt,
        batchId: b.id,
        rows: numberRows(byBatch.get(b.id) ?? []),
      })),
      { key: "__baseline__", label: "Entreprises existantes", rows: numberRows(baseline) },
    ];
  }, [sorted, importBatches]);

  const patch = (id: string, fields: Partial<Record<PatchableField, string | boolean>>) => {
    patchEntreprise.mutate(
      { id, patch: fields },
      {
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Échec de l'enregistrement"),
      },
    );
  };

  const th = (key: SortKey, label: string) => (
    <th
      data-col={key}
      className={cn(
        "px-3 py-3 text-left font-semibold",
        key === "nom" && "sticky left-12 z-10 bg-muted shadow-[1px_0_0_var(--border)]",
      )}
    >
      <button
        className="inline-flex items-center gap-1 hover:text-primary"
        onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === 1 ? -1 : 1 }))}
      >
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </button>
    </th>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entreprises & fondations"
        description="Édition en ligne : cliquez sur une cellule pour la modifier."
        actions={
          <>
            <ColumnsMenu hidden={hiddenCols} onToggle={toggleCol} onReset={resetCols} />
            <ExportDialog filtered={sorted} />
          </>
        }
      />

      {filters}

      {hiddenCols.size > 0 && (
        <style>{`${[...hiddenCols].map((k) => `#entreprises-table [data-col="${k}"]`).join(",")}{display:none}`}</style>
      )}
      <DualScrollTable className="card-soft">
        <table id="entreprises-table" className="w-full min-w-[1000px] border-collapse text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th
                data-col="num"
                className="sticky left-0 z-10 w-12 min-w-12 bg-muted px-3 py-3 text-right font-semibold text-muted-foreground/70"
              >
                #
              </th>
              {th("nom", "Entreprise")}
              {th("groupe", "Groupe")}
              {th("secteur", "Secteur")}
              <th data-col="pays" className="px-3 py-3 text-left font-semibold">
                Pays d'origine
              </th>
              <th data-col="logo" className="px-3 py-3 text-left font-semibold">
                Logo
              </th>
              <th data-col="fondation" className="px-3 py-3 text-left font-semibold">
                Fondation
              </th>
              <th data-col="modeAcces" className="px-3 py-3 text-left font-semibold">
                Mode d'accès
              </th>
              <th data-col="budget" className="px-3 py-3 text-left font-semibold">
                Budget RSE
              </th>
              <th data-col="engagement" className="px-3 py-3 text-left font-semibold">
                Engagement
              </th>
              <th data-col="descriptif" className="px-3 py-3 text-left font-semibold">
                Descriptif
              </th>
              <th data-col="programmes" className="px-3 py-3 text-left font-semibold">
                Programmes
              </th>
              <th data-col="projetsFinances" className="px-3 py-3 text-left font-semibold">
                Projets financés
              </th>
              <th data-col="alignement" className="px-3 py-3 text-left font-semibold">
                Alignement
              </th>
              <th data-col="contacts" className="px-3 py-3 text-left font-semibold">
                Contacts
              </th>
              <th data-col="projetsAB" className="px-3 py-3 text-left font-semibold">
                Projets AB
              </th>
              <th data-col="statut" className="px-3 py-3 text-left font-semibold">
                Statut
              </th>
              <th data-col="exclusion" className="px-3 py-3 text-left font-semibold">
                Exclusion
              </th>
              <th data-col="actions" className="px-3 py-3 text-right font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.flatMap((group): ReactNode[] => {
              if (group.rows.length === 0) return [];
              const collapsed = collapsedGroups.has(group.key);
              const rowNodes = collapsed
                ? []
                : group.rows.map(({ company: c, number }) => {
                    const pl = pipeline.find((p) => p.companyId === c.id);
                    return (
                      <tr
                        key={c.id}
                        className="group border-t border-border transition-colors hover:bg-secondary"
                      >
                        <td
                          data-col="num"
                          className="px-3 py-2 text-right text-xs tabular-nums text-muted-foreground/70 sticky left-0 z-10 w-12 min-w-12 bg-card group-hover:bg-secondary"
                        >
                          {number}
                        </td>
                        <td
                          data-col="nom"
                          className="px-3 py-2 font-medium sticky left-12 z-10 bg-card shadow-[1px_0_0_var(--border)] group-hover:bg-secondary"
                        >
                          <EditableCell
                            value={c.nom}
                            onCommit={(v) => patch(c.id, { nom: v })}
                            className="font-semibold"
                          />
                        </td>
                        <td data-col="groupe" className="px-3 py-2">
                          <EditableCell
                            value={c.groupe ?? ""}
                            onCommit={(v) => patch(c.id, { groupe: v })}
                          />
                        </td>
                        <td data-col="secteur" className="px-3 py-2">
                          <Select
                            {...(c.secteur ? { value: c.secteur } : {})}
                            onValueChange={(v) => patch(c.id, { secteur: v })}
                          >
                            <SelectTrigger className="h-8 w-[170px] text-xs">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {SECTEUR_OPTIONS.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td data-col="pays" className="px-3 py-2">
                          <Select
                            {...(c.paysOrigine ? { value: c.paysOrigine } : {})}
                            onValueChange={(v) => patch(c.id, { paysOrigine: v })}
                          >
                            <SelectTrigger className="h-8 w-[150px] text-xs">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {PAYS_OPTIONS.map((p) => (
                                <SelectItem key={p} value={p}>
                                  {p}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td data-col="logo" className="px-3 py-2">
                          <LogoCell value={c.logoUrl} onSave={(v) => patch(c.id, { logoUrl: v })} />
                        </td>
                        <td data-col="fondation" className="px-3 py-2">
                          <button
                            onClick={() => patch(c.id, { structureDediee: !c.structureDediee })}
                            className="rounded-md bg-muted px-2 py-1 text-xs font-medium hover:bg-accent"
                          >
                            {c.structureDediee == null ? "—" : c.structureDediee ? "Oui" : "Non"}
                          </button>
                        </td>
                        <td data-col="modeAcces" className="px-3 py-2">
                          <EditableLongCell
                            value={c.modeAcces}
                            title="Mode d'accès au financement"
                            onSave={(v) => patch(c.id, { modeAcces: v })}
                          />
                        </td>
                        <td data-col="budget" className="px-3 py-2">
                          <EditableCell
                            value={c.budgetRSE ?? ""}
                            onCommit={(v) => patch(c.id, { budgetRSE: v })}
                          />
                        </td>
                        <td data-col="engagement" className="px-3 py-2">
                          <Select
                            {...(c.typeEngagement ? { value: c.typeEngagement } : {})}
                            onValueChange={(v) => patch(c.id, { typeEngagement: v })}
                          >
                            <SelectTrigger className="h-8 w-[130px] text-xs">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="recurrent">Récurrent</SelectItem>
                              <SelectItem value="ponctuel">Ponctuel</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td data-col="descriptif" className="px-3 py-2">
                          <EditableLongCell
                            value={c.descriptifActivites}
                            title="Descriptif des activités"
                            onSave={(v) => patch(c.id, { descriptifActivites: v })}
                          />
                        </td>
                        <td data-col="programmes" className="px-3 py-2">
                          <EditableLongCell
                            value={c.programmes}
                            title="Programmes"
                            onSave={(v) => patch(c.id, { programmes: v })}
                          />
                        </td>
                        <td data-col="projetsFinances" className="px-3 py-2">
                          <EditableLongCell
                            value={c.projetsFinances}
                            title="Projets déjà financés"
                            onSave={(v) => patch(c.id, { projetsFinances: v })}
                          />
                        </td>
                        <td data-col="alignement" className="px-3 py-2">
                          <EditableLongCell
                            value={c.alignementThematique}
                            title="Alignement thématique"
                            onSave={(v) => patch(c.id, { alignementThematique: v })}
                          />
                        </td>
                        <td data-col="contacts" className="px-3 py-2 text-xs text-muted-foreground">
                          {c.contacts.length ? `${c.contacts.length} contact(s)` : "—"}
                        </td>
                        <td data-col="projetsAB" className="px-3 py-2">
                          <div className="flex max-w-[220px] flex-wrap gap-1">
                            {c.projets.length ? (
                              c.projets.map((id) => (
                                <ProjetTag key={id} nom={projetLabel(allProjets, id)} />
                              ))
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </div>
                        </td>
                        <td data-col="statut" className="px-3 py-2">
                          {pl && <StatutBadge statut={pl.statut} />}
                        </td>
                        <td data-col="exclusion" className="px-3 py-2">
                          <ExclusionCell
                            exclue={c.exclue}
                            raison={c.raisonExclusion}
                            onSave={(exclue, raisonExclusion) =>
                              patch(c.id, { exclue, raisonExclusion })
                            }
                          />
                        </td>
                        <td data-col="actions" className="px-3 py-2">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" asChild>
                              <Link to="/entreprises/$id" params={{ id: c.id }}>
                                Fiche
                              </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <Link to="/entreprises/$id/modifier" params={{ id: c.id }}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                            <DeleteCompanyButton
                              nom={c.nom}
                              onConfirm={() =>
                                deleteCompany.mutate(c.id, {
                                  onSuccess: () => toast.success(`${c.nom} supprimée`),
                                  onError: (err) =>
                                    toast.error(
                                      err instanceof Error
                                        ? err.message
                                        : "Échec de la suppression",
                                    ),
                                })
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  });
              const batchId = group.batchId;
              return [
                <BatchDividerRow
                  key={`divider-${group.key}`}
                  label={group.label}
                  count={group.rows.length}
                  collapsed={collapsed}
                  onToggleCollapse={() => toggleGroupCollapsed(group.key)}
                  {...(group.createdAt ? { createdAt: group.createdAt } : {})}
                  {...(batchId
                    ? {
                        onRename: (label: string) =>
                          renameImportBatch.mutate({ id: batchId, label }),
                      }
                    : {})}
                />,
                ...rowNodes,
              ];
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Aucune entreprise ne correspond à votre recherche.
          </p>
        )}
      </DualScrollTable>
    </div>
  );
}

/* ---------------- Utilisateur : liste lecture ---------------- */

function UserGrid() {
  const { list, filters } = useFiltered();
  const { data: allProjets = [] } = useAllProjects();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entreprises & fondations"
        description={`Consultez les fiches de prospection — ${list.length} entrée${list.length > 1 ? "s" : ""}.`}
      />
      {filters}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c: Company) => (
          <button
            key={c.id}
            onClick={() => navigate({ to: "/entreprises/$id", params: { id: c.id } })}
            className="card-soft group p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                <Building2 className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate font-semibold group-hover:text-primary">{c.nom}</h2>
                <p className="truncate text-xs text-muted-foreground">
                  {[c.groupe, c.secteur].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
            </div>
            {c.alignementThematique && (
              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                {c.alignementThematique}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {c.projets.map((id) => (
                <ProjetTag key={id} nom={projetLabel(allProjets, id)} />
              ))}
              {c.exclue && (
                <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                  <X className="h-3 w-3" /> Exclue
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
      {list.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Aucune entreprise ne correspond à votre recherche.
        </p>
      )}
    </div>
  );
}
