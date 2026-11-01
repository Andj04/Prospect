import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Globe, Landmark, Linkedin, Mail, Pencil, Phone, Link2, Unlink } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { BackButton } from "@/components/BackButton";
import { ProjetTag, projetLabel } from "@/components/badges";
import { MiniCarteRegions, regionNom } from "@/components/ong/MarocCarte";
import { OddBadge, Tag, TypeStructureBadge, OngStatutBadge } from "@/components/ong/ong-badges";
import { OngSuiviPanel } from "@/components/ong/OngSuiviPanel";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth/AuthProvider";
import { echelleLabel, milieuLabel } from "@/lib/ong-utils";
import { useCompaniesList } from "@/lib/queries/companies";
import { CONTACT_FONCTIONS, PARTENAIRE_TYPES, type OngPartenaire } from "@/lib/types";
import { useLinkPartenaire, useOng } from "@/lib/queries/ong";
import { useOngPipeline } from "@/lib/queries/pipeline-ong";
import { useAllProjects } from "@/lib/queries/projects";

export const Route = createFileRoute("/ong/$id")({
  head: () => ({
    meta: [
      { title: "Fiche ONG — Prospection RSE Amal Biladi" },
      {
        name: "description",
        content:
          "Fiche détaillée d'une ONG partenaire : activités, territoire, réseau, contacts et suivi.",
      },
    ],
  }),
  component: FicheOng,
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

const SOURCE_LABEL = {
  international: "Financement international",
  diaspora: "Financement diaspora",
};

const hrefOf = (url: string) => (/^https?:\/\//.test(url) ? url : `https://${url}`);

// Validation humaine d'une passerelle : on choisit l'entreprise correspondant au partenaire.
function LierDialog({
  partenaire,
  open,
  onOpenChange,
}: {
  partenaire: OngPartenaire;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { data: companies = [] } = useCompaniesList();
  const link = useLinkPartenaire();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>Relier « {partenaire.nom} » à une entreprise</DialogTitle>
          <DialogDescription>
            Le nom du partenaire n'est pas écrit comme dans la base entreprises : choisissez
            l'entreprise qui correspond.
          </DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Rechercher une entreprise…" defaultValue={partenaire.nom} />
          <CommandList className="max-h-72">
            <CommandEmpty>Aucune entreprise.</CommandEmpty>
            <CommandGroup>
              {companies.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.nom} ${c.groupe ?? ""}`}
                  onSelect={() =>
                    link.mutate(
                      { partenaireId: partenaire.id, entrepriseId: c.id },
                      {
                        onSuccess: () => {
                          toast.success("Passerelle enregistrée");
                          onOpenChange(false);
                        },
                        onError: (e) => toast.error(e instanceof Error ? e.message : "Échec"),
                      },
                    )
                  }
                >
                  {c.nom}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function PartenaireLine({ p, isAdmin }: { p: OngPartenaire; isAdmin: boolean }) {
  const { data: companies = [] } = useCompaniesList();
  const link = useLinkPartenaire();
  const [open, setOpen] = useState(false);
  const entreprise = p.entrepriseId ? companies.find((c) => c.id === p.entrepriseId) : undefined;
  return (
    <li className="flex flex-wrap items-center gap-2">
      <Tag>{p.nom}</Tag>
      {entreprise && (
        <Link
          to="/entreprises/$id"
          params={{ id: entreprise.id }}
          className="inline-flex items-center gap-1 rounded-md bg-success/15 px-2 py-0.5 text-xs font-medium text-success hover:underline"
          title="Passerelle : cette entreprise figure dans la base"
        >
          <Link2 className="h-3 w-3" />
          {entreprise.nom}
        </Link>
      )}
      {isAdmin && (p.type === "prive" || p.type === "bailleur") && (
        <>
          {entreprise ? (
            <button
              type="button"
              aria-label="Retirer la passerelle"
              title="Retirer la passerelle"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => link.mutate({ partenaireId: p.id, entrepriseId: null })}
            >
              <Unlink className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
              onClick={() => setOpen(true)}
            >
              Relier à une entreprise
            </button>
          )}
          {open && <LierDialog partenaire={p} open={open} onOpenChange={setOpen} />}
        </>
      )}
    </li>
  );
}

function FicheOng() {
  const { id } = Route.useParams();
  const { isAdmin } = useAuth();
  const { data: o, isLoading } = useOng(id);
  const { data: pipeline = [] } = useOngPipeline();
  const { data: projets = [] } = useAllProjects();
  const { data: companies = [] } = useCompaniesList();
  const pl = pipeline.find((p) => p.ongId === id);

  if (isLoading) {
    return (
      <AppShell>
        <p className="card-soft p-8 text-center text-sm text-muted-foreground">Chargement…</p>
      </AppShell>
    );
  }
  if (!o) {
    return (
      <AppShell>
        <p className="card-soft p-8 text-center text-sm text-muted-foreground">ONG introuvable.</p>
      </AppShell>
    );
  }

  const part = (t: OngPartenaire["type"]) => o.partenaires.filter((p) => p.type === t);
  const bailleurs = part("bailleur");
  const reseau = PARTENAIRE_TYPES.filter((t) => t.value !== "bailleur" && part(t.value).length > 0);
  const passerelles = o.partenaires.filter((p) => p.entrepriseId);

  const hasFait =
    o.thematiques.length > 0 || o.odd.length > 0 || o.activitesPrincipales || o.publicsCibles;
  const hasLieu =
    o.siege ||
    o.echelle.length > 0 ||
    o.milieu.length > 0 ||
    o.regions.length > 0 ||
    o.territoiresPrecis;
  const hasFin =
    o.accesFinancement || o.budgetAnnuel || o.financementSources.length > 0 || bailleurs.length > 0;
  const hasReseau = reseau.length > 0 || o.commentPartenariats;
  const hasPourquoi =
    o.apports.length > 0 || o.atouts || o.pourquoiPartenaire || o.relationAmalBiladi;
  const hasProjets = o.projets.length > 0 || o.transversale;
  const hasCoord = o.email || o.telephone || o.siteWeb || o.reseaux.length > 0;
  const hasContacts = o.contacts.length > 0 || hasCoord || o.notes;

  const principal = o.projets.find((p) => p.role === "principal");
  const lies = o.projets.filter((p) => p.role === "lie");
  let n = 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-5">
        <BackButton fallbackTo="/ong" label="Retour" />

        <div className="card-soft overflow-hidden">
          <div className="brand-gradient h-1.5 w-full" />
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 p-5 sm:p-6">
            <div className="min-w-0">
              <div className="flex items-start gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-balance">
                  {o.nom}
                  {o.acronyme && o.acronyme !== o.nom && (
                    <span className="ml-2 text-lg font-semibold text-muted-foreground">
                      ({o.acronyme})
                    </span>
                  )}
                </h1>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <TypeStructureBadge type={o.typeStructure} utilitePublique={o.utilitePublique} />
                {o.anneeCreation && (
                  <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    Créée en {o.anneeCreation}
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {pl && <OngStatutBadge statut={pl.statut} />}
              {isAdmin && (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/ong/$id/modifier" params={{ id: o.id }}>
                    <Pencil className="h-4 w-4" />
                    Modifier
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {hasFait && (
          <Block n={++n} title="Ce qu'elle fait">
            <div className="space-y-4">
              {o.thematiques.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {o.thematiques.map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </div>
              )}
              {o.odd.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Objectifs de développement durable
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {o.odd.map((d) => (
                      <OddBadge key={d} n={d} />
                    ))}
                  </div>
                </div>
              )}
              <dl className="space-y-4">
                <Field label="Activités principales" value={o.activitesPrincipales} />
                <Field label="Publics cibles" value={o.publicsCibles} />
              </dl>
            </div>
          </Block>
        )}

        {hasLieu && (
          <Block n={++n} title="Où elle agit">
            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_14rem]">
              <div className="space-y-4">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <Field label="Siège" value={o.siege} />
                  <Field label="Échelle" value={o.echelle.map(echelleLabel).join(", ")} />
                  <Field label="Milieu" value={o.milieu.map(milieuLabel).join(", ")} />
                </dl>
                {o.regions.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Régions
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {o.regions.map((r) => (
                        <Tag key={r}>{regionNom(r)}</Tag>
                      ))}
                    </div>
                    {!o.regionsVerifiees && (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Régions déduites des lieux cités, pas encore vérifiées.
                      </p>
                    )}
                  </div>
                )}
                {o.echelle.includes("international") && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-orange/25 px-2.5 py-1 text-xs font-medium text-warning-foreground">
                    <Globe className="h-3 w-3" />
                    Activité hors Maroc
                  </span>
                )}
                <dl>
                  <Field label="Territoires précis" value={o.territoiresPrecis} />
                </dl>
              </div>
              {o.regions.length > 0 && <MiniCarteRegions regions={o.regions} />}
            </div>
          </Block>
        )}

        {hasFin && (
          <Block n={++n} title="Son financement">
            <div className="space-y-4">
              <dl className="space-y-4">
                <Field
                  label="Comment elle accède à son propre financement"
                  value={o.accesFinancement}
                />
                <Field label="Budget annuel" value={o.budgetAnnuel} />
              </dl>
              {o.financementSources.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {o.financementSources.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success"
                    >
                      <Landmark className="h-3 w-3" />
                      {SOURCE_LABEL[s]}
                    </span>
                  ))}
                </div>
              )}
              {bailleurs.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Bailleurs connus
                  </p>
                  <ul className="flex flex-wrap gap-1.5">
                    {bailleurs.map((p) => (
                      <PartenaireLine key={p.id} p={p} isAdmin={isAdmin} />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Block>
        )}

        {hasReseau && (
          <Block n={++n} title="Son réseau">
            <div className="space-y-4">
              {reseau.map((t) => (
                <div key={t.value}>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t.label}
                  </p>
                  <ul className="flex flex-wrap gap-1.5">
                    {part(t.value).map((p) => (
                      <PartenaireLine key={p.id} p={p} isAdmin={isAdmin} />
                    ))}
                  </ul>
                </div>
              ))}
              <dl>
                <Field label="Comment elle noue ses partenariats" value={o.commentPartenariats} />
              </dl>
              {passerelles.length > 0 && (
                <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm">
                  <p className="font-semibold text-success">Passerelles avec la base entreprises</p>
                  <p className="mt-1 text-muted-foreground">
                    Cette ONG travaille déjà avec{" "}
                    {passerelles
                      .map((p) => companies.find((c) => c.id === p.entrepriseId)?.nom ?? p.nom)
                      .join(", ")}{" "}
                    : elle peut servir d'introduction.
                  </p>
                </div>
              )}
            </div>
          </Block>
        )}

        {hasPourquoi && (
          <Block n={++n} title="Pourquoi ce partenaire">
            <div className="space-y-4">
              {o.apports.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {o.apports.map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary-deep dark:text-primary"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              )}
              <dl className="space-y-4">
                <Field label="Atouts" value={o.atouts} />
                <Field label="Pourquoi ce partenaire" value={o.pourquoiPartenaire} />
                <Field label="Relation existante avec Amal Biladi" value={o.relationAmalBiladi} />
              </dl>
            </div>
          </Block>
        )}

        {hasProjets && (
          <Block n={++n} title="Projets Amal Biladi">
            <div className="space-y-3">
              {principal && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Projet principal
                  </p>
                  <span className="inline-flex items-center rounded-lg brand-gradient px-3 py-1.5 text-sm font-semibold text-primary-foreground">
                    {projetLabel(projets, principal.projetId)}
                  </span>
                </div>
              )}
              {lies.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Projets liés
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {lies.map((p) => (
                      <ProjetTag key={p.projetId} nom={projetLabel(projets, p.projetId)} />
                    ))}
                  </div>
                </div>
              )}
              {o.transversale && (
                <p className="text-sm text-muted-foreground">
                  ONG transversale : utile à tous les projets grâce à un réseau d'entreprises
                  documenté.
                </p>
              )}
            </div>
          </Block>
        )}

        {hasContacts && (
          <Block n={++n} title="Contacts">
            <div className="space-y-5">
              {o.contacts.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {o.contacts.map((ct) => (
                    <div key={ct.id} className="rounded-lg border border-border p-4">
                      <span className="inline-flex rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary-deep">
                        {ct.fonctionDetail ||
                          CONTACT_FONCTIONS.find((f) => f.value === ct.fonctionCategorie)?.label}
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {o.notes && <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm">{o.notes}</p>}
              {hasCoord && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Coordonnées de la structure
                  </p>
                  <ul className="space-y-1.5 text-sm">
                    {o.email && (
                      <li className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a className="hover:underline" href={`mailto:${o.email}`}>
                          {o.email}
                        </a>
                      </li>
                    )}
                    {o.telephone && (
                      <li className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {o.telephone}
                      </li>
                    )}
                    {o.siteWeb && (
                      <li className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <a
                          className="truncate hover:underline"
                          href={hrefOf(o.siteWeb)}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          {o.siteWeb}
                        </a>
                      </li>
                    )}
                    {o.reseaux.map((r) => (
                      <li key={r.url} className="flex items-center gap-2">
                        <Linkedin className="h-4 w-4 text-muted-foreground" />
                        <a
                          className="truncate capitalize hover:underline"
                          href={hrefOf(r.url)}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          {r.type}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Block>
        )}

        {pl && (
          <section className="card-soft p-5 sm:p-6 print:hidden">
            <h2 className="mb-4 text-base font-semibold">Suivi</h2>
            <OngSuiviPanel ongId={o.id} dossier={pl} />
          </section>
        )}
      </div>
    </AppShell>
  );
}
