import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { exportOng, ONG_COLUMN_GROUPS, type OngColumnGroup } from "@/lib/export-ong";
import { useOngFull } from "@/lib/queries/ong";
import { useOngPipeline } from "@/lib/queries/pipeline-ong";
import { useAllProjects } from "@/lib/queries/projects";

type Scope = "filtered" | "all";
const TOUS = "__tous__";
const PAR_PROJET = "__par_projet__";

// Export des ONG au choix : format, lignes (filtre courant ou toutes) et blocs
// de colonnes. Le bloc « Suivi » est décoché par défaut.
export function OngExportDialog({ filteredIds }: { filteredIds: Set<string> }) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [scope, setScope] = useState<Scope>("filtered");
  const [groups, setGroups] = useState<OngColumnGroup[]>(
    ONG_COLUMN_GROUPS.filter((g) => g.id !== "suivi").map((g) => g.id),
  );
  const [projet, setProjet] = useState(TOUS);
  const [busy, setBusy] = useState(false);
  const { data: ongs = [] } = useOngFull(open);
  const { data: pipeline = [] } = useOngPipeline();
  const { data: projets = [] } = useAllProjects();

  const parProjet = projet === PAR_PROJET && format === "xlsx";
  const base = scope === "all" ? ongs : ongs.filter((o) => filteredIds.has(o.id));
  const selected =
    projet === TOUS || projet === PAR_PROJET
      ? base
      : base.filter((o) => o.projets.some((l) => l.projetId === projet));
  const toggle = (id: OngColumnGroup, on: boolean) =>
    setGroups((g) => (on ? [...g, id] : g.filter((x) => x !== id)));
  const allChecked = groups.length === ONG_COLUMN_GROUPS.length;

  const run = async () => {
    setBusy(true);
    try {
      await exportOng({ ongs: selected, groups, format, projets, pipeline, parProjet });
      toast.success(`${selected.length} ONG exportées`);
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de l'export");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileSpreadsheet className="h-4 w-4" />
          Exporter
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Exporter les ONG</DialogTitle>
          <DialogDescription>Choisissez le format, les lignes et les colonnes.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Format</Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as "xlsx" | "csv")}
              className="flex gap-6"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="xlsx" /> Excel (.xlsx)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="csv" /> CSV
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Lignes</Label>
            <RadioGroup
              value={scope}
              onValueChange={(v) => setScope(v as Scope)}
              className="space-y-1"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="filtered" /> Les ONG affichées ({filteredIds.size})
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="all" /> Toutes les ONG
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Projet</Label>
            <Select value={projet} onValueChange={setProjet}>
              <SelectTrigger aria-label="Projet">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TOUS}>Tous les projets</SelectItem>
                {format === "xlsx" && (
                  <SelectItem value={PAR_PROJET}>Une feuille par projet (Excel)</SelectItem>
                )}
                {projets.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    Seulement : {p.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Colonnes</Label>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setGroups(allChecked ? [] : ONG_COLUMN_GROUPS.map((g) => g.id))}
              >
                {allChecked ? "Tout décocher" : "Tout cocher"}
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {ONG_COLUMN_GROUPS.map((g) => (
                <label key={g.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={groups.includes(g.id)}
                    onCheckedChange={(c) => toggle(g.id, c === true)}
                  />
                  {g.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => void run()}
            disabled={busy || groups.length === 0 || selected.length === 0}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            Exporter {selected.length} ONG
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
