import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  Copy,
  Download,
  Globe2,
  Landmark,
  Linkedin,
  Mail,
  Phone,
  Star,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { StatutBadge } from "@/components/badges";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth/AuthProvider";
import { REQUIRED_CHECKS, missingRequired } from "@/lib/completeness";
import { exportCompanyToPdf } from "@/lib/export";
import { getProjectColor } from "@/lib/graph-colors";
import { useFavorites } from "@/lib/preferences";
import { useCompanies } from "@/lib/queries/companies";
import { usePipeline } from "@/lib/queries/pipeline";
import { useAllProjects } from "@/lib/queries/projects";
import { useSousComposantes } from "@/lib/queries/sous-composantes";
import { CONTACT_FONCTIONS, type Company } from "@/lib/types";
import { cn } from "@/lib/utils";

function initials(nom: string) {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function CompanyAvatar({ company, size = 44 }: { company: Company; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const style = { width: size, height: size };
  return company.logoUrl && !imgError ? (
    <img
      src={company.logoUrl}
      alt=""
      loading="lazy"
      onError={() => setImgError(true)}
      style={style}
      className="shrink-0 rounded-xl border border-border bg-white object-contain p-1"
    />
  ) : (
    <span
      style={style}
      className="grid shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-bold text-primary"
    >
      {initials(company.nom) || "?"}
    </span>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copier ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          toast.success(`${label} copié`);
          setTimeout(() => setDone(false), 1200);
        } catch {
          toast.error("Copie impossible dans ce navigateur");
        }
      }}
      className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {done ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function Field({ label, value }: { label: string; value: string | undefined }) {
  if (!value?.trim()) return null;
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 line-clamp-6 whitespace-pre-wrap text-sm leading-relaxed">{value}</dd>
    </div>
  );
}

// Aperçu d'une fiche en panneau latéral : l'essentiel (contacts, projets,
// pertinence) sans quitter la page en cours.
export function CompanyPreviewSheet({
  companyId,
  onOpenChange,
}: {
  companyId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { profile } = useAuth();
  const { isFavorite, toggle } = useFavorites(profile?.id);
  const { data: companies = [] } = useCompanies();
  const { data: pipeline = [] } = usePipeline();
  const { data: projets = [] } = useAllProjects();
  const { data: sousComposantes = [] } = useSousComposantes();
  const company = companies.find((c) => c.id === companyId);
  const pl = pipeline.find((p) => p.companyId === companyId);

  const miss = company ? missingRequired(company) : [];
  const done = REQUIRED_CHECKS.length - miss.length;

  return (
    <Sheet open={Boolean(companyId)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {company && (
          <>
            <SheetHeader className="space-y-3">
              <div className="flex items-start gap-3 pr-6">
                <CompanyAvatar company={company} />
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-balance leading-snug">{company.nom}</SheetTitle>
                  <SheetDescription className="truncate">
                    {company.groupe || "Groupe non renseigné"}
                  </SheetDescription>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(company.id)}
                  aria-label={
                    isFavorite(company.id) ? "Retirer des favoris" : "Ajouter aux favoris"
                  }
                  className="rounded-md p-1 text-muted-foreground transition-transform hover:scale-110 hover:text-brand-orange"
                >
                  <Star
                    className={cn(
                      "h-5 w-5",
                      isFavorite(company.id) && "fill-brand-orange text-brand-orange",
                    )}
                  />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {company.secteur && (
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary-deep dark:text-primary">
                    {company.secteur}
                  </span>
                )}
                {company.paysOrigine && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    <Globe2 className="h-3 w-3" />
                    {company.paysOrigine}
                  </span>
                )}
                {company.structureDediee && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
                    <Landmark className="h-3 w-3" />
                    Fondation
                  </span>
                )}
                <span
                  title={miss.length ? `À compléter : ${miss.join(", ")}` : "Fiche complète"}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
                    miss.length === 0
                      ? "bg-success/15 text-success"
                      : miss.length <= 3
                        ? "bg-brand-orange/20 text-warning-foreground"
                        : "bg-destructive/10 text-destructive",
                  )}
                >
                  Fiche {done}/{REQUIRED_CHECKS.length}
                </span>
                {pl && <StatutBadge statut={pl.statut} />}
              </div>
            </SheetHeader>

            <div className="space-y-5 px-4 pb-8">
              {company.exclue && (
                <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <X className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Entreprise exclue — {company.raisonExclusion}</span>
                </p>
              )}

              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Contacts ({company.contacts.length})
                </h3>
                {company.contacts.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
                    Aucun contact renseigné.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {company.contacts.map((ct) => (
                      <li key={ct.id} className="rounded-lg border border-border p-3">
                        <p className="line-clamp-2 text-sm font-medium">{ct.nom}</p>
                        <p className="text-xs text-muted-foreground">
                          {CONTACT_FONCTIONS.find((f) => f.value === ct.fonction)?.label}
                        </p>
                        <div className="mt-2 space-y-1 text-sm">
                          {ct.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              <span className="min-w-0 flex-1 truncate select-all">{ct.email}</span>
                              <CopyButton value={ct.email} label="Email" />
                            </div>
                          )}
                          {ct.telephone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              <span className="min-w-0 flex-1 truncate select-all tabular-nums">
                                {ct.telephone}
                              </span>
                              <CopyButton value={ct.telephone} label="Téléphone" />
                            </div>
                          )}
                          {ct.linkedin && (
                            <a
                              href={ct.linkedin}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-primary hover:underline"
                            >
                              <Linkedin className="h-3.5 w-3.5" />
                              Profil LinkedIn
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {company.projets.length > 0 && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Projets Amal Biladi
                  </h3>
                  <ul className="space-y-1.5">
                    {company.projets.map((pid) => {
                      const p = projets.find((x) => x.id === pid);
                      const scs = sousComposantes.filter(
                        (s) => s.projetId === pid && company.sousComposantes.includes(s.id),
                      );
                      return (
                        <li key={pid} className="flex items-start gap-2 text-sm">
                          <span
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: getProjectColor(pid) }}
                          />
                          <span>
                            <span className="font-medium">{p?.nom ?? "Projet"}</span>
                            {scs.length > 0 && (
                              <span className="text-muted-foreground">
                                {" "}
                                — {scs.map((s) => s.nom).join(", ")}
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              <dl className="space-y-4">
                <Field label="Mode d'accès au financement" value={company.modeAcces} />
                <Field label="Descriptif des activités" value={company.descriptifActivites} />
                <Field label="Alignement thématique" value={company.alignementThematique} />
                <Field label="Proposition concrète" value={company.propositionConcrete} />
              </dl>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button asChild>
                  <Link to="/entreprises/$id" params={{ id: company.id }}>
                    Voir la fiche complète
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    void exportCompanyToPdf({ company, projets, sousComposantes, pipeline: pl })
                  }
                >
                  <Download className="h-4 w-4" />
                  Télécharger en PDF
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
