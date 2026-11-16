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
  COLONNES_EXPORT,
  exportProspection,
  FEUILLES,
  type ColonnesExport,
  type Feuilles,
  type LigneExport,
} from "@/lib/export-prospection";
import { typeContact, type ContactCampagne, type ProspectionItem } from "@/lib/prospection";
import type { PipelineItem } from "@/lib/types";

type Lignes = "affiches" | "campagne" | "base";
const TOUS = "__tous__";
const SANS = "__sans__";

/** Contact d'un suivi, au même format que la base (si la base n'est pas encore chargée). */
function contactDuSuivi(p: ProspectionItem): ContactCampagne {
  return {
    id: p.contact.id,
    entrepriseId: p.entreprise.id,
    entrepriseNom: p.entreprise.nom,
    entrepriseGenerique: p.entreprise.contactGenerique,
    nom: p.contact.nom,
    poste: p.contact.poste,
    categoriePoste: p.contact.categoriePoste,
    remarque: p.contact.remarque,
    responsable: p.contact.responsable,
    ...(p.contact.linkedin ? { linkedin: p.contact.linkedin } : {}),
    ...(p.contact.email ? { email: p.contact.email } : {}),
    ...(p.contact.telephone ? { telephone: p.contact.telephone } : {}),
  };
}

// Export de la campagne au choix : lignes, responsable, contacts génériques,
// organisation des feuilles (Excel) et blocs de colonnes.
export function ProspectionExportDialog({
  affiches,
  campagne,
  contacts,
  pipelineById,
  responsables,
}: {
  /** Suivis visibles avec les filtres actuels. */
  affiches: ProspectionItem[];
  /** Tous les suivis du canal. */
  campagne: ProspectionItem[];
  /** Tous les contacts de la base, avec ou sans suivi. */
  contacts: ContactCampagne[];
  pipelineById: Map<string, PipelineItem>;
  responsables: string[];
}) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [lignes, setLignes] = useState<Lignes>("affiches");
  const [responsable, setResponsable] = useState(TOUS);
  const [generiques, setGeneriques] = useState(true);
  const [feuilles, setFeuilles] = useState<Feuilles>("une");
  const [colonnes, setColonnes] = useState<ColonnesExport[]>(
    COLONNES_EXPORT.filter((g) => g.id !== "dates" && g.id !== "notes").map((g) => g.id),
  );
  const [busy, setBusy] = useState(false);

  const selection = useMemo((): LigneExport[] => {
    const contactsById = new Map(contacts.map((c) => [c.id, c]));
    const ligne = (contact: ContactCampagne, suivi?: ProspectionItem): LigneExport => ({
      contact,
      ...(suivi ? { suivi } : {}),
      ...(pipelineById.get(contact.entrepriseId)
        ? { pipeline: pipelineById.get(contact.entrepriseId)! }
        : {}),
    });
    let list: LigneExport[];
    if (lignes === "base") {
      const suiviParContact = new Map(campagne.map((p) => [p.contact.id, p]));
      list = contacts
        .filter((c) => generiques || typeContact(c) === "personne")
        .map((c) => ligne(c, suiviParContact.get(c.id)));
    } else {
      list = (lignes === "affiches" ? affiches : campagne).map((p) =>
        ligne(contactsById.get(p.contact.id) ?? contactDuSuivi(p), p),
      );
    }
    if (responsable === SANS) return list.filter((l) => !l.contact.responsable);
    if (responsable !== TOUS) return list.filter((l) => l.contact.responsable === responsable);
    return list;
  }, [lignes, affiches, campagne, contacts, pipelineById, generiques, responsable]);

  const toggle = (id: ColonnesExport, on: boolean) =>
    setColonnes((g) => (on ? [...g, id] : g.filter((x) => x !== id)));
  const toutCoche = colonnes.length === COLONNES_EXPORT.length;

  const run = async () => {
    setBusy(true);
    try {
      await exportProspection({ lignes: selection, colonnes, format, feuilles });
      toast.success(`${selection.length} contacts exportés`);
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
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Exporter les contacts</DialogTitle>
          <DialogDescription>
            Une ligne par contact. Choisissez les lignes, les colonnes et le format.
          </DialogDescription>
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
              value={lignes}
              onValueChange={(v) => setLignes(v as Lignes)}
              className="space-y-1"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="affiches" /> Les contacts affichés, avec les filtres actuels
                ({affiches.length})
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="campagne" /> Toute la campagne LinkedIn ({campagne.length})
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="base" /> Tous les contacts des entreprises, même hors
                campagne ({contacts.length})
              </label>
            </RadioGroup>
            {lignes === "base" && (
              <label className="ml-6 flex items-center gap-2 text-sm">
                <Checkbox checked={generiques} onCheckedChange={(c) => setGeneriques(c === true)} />
                Inclure les contacts génériques (entreprise, fondation, standard)
              </label>
            )}
          </div>

          <div className="space-y-2">
            <Label>Responsable</Label>
            <Select value={responsable} onValueChange={setResponsable}>
              <SelectTrigger aria-label="Responsable">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TOUS}>Tous les responsables</SelectItem>
                <SelectItem value={SANS}>Non assignés</SelectItem>
                {responsables.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {format === "xlsx" && (
            <div className="space-y-2">
              <Label>Feuilles</Label>
              <Select value={feuilles} onValueChange={(v) => setFeuilles(v as Feuilles)}>
                <SelectTrigger aria-label="Feuilles">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEUILLES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Colonnes</Label>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setColonnes(toutCoche ? [] : COLONNES_EXPORT.map((g) => g.id))}
              >
                {toutCoche ? "Tout décocher" : "Tout cocher"}
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {COLONNES_EXPORT.map((g) => (
                <label key={g.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={colonnes.includes(g.id)}
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
            disabled={busy || colonnes.length === 0 || selection.length === 0}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            Exporter {selection.length} contacts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
