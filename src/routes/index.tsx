import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpDown, Building2, FileSpreadsheet, Pencil, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ProjetTag, StatutBadge, projetLabel } from "@/components/badges";
import { Button } from "@/components/ui/button";
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
import { usePipeline } from "@/lib/queries/pipeline";
import { useAllProjects, useProjects } from "@/lib/queries/projects";
import { exportCompaniesToExcel } from "@/lib/export";
import type { Company } from "@/lib/types";
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

  const secteurs = useMemo(
    () => Array.from(new Set(companies.map((c) => c.secteur).filter(Boolean))) as string[],
    [companies],
  );

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

  const filters = (
    <div className="flex flex-wrap items-center gap-2">
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
          {secteurs.map((s) => (
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
    </div>
  );

  return { list, filters };
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
        "block w-full min-w-[110px] rounded px-1.5 py-1 text-left transition-colors hover:bg-accent",
        className,
      )}
    >
      {value || <span className="text-muted-foreground/60">—</span>}
    </button>
  );
}

function AdminTable() {
  const { list, filters } = useFiltered();
  const { data: pipeline = [] } = usePipeline();
  const { data: projets = [] } = useProjects();
  const { data: allProjets = [] } = useAllProjects();
  const patchEntreprise = usePatchEntreprise();
  const deleteCompany = useDeleteCompany();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "nom", dir: 1 });

  const sorted = useMemo(
    () => [...list].sort((a, b) => (a[sort.key] ?? "").localeCompare(b[sort.key] ?? "") * sort.dir),
    [list, sort],
  );

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
    <th className="px-3 py-2.5 text-left font-semibold">
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
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Entreprises &amp; fondations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sorted.length} entrée{sorted.length > 1 ? "s" : ""} · édition en ligne, cliquez sur une
            cellule pour la modifier.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => void exportCompaniesToExcel(sorted, pipeline, projets)}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exporter en Excel
          </Button>
        </div>
      </div>

      {filters}

      <div className="card-soft overflow-x-auto">
        <table className="w-full min-w-[1400px] border-collapse text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {th("nom", "Entreprise")}
              {th("groupe", "Groupe")}
              {th("secteur", "Secteur")}
              <th className="px-3 py-2.5 text-left font-semibold">Logo</th>
              <th className="px-3 py-2.5 text-left font-semibold">Fondation</th>
              <th className="px-3 py-2.5 text-left font-semibold">Mode d'accès</th>
              <th className="px-3 py-2.5 text-left font-semibold">Budget RSE</th>
              <th className="px-3 py-2.5 text-left font-semibold">Engagement</th>
              <th className="px-3 py-2.5 text-left font-semibold">Descriptif</th>
              <th className="px-3 py-2.5 text-left font-semibold">Programmes</th>
              <th className="px-3 py-2.5 text-left font-semibold">Projets financés</th>
              <th className="px-3 py-2.5 text-left font-semibold">Alignement</th>
              <th className="px-3 py-2.5 text-left font-semibold">Contacts</th>
              <th className="px-3 py-2.5 text-left font-semibold">Projets AB</th>
              <th className="px-3 py-2.5 text-left font-semibold">Statut</th>
              <th className="px-3 py-2.5 text-left font-semibold">Exclusion</th>
              <th className="px-3 py-2.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              const pl = pipeline.find((p) => p.companyId === c.id);
              return (
                <tr
                  key={c.id}
                  className="border-t border-border transition-colors hover:bg-muted/40"
                >
                  <td className="px-3 py-2 font-medium">
                    <EditableCell
                      value={c.nom}
                      onCommit={(v) => patch(c.id, { nom: v })}
                      className="font-semibold"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell
                      value={c.groupe ?? ""}
                      onCommit={(v) => patch(c.id, { groupe: v })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell
                      value={c.secteur ?? ""}
                      onCommit={(v) => patch(c.id, { secteur: v })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <LogoCell value={c.logoUrl} onSave={(v) => patch(c.id, { logoUrl: v })} />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => patch(c.id, { structureDediee: !c.structureDediee })}
                      className="rounded-md bg-muted px-2 py-1 text-xs font-medium hover:bg-accent"
                    >
                      {c.structureDediee == null ? "—" : c.structureDediee ? "Oui" : "Non"}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <EditableLongCell
                      value={c.modeAcces}
                      title="Mode d'accès au financement"
                      onSave={(v) => patch(c.id, { modeAcces: v })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell
                      value={c.budgetRSE ?? ""}
                      onCommit={(v) => patch(c.id, { budgetRSE: v })}
                    />
                  </td>
                  <td className="px-3 py-2">
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
                  <td className="px-3 py-2">
                    <EditableLongCell
                      value={c.descriptifActivites}
                      title="Descriptif des activités"
                      onSave={(v) => patch(c.id, { descriptifActivites: v })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <EditableLongCell
                      value={c.programmes}
                      title="Programmes"
                      onSave={(v) => patch(c.id, { programmes: v })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <EditableLongCell
                      value={c.projetsFinances}
                      title="Projets déjà financés"
                      onSave={(v) => patch(c.id, { projetsFinances: v })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <EditableLongCell
                      value={c.alignementThematique}
                      title="Alignement thématique"
                      onSave={(v) => patch(c.id, { alignementThematique: v })}
                    />
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {c.contacts.length ? `${c.contacts.length} contact(s)` : "—"}
                  </td>
                  <td className="px-3 py-2">
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
                  <td className="px-3 py-2">{pl && <StatutBadge statut={pl.statut} />}</td>
                  <td className="px-3 py-2">
                    <ExclusionCell
                      exclue={c.exclue}
                      raison={c.raisonExclusion}
                      onSave={(exclue, raisonExclusion) => patch(c.id, { exclue, raisonExclusion })}
                    />
                  </td>
                  <td className="px-3 py-2">
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          deleteCompany.mutate(c.id, {
                            onSuccess: () => toast.success(`${c.nom} supprimée`),
                            onError: (err) =>
                              toast.error(
                                err instanceof Error ? err.message : "Échec de la suppression",
                              ),
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Aucune entreprise ne correspond à votre recherche.
          </p>
        )}
      </div>
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Entreprises &amp; fondations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consultez les fiches de prospection — {list.length} entrée
          {list.length > 1 ? "s" : ""}.
        </p>
      </div>
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
