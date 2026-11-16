import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { PrioriteBadge, StatutBadge } from "@/components/badges";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompany } from "@/lib/queries/companies";
import { useAllProjects } from "@/lib/queries/projects";
import type { PipelineItem } from "@/lib/types";

function Bloc({ titre, items }: { titre: string; items: [string, string | undefined][] }) {
  const remplis = items.filter(([, v]) => v && v.trim());
  if (remplis.length === 0) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titre}
      </h3>
      <dl className="space-y-2 text-sm">
        {remplis.map(([label, v]) => (
          <div key={label}>
            <dt className="font-medium">{label}</dt>
            <dd className="whitespace-pre-wrap text-muted-foreground">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const ENGAGEMENT: Record<string, string> = { recurrent: "Récurrent", ponctuel: "Ponctuel" };

/** Fiche de l'entreprise consultée depuis la campagne, sans quitter la page. */
export function FicheEntrepriseSheet({
  entrepriseId,
  pipeline,
  onOpenChange,
}: {
  entrepriseId: string | null;
  pipeline: PipelineItem | undefined;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: company, isLoading } = useCompany(entrepriseId ?? undefined);
  const { data: projets = [] } = useAllProjects();
  const nomsProjets = (company?.projets ?? [])
    .map((id) => projets.find((p) => p.id === id)?.nom)
    .filter(Boolean)
    .join(", ");

  return (
    <Sheet open={Boolean(entrepriseId)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {isLoading || !company ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-40" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>{company.nom}</SheetTitle>
              <SheetDescription>
                {[company.groupe, company.secteur, company.paysOrigine].filter(Boolean).join(" · ")}
              </SheetDescription>
              {pipeline && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <PrioriteBadge priorite={pipeline.priorite} />
                  <StatutBadge statut={pipeline.statut} />
                </div>
              )}
            </SheetHeader>
            <div className="space-y-5 px-4 pb-6">
              <Bloc
                titre="Ce qu'elle fait"
                items={[
                  ["Activités", company.descriptifActivites],
                  ["Programmes RSE", company.programmes],
                  ["Projets déjà financés", company.projetsFinances],
                  ["Notes", company.notesComplementaires],
                ]}
              />
              <Bloc
                titre="Comment l'approcher"
                items={[
                  ["Mode d'accès", company.modeAcces],
                  ["Budget RSE", company.budgetRSE],
                  ["Type d'engagement", ENGAGEMENT[company.typeEngagement ?? ""]],
                  [
                    "Structure dédiée (fondation…)",
                    company.structureDediee === null
                      ? undefined
                      : company.structureDediee
                        ? "Oui"
                        : "Non",
                  ],
                ]}
              />
              <Bloc
                titre="Pourquoi elle"
                items={[
                  ["Alignement avec Amal Biladi", company.alignementThematique],
                  ["Précédent fort", company.precedentFort],
                  ["Proposition concrète", company.propositionConcrete],
                  ["Projets Amal Biladi concernés", nomsProjets],
                ]}
              />
              {pipeline && (
                <Bloc
                  titre="Suivi"
                  items={[
                    ["Responsable", pipeline.responsable],
                    [
                      "Dernier contact",
                      pipeline.dernierContact
                        ? new Date(pipeline.dernierContact).toLocaleDateString("fr-FR")
                        : undefined,
                    ],
                    ["Prochaine action", pipeline.prochaineAction],
                  ]}
                />
              )}
              <Button asChild variant="outline" className="w-full">
                <Link to="/entreprises/$id" params={{ id: company.id }}>
                  <ExternalLink className="h-4 w-4" />
                  Ouvrir la fiche complète
                </Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
