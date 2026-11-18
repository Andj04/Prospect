import { useState } from "react";
import { Check, Copy, Paperclip } from "lucide-react";
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
  categorieLabel,
  civiliteDuNom,
  ETAPES_LINKEDIN,
  salutationDe,
  type CategoriePoste,
  type Civilite,
  type EtapeLinkedin,
  type ProspectionItem,
} from "@/lib/prospection";
import {
  modelesPour,
  PIECE_JOINTE,
  remplirModele,
  TEMPS_MESSAGE,
  type TempsMessage,
} from "@/lib/prospection-modeles";
import { useCivilites, useDefinirCivilite } from "@/lib/queries/prospection";
import { cn } from "@/lib/utils";

/** Étape atteinte une fois le message de ce temps envoyé. */
const ETAPE_APRES: Record<TempsMessage, EtapeLinkedin> = {
  premier: "message-envoye",
  "relance-1": "relance-1",
  "relance-2": "relance-2",
  "relance-finale": "relance-finale",
};

/** Le message à envoyer ensuite, d'après l'étape du contact. */
function tempsAttendu(etape: EtapeLinkedin): TempsMessage {
  switch (etape) {
    case "message-envoye":
      return "relance-1";
    case "relance-1":
      return "relance-2";
    case "relance-2":
    case "relance-finale":
      return "relance-finale";
    default:
      return "premier";
  }
}

const ORDRE = ETAPES_LINKEDIN.map((e) => e.value);

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
  const { data: civilites } = useCivilites();
  const definirCivilite = useDefinirCivilite();
  const cat = (item.contact.categoriePoste || "autre") as CategoriePoste;

  const [temps, setTemps] = useState<TempsMessage>(() => tempsAttendu(item.etape));
  const [choisi, setChoisi] = useState(0);
  const [texte, setTexte] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);
  const [civiliteLocale, setCiviliteLocale] = useState<Civilite | undefined>(undefined);

  const civilite =
    civiliteLocale ?? civilites?.parContact.get(item.contact.id) ?? civiliteDuNom(item.contact.nom);
  const modeles = modelesPour(temps, cat);
  const modele = modeles[Math.min(choisi, modeles.length - 1)]!;
  const initial = remplirModele(modele.texte, {
    salutation: salutationDe(item.contact.nom, civilite),
    entreprise: item.entreprise.nom,
    expediteur: profile?.fullName ?? "",
  });
  const valeur = texte ?? initial;
  const aCompleter = (valeur.match(/\[[^\]]+\]/g) ?? []).length;

  // On ne marque comme envoyé qu'un message qui fait avancer le contact.
  const cible = ETAPE_APRES[temps];
  const avance =
    item.etape !== "repondu" &&
    item.etape !== "sans-suite" &&
    ORDRE.indexOf(cible) > ORDRE.indexOf(item.etape);

  const choisirCivilite = (c: Civilite) => {
    setCiviliteLocale(c);
    setTexte(null);
    if (civilites?.disponible)
      definirCivilite.mutate(
        { contactId: item.contact.id, civilite: c },
        { onError: () => toast.error("La civilité n'a pas pu être enregistrée") },
      );
  };

  const copier = async (marquer: boolean) => {
    try {
      await navigator.clipboard.writeText(valeur);
      setCopie(true);
      setTimeout(() => setCopie(false), 1500);
      if (marquer) {
        onEnvoye(cible, modele.id);
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
          <DialogTitle>Messages pour {item.contact.nom}</DialogTitle>
          <DialogDescription>
            {item.entreprise.nom} · profil {categorieLabel(cat)}. Le texte est modifiable avant
            copie.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Civilité :</span>
          {(["monsieur", "madame"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => choisirCivilite(c)}
              className={cn(
                "rounded-md border px-3 py-1 transition-colors",
                civilite === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              {c === "madame" ? "Madame" : "Monsieur"}
            </button>
          ))}
          {!civilite && (
            <span className="text-xs text-warning-foreground">
              À choisir avant de copier le message
            </span>
          )}
          {civilites && !civilites.disponible && (
            <span className="text-xs text-muted-foreground">
              (non mémorisée tant que la migration 0015 n'est pas exécutée)
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          {TEMPS_MESSAGE.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                setTemps(t.value);
                setChoisi(0);
                setTexte(null);
              }}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                temps === t.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              {t.value === tempsAttendu(item.etape) && (
                <span className="ml-1 text-[10px] font-normal text-primary">à envoyer</span>
              )}
            </button>
          ))}
        </div>

        {modeles.length > 1 && (
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
        )}

        {temps === "premier" && (
          <p className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary-deep">
            <Paperclip className="h-4 w-4 shrink-0" />
            {PIECE_JOINTE}
          </p>
        )}

        <Textarea
          key={`${temps}-${choisi}-${civilite ?? ""}`}
          value={valeur}
          onChange={(e) => setTexte(e.target.value)}
          rows={16}
          className="font-[inherit] text-sm leading-relaxed"
        />
        {aCompleter > 0 && (
          <p className="text-xs text-warning-foreground">
            {aCompleter} passage{aCompleter > 1 ? "s" : ""} entre crochets à compléter avant l'envoi
            (fait vérifié sur l'entreprise, sujet…).
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" disabled={!civilite} onClick={() => void copier(false)}>
            {copie ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            Copier
          </Button>
          {avance && (
            <Button disabled={!civilite} onClick={() => void copier(true)}>
              <Copy className="h-4 w-4" />
              Copier et marquer comme envoyé
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
