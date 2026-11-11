import { Linkedin, Mail, Phone } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { categorieLabel, reponseLabel, type ProspectionItem } from "@/lib/prospection";
import { useProspectionHistorique, useUpdateProspection } from "@/lib/queries/prospection";

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "—");

const DATES: { key: keyof ProspectionItem["dates"]; label: string }[] = [
  { key: "invitation", label: "Invitation envoyée" },
  { key: "acceptee", label: "Invitation acceptée" },
  { key: "message", label: "Message envoyé" },
  { key: "relance1", label: "1re relance" },
  { key: "relance2", label: "2e relance" },
  { key: "relanceFinale", label: "Relance finale" },
  { key: "reponse", label: "Réponse" },
];

export function DetailsSheet({
  item,
  onOpenChange,
}: {
  item: ProspectionItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: historique = [] } = useProspectionHistorique(item?.contact.id);
  const update = useUpdateProspection();

  return (
    <Sheet open={Boolean(item)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {item && (
          <>
            <SheetHeader>
              <SheetTitle>{item.contact.nom}</SheetTitle>
              <SheetDescription>
                {item.contact.poste || categorieLabel(item.contact.categoriePoste)} —{" "}
                {item.entreprise.nom}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-5 px-4 pb-6">
              <div className="space-y-1 text-sm">
                {item.contact.linkedin && (
                  <a
                    href={item.contact.linkedin}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Linkedin className="h-4 w-4" /> Profil LinkedIn
                  </a>
                )}
                {item.contact.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" /> {item.contact.email}
                  </p>
                )}
                {item.contact.telephone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" /> {item.contact.telephone}
                  </p>
                )}
              </div>

              {item.contact.remarque && (
                <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm">{item.contact.remarque}</p>
              )}
              {item.entreprise.contactGenerique && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Canal générique de l'entreprise
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {item.entreprise.contactGenerique}
                  </p>
                </div>
              )}

              {item.reponse && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Réponse
                  </p>
                  <p className="mt-1 text-sm font-medium">{reponseLabel(item.reponse)}</p>
                  {item.reponseNote && (
                    <p className="text-sm text-muted-foreground">{item.reponseNote}</p>
                  )}
                </div>
              )}

              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {DATES.filter((d) => item.dates[d.key]).map((d) => (
                  <div key={d.key} className="contents">
                    <dt className="text-muted-foreground">{d.label}</dt>
                    <dd className="tabular-nums">{fmt(item.dates[d.key])}</dd>
                  </div>
                ))}
              </dl>

              <div className="grid gap-1.5">
                <Label htmlFor="prospection-notes">Notes</Label>
                <Textarea
                  id="prospection-notes"
                  key={item.id}
                  rows={4}
                  defaultValue={item.notes}
                  onBlur={(e) =>
                    e.target.value !== item.notes &&
                    update.mutate({ ids: [item.id], patch: { notes: e.target.value } })
                  }
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">Historique</p>
                {historique.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune action enregistrée.</p>
                ) : (
                  <ol className="space-y-2">
                    {historique.map((h) => (
                      <li key={h.id} className="rounded-lg border border-border p-2.5 text-sm">
                        <p className="font-medium">{h.action}</p>
                        {h.detail && <p className="text-muted-foreground">{h.detail}</p>}
                        <p className="text-xs text-muted-foreground">
                          {fmt(h.date)}
                          {h.auteur && ` · ${h.auteur}`}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
