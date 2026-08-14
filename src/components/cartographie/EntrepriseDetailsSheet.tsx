import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, Building2, X } from "lucide-react";
import { StatutBadge } from "@/components/badges";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Company, PipelineStatut } from "@/lib/types";

function Field({ label, value }: { label: string; value: string | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{value}</dd>
    </div>
  );
}

function initials(nom: string) {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function CompanyAvatar({ company }: { company: Company }) {
  const [imgError, setImgError] = useState(false);
  return company.logoUrl && !imgError ? (
    <img
      src={company.logoUrl}
      alt=""
      loading="lazy"
      onError={() => setImgError(true)}
      className="h-10 w-10 shrink-0 rounded-full object-cover"
    />
  ) : (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
      {initials(company.nom) || <Building2 className="h-4 w-4" />}
    </span>
  );
}

export function EntrepriseDetailsSheet({
  company,
  projetNom,
  pipelineStatut,
  open,
  onOpenChange,
}: {
  company: Company | undefined;
  projetNom: string | undefined;
  pipelineStatut: PipelineStatut | undefined;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const hasQuoi =
    company?.descriptifActivites ||
    company?.programmes ||
    company?.projetsFinances ||
    company?.notesComplementaires;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {company && (
          <>
            <SheetHeader>
              <div className="flex items-start gap-3">
                <CompanyAvatar company={company} />
                <div className="min-w-0">
                  <SheetTitle className="truncate">{company.nom}</SheetTitle>
                  <SheetDescription className="truncate">
                    {[company.groupe, company.secteur].filter(Boolean).join(" · ") || "—"}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-4 px-4 pb-8">
              <div className="flex flex-wrap items-center gap-2">
                {projetNom && (
                  <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
                    Projet : {projetNom}
                  </span>
                )}
                {pipelineStatut && <StatutBadge statut={pipelineStatut} />}
              </div>

              {company.exclue && (
                <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <X className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Entreprise exclue — {company.raisonExclusion}</span>
                </p>
              )}

              <dl className="space-y-4">
                {hasQuoi ? (
                  <>
                    <Field label="Descriptif des activités" value={company.descriptifActivites} />
                    <Field label="Programmes" value={company.programmes} />
                    <Field label="Projets déjà financés" value={company.projetsFinances} />
                    <Field label="Notes complémentaires" value={company.notesComplementaires} />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucune information sur ses activités n'a encore été renseignée.
                  </p>
                )}
                <Field label="Alignement thématique" value={company.alignementThematique} />
              </dl>

              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to="/entreprises/$id" params={{ id: company.id }}>
                  Voir la fiche complète
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
