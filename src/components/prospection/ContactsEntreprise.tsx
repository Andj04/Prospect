import { Building2, Landmark, Linkedin, Mail, Phone, User } from "lucide-react";
import { TYPE_CONTACT_LABEL, typeContact, type ContactCampagne } from "@/lib/prospection";

const ICONE = { personne: User, entreprise: Building2, fondation: Landmark } as const;

/** Tous les contacts d'une entreprise et leurs coordonnées (LinkedIn, e-mail, téléphone). */
export function ContactsEntreprise({
  contacts,
  canalGenerique,
  enCampagne,
  aussiChez,
}: {
  contacts: ContactCampagne[];
  canalGenerique: string;
  /** Contacts qui ont un suivi sur le canal affiché. */
  enCampagne: Set<string>;
  /** Pour une personne présente dans d'autres entreprises : leurs noms. */
  aussiChez: (c: ContactCampagne) => string[];
}) {
  const tries = [...contacts].sort((a, b) => {
    const ta = typeContact(a) === "personne" ? 0 : 1;
    const tb = typeContact(b) === "personne" ? 0 : 1;
    return ta - tb || a.nom.localeCompare(b.nom, "fr");
  });

  return (
    <div className="space-y-2 border-b border-border bg-muted/20 px-3 py-3">
      {tries.length === 0 && !canalGenerique && (
        <p className="text-sm text-muted-foreground">Aucun contact enregistré.</p>
      )}
      {tries.length > 0 && (
        <ul className="grid gap-1.5 md:grid-cols-2">
          {tries.map((c) => {
            const type = typeContact(c);
            const Icone = ICONE[type];
            const autres = type === "personne" ? aussiChez(c) : [];
            return (
              <li key={c.id} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <div className="flex items-start gap-2">
                  <Icone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {type === "personne" ? c.nom : c.nom || TYPE_CONTACT_LABEL[type]}
                      {enCampagne.has(c.id) && (
                        <span className="ml-1.5 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary-deep">
                          dans la campagne
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {type === "personne"
                        ? c.poste || "Poste non précisé"
                        : TYPE_CONTACT_LABEL[type]}
                      {c.responsable && ` · suivi par ${c.responsable}`}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                      {c.linkedin && (
                        <a
                          href={c.linkedin}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                        </a>
                      )}
                      {c.email && (
                        <a
                          href={`mailto:${c.email}`}
                          className="inline-flex min-w-0 items-center gap-1 break-all text-primary hover:underline"
                        >
                          <Mail className="h-3.5 w-3.5 shrink-0" /> {c.email}
                        </a>
                      )}
                      {c.telephone && (
                        <a
                          href={`tel:${c.telephone.replace(/\s+/g, "")}`}
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <Phone className="h-3.5 w-3.5" /> {c.telephone}
                        </a>
                      )}
                      {!c.linkedin && !c.email && !c.telephone && (
                        <span className="text-muted-foreground">Aucune coordonnée</span>
                      )}
                    </div>
                    {autres.length > 0 && (
                      <p className="mt-1 text-xs text-warning-foreground">
                        Aussi contact chez {autres.join(", ")} : une seule sollicitation suffit.
                      </p>
                    )}
                    {c.remarque && (
                      <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                        {c.remarque}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {canalGenerique.trim() && (
        <div className="rounded-lg border border-dashed border-border bg-card px-3 py-2 text-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" /> Canaux génériques
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words">{canalGenerique}</p>
        </div>
      )}
    </div>
  );
}
