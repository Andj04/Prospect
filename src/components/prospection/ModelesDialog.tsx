import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  ETAPE_SUIVANTE,
  categorieLabel,
  prenomDe,
  type CategoriePoste,
  type EtapeLinkedin,
  type ProspectionItem,
} from "@/lib/prospection";
import {
  MESSAGES_APRES_ACCEPTATION,
  RELANCES,
  remplirModele,
  type Modele,
} from "@/lib/prospection-modeles";
import { cn } from "@/lib/utils";

// Quels modèles proposer selon l'étape : message après acceptation, puis relances.
function modelesPour(item: ProspectionItem): {
  titre: string;
  envoi: EtapeLinkedin;
  modeles: Modele[];
} {
  const cat = (item.contact.categoriePoste || "autre") as CategoriePoste;
  switch (item.etape) {
    case "message-envoye":
      return {
        titre: "1re relance",
        envoi: "relance-1",
        modeles: cat === "dirigeant" ? RELANCES["relance-1"] : [...RELANCES["relance-1"]].reverse(),
      };
    case "relance-1":
      return { titre: "2e relance", envoi: "relance-2", modeles: RELANCES["relance-2"] };
    case "relance-2":
    case "relance-finale":
      return {
        titre: "Relance finale",
        envoi: "relance-finale",
        modeles: RELANCES["relance-finale"],
      };
    default:
      return {
        titre: `Message après acceptation — ${categorieLabel(cat)}`,
        envoi: "message-envoye",
        modeles: MESSAGES_APRES_ACCEPTATION[cat] ?? MESSAGES_APRES_ACCEPTATION.autre,
      };
  }
}

export function ModelesDialog({
  item,
  open,
  onOpenChange,
  onEnvoye,
}: {
  item: ProspectionItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Le message a été copié pour envoi : avancer l'étape et retenir le modèle. */
  onEnvoye: (etape: EtapeLinkedin, modeleId: string) => void;
}) {
  const { profile } = useAuth();
  const { titre, envoi, modeles } = useMemo(() => modelesPour(item), [item]);
  const [choisi, setChoisi] = useState(0);
  const modele = modeles[Math.min(choisi, modeles.length - 1)]!;
  const initial = remplirModele(modele.texte, {
    prenom: prenomDe(item.contact.nom),
    entreprise: item.entreprise.nom,
    expediteur: profile?.fullName ?? "",
  });
  const [texte, setTexte] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);
  const valeur = texte ?? initial;
  const aCompleter = (valeur.match(/\[[^\]]+\]/g) ?? []).length;
  // L'avancement ne concerne que l'étape attendue (pas de retour en arrière).
  const avance =
    item.etape === "acceptee" ||
    ETAPE_SUIVANTE[item.etape]?.to === envoi ||
    (item.etape === "relance-2" && envoi === "relance-finale");

  const copier = async (marquer: boolean) => {
    try {
      await navigator.clipboard.writeText(valeur);
      setCopie(true);
      setTimeout(() => setCopie(false), 1500);
      if (marquer) {
        onEnvoye(envoi, modele.id);
        onOpenChange(false);
      } else toast.success("Message copié");
    } catch {
      toast.error("Copie impossible dans ce navigateur");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titre}</DialogTitle>
          <DialogDescription>
            Pour {item.contact.nom} ({item.entreprise.nom}). Le texte est modifiable avant copie.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          {modeles.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setChoisi(i);
                setTexte(null);
              }}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                i === choisi
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40",
              )}
            >
              {m.titre}
            </button>
          ))}
        </div>

        <Textarea
          value={valeur}
          onChange={(e) => setTexte(e.target.value)}
          rows={16}
          className="font-[inherit] text-sm leading-relaxed"
        />
        {aCompleter > 0 && (
          <p className="text-xs text-warning-foreground">
            {aCompleter} passage{aCompleter > 1 ? "s" : ""} entre crochets à compléter avant l'envoi
            (fait vérifié sur l'entreprise, lien…).
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => void copier(false)}>
            {copie ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            Copier
          </Button>
          {avance && (
            <Button onClick={() => void copier(true)}>
              <Copy className="h-4 w-4" />
              Copier et marquer comme envoyé
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
