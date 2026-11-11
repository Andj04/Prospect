import { useState } from "react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { REPONSES, type ProspectionItem, type Reponse } from "@/lib/prospection";
import { useCreerContactRecommande, useUpdateProspection } from "@/lib/queries/prospection";
import { cn } from "@/lib/utils";

// Enregistre la réponse d'un contact. Une redirection peut créer directement le
// contact recommandé dans la même entreprise.
export function ReponseDialog({
  item,
  open,
  onOpenChange,
  onEnregistre,
}: {
  item: ProspectionItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnregistre: (reponse: Reponse) => void;
}) {
  const update = useUpdateProspection();
  const creer = useCreerContactRecommande();
  const [reponse, setReponse] = useState<Reponse | undefined>(item.reponse);
  const [note, setNote] = useState(item.reponseNote);
  const [recommande, setRecommande] = useState({ nom: "", poste: "", linkedin: "" });

  const enregistrer = async () => {
    if (!reponse) return;
    try {
      await update.mutateAsync({ ids: [item.id], patch: { reponse, reponseNote: note.trim() } });
      if (reponse === "redirection" && recommande.nom.trim()) {
        await creer.mutateAsync({
          sourceId: item.contact.id,
          nom: recommande.nom.trim(),
          poste: recommande.poste.trim(),
          linkedin: recommande.linkedin.trim(),
        });
        toast.success(`${recommande.nom.trim()} ajouté aux contacts de ${item.entreprise.nom}`);
      } else toast.success("Réponse enregistrée");
      onOpenChange(false);
      onEnregistre(reponse);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de l'enregistrement");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Réponse de {item.contact.nom}</DialogTitle>
          <DialogDescription>{item.entreprise.nom}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {REPONSES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setReponse(r.value)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left transition-colors",
                reponse === r.value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/40",
              )}
            >
              <span className="block text-sm font-semibold">{r.label}</span>
              <span className="block text-xs text-muted-foreground">{r.hint}</span>
            </button>
          ))}
        </div>

        {reponse === "redirection" && (
          <div className="grid gap-2 rounded-lg border border-dashed border-border p-3">
            <p className="text-sm font-medium">Contact recommandé (facultatif)</p>
            <Input
              placeholder="Nom"
              value={recommande.nom}
              onChange={(e) => setRecommande({ ...recommande, nom: e.target.value })}
            />
            <Input
              placeholder="Poste"
              value={recommande.poste}
              onChange={(e) => setRecommande({ ...recommande, poste: e.target.value })}
            />
            <Input
              placeholder="Lien LinkedIn"
              value={recommande.linkedin}
              onChange={(e) => setRecommande({ ...recommande, linkedin: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Il sera créé dans la même entreprise, assigné au même responsable, et ajouté au suivi
              LinkedIn s'il a un lien.
            </p>
          </div>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="reponse-note">Ce qu'il a dit</Label>
          <Textarea
            id="reponse-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Résumé de la réponse…"
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => void enregistrer()}
            disabled={!reponse || update.isPending || creer.isPending}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
