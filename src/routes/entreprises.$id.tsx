import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, Linkedin, Mail, Pencil, Phone, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PrioriteBadge, ProjetTag, StatutBadge, projetLabel } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useCompany } from "@/lib/queries/companies";
import { usePipeline } from "@/lib/queries/pipeline";
import { useProjects } from "@/lib/queries/projects";
import { CONTACT_FONCTIONS } from "@/lib/types";
import { exportCompanyToPdf } from "@/lib/export";

export const Route = createFileRoute("/entreprises/$id")({
  head: () => ({
    meta: [
      { title: "Fiche entreprise — Prospection RSE Amal Biladi" },
      {
        name: "description",
        content:
          "Fiche détaillée d'une entreprise ou fondation : financement, programmes, contacts et suivi.",
      },
      { property: "og:title", content: "Fiche entreprise — Amal Biladi" },
      {
        property: "og:description",
        content: "Identité, mécanisme de financement, pertinence, contacts et projets liés.",
      },
    ],
  }),
  component: FicheEntreprise,
});

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

function Block({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="card-soft p-5 sm:p-6">
      <header className="mb-4 flex items-center gap-3 border-b border-border pb-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full brand-gradient text-xs font-bold text-primary-foreground">
          {n}
        </span>
        <h2 className="text-base font-semibold">{title}</h2>
      </header>
      {children}
    </section>
  );
}

function FicheEntreprise() {
  const { id } = Route.useParams();
  const { isAdmin } = useAuth();
  const { data: c, isLoading } = useCompany(id);
  const { data: pipeline = [] } = usePipeline();
  const { data: projets = [] } = useProjects();
  const pl = pipeline.find((p) => p.companyId === id);

  if (isLoading) {
    return (
      <AppShell>
        <p className="card-soft p-8 text-center text-sm text-muted-foreground">Chargement…</p>
      </AppShell>
    );
  }

  if (!c) {
    return (
      <AppShell>
        <p className="card-soft p-8 text-center text-sm text-muted-foreground">
          Entreprise introuvable.
        </p>
      </AppShell>
    );
  }

  const hasComment = c.modeAcces || c.budgetRSE || c.typeEngagement;
  const hasQuoi =
    c.descriptifActivites || c.programmes || c.projetsFinances || c.notesComplementaires;
  const hasPourquoi = c.alignementThematique || c.precedentFort || c.propositionConcrete;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-5">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Retour aux entreprises
          </Link>
        </Button>

        <div className="card-soft overflow-hidden">
          <div className="brand-gradient h-1.5 w-full" />
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 p-5 sm:p-6">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">{c.nom}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {[c.groupe, c.secteur].filter(Boolean).join(" · ") || "—"}
              </p>
              {c.exclue && (
                <p className="mt-3 inline-flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <X className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Entreprise exclue — {c.raisonExclusion}</span>
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <Button onClick={() => exportCompanyToPdf(c, projets)}>
                <Download className="h-4 w-4" />
                Télécharger en PDF
              </Button>
              {isAdmin && (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/entreprises/$id/modifier" params={{ id: c.id }}>
                    <Pencil className="h-4 w-4" />
                    Modifier
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        <Block n={1} title="Identité">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom" value={c.nom} />
            <Field label="Groupe / maison mère" value={c.groupe} />
            <Field label="Secteur d'activité" value={c.secteur} />
            <Field
              label="Structure dédiée"
              value={
                c.structureDediee == null
                  ? "Non renseigné"
                  : c.structureDediee
                    ? "Fondation existante"
                    : "Pas de fondation dédiée"
              }
            />
          </dl>
        </Block>

        {hasComment && (
          <Block n={2} title="Comment — mécanisme de financement">
            <dl className="space-y-4">
              <Field label="Mode d'accès au financement" value={c.modeAcces} />
              <Field label="Budget / volume RSE" value={c.budgetRSE} />
              <Field
                label="Type d'engagement"
                value={
                  c.typeEngagement === "recurrent"
                    ? "Récurrent / structuré"
                    : c.typeEngagement === "ponctuel"
                      ? "Ponctuel"
                      : ""
                }
              />
            </dl>
          </Block>
        )}

        {hasQuoi && (
          <Block n={3} title="Quoi — ce qu'ils financent déjà">
            <dl className="space-y-4">
              <Field label="Descriptif des activités" value={c.descriptifActivites} />
              <Field label="Programmes" value={c.programmes} />
              <Field label="Projets déjà financés" value={c.projetsFinances} />
              <Field label="Notes complémentaires" value={c.notesComplementaires} />
            </dl>
          </Block>
        )}

        {hasPourquoi && (
          <Block n={4} title="Pourquoi — pertinence pour Amal Biladi">
            <dl className="space-y-4">
              <Field label="Alignement thématique" value={c.alignementThematique} />
              <Field label="Précédent le plus fort" value={c.precedentFort} />
              <Field label="Proposition concrète" value={c.propositionConcrete} />
            </dl>
          </Block>
        )}

        {c.contacts.length > 0 && (
          <Block n={5} title="Contacts">
            <div className="grid gap-3 sm:grid-cols-2">
              {c.contacts.map((ct) => (
                <div key={ct.id} className="rounded-lg border border-border p-4">
                  <span className="inline-flex rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary-deep">
                    {CONTACT_FONCTIONS.find((f) => f.value === ct.fonction)?.label}
                  </span>
                  <p className="mt-2 font-semibold">{ct.nom}</p>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {ct.email && (
                      <p className="flex items-center gap-2 truncate">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        {ct.email}
                      </p>
                    )}
                    {ct.telephone && (
                      <p className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        {ct.telephone}
                      </p>
                    )}
                    {ct.linkedin && (
                      <p className="flex items-center gap-2 truncate">
                        <Linkedin className="h-3.5 w-3.5 shrink-0" />
                        {ct.linkedin}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Block>
        )}

        {c.projets.length > 0 && (
          <Block n={6} title="Projets Amal Biladi concernés">
            <div className="flex flex-wrap gap-2">
              {c.projets.map((id) => (
                <ProjetTag key={id} nom={projetLabel(projets, id)} />
              ))}
            </div>
          </Block>
        )}

        {pl && (
          <section className="card-soft border-primary/30 bg-accent/40 p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Suivi</h2>
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Lecture seule · non inclus dans le PDF
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <StatutBadge statut={pl.statut} />
              <PrioriteBadge priorite={pl.priorite} />
              <span className="text-muted-foreground">
                Responsable : <strong className="text-foreground">{pl.responsable}</strong>
              </span>
              <span className="text-muted-foreground">
                Dernier contact : <strong className="text-foreground">{pl.dernierContact}</strong>
              </span>
            </div>
            <ul className="mt-4 space-y-2">
              {pl.historique.slice(0, 3).map((h) => (
                <li key={h.id} className="rounded-lg bg-card px-3 py-2 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">
                    {h.date} · {h.type} · {h.auteur}
                  </span>
                  <p className="mt-0.5">{h.resume}</p>
                </li>
              ))}
              {pl.historique.length === 0 && (
                <li className="text-sm text-muted-foreground">Aucune note enregistrée.</li>
              )}
            </ul>
          </section>
        )}
      </div>
    </AppShell>
  );
}
