import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompanies } from "@/lib/queries/companies";
import { useProjects } from "@/lib/queries/projects";
import { useSousComposantes } from "@/lib/queries/sous-composantes";
import { getSousComposanteIcon } from "@/lib/sous-composante-icons";
import type { Company } from "@/lib/types";

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
      className="h-8 w-8 shrink-0 rounded-full object-cover"
    />
  ) : (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
      {initials(company.nom) || "?"}
    </span>
  );
}

function CompanyRow({ company }: { company: Company }) {
  return (
    <Link
      to="/entreprises/$id"
      params={{ id: company.id }}
      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent"
    >
      <CompanyAvatar company={company} />
      <span className="min-w-0 truncate">{company.nom}</span>
    </Link>
  );
}

export function ByProjectView() {
  const { data: projets = [] } = useProjects();
  const { data: companies = [] } = useCompanies();
  const { data: sousComposantes = [] } = useSousComposantes();
  const [selectedProjetId, setSelectedProjetId] = useState<string | undefined>(undefined);

  const activeProjetId = selectedProjetId ?? projets[0]?.id;

  const scForProjet = useMemo(
    () =>
      sousComposantes
        .filter((sc) => sc.projetId === activeProjetId)
        .sort((a, b) => a.ordre - b.ordre),
    [sousComposantes, activeProjetId],
  );

  const companiesForProjet = useMemo(
    () =>
      companies.filter((c) => !c.exclue && activeProjetId && c.projets.includes(activeProjetId)),
    [companies, activeProjetId],
  );

  const otherCompanies = useMemo(() => {
    const scIds = new Set(scForProjet.map((sc) => sc.id));
    return companiesForProjet.filter((c) => !c.sousComposantes.some((id) => scIds.has(id)));
  }, [companiesForProjet, scForProjet]);

  return (
    <div className="space-y-4">
      <Select
        {...(activeProjetId ? { value: activeProjetId } : {})}
        onValueChange={setSelectedProjetId}
      >
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Choisir un projet" />
        </SelectTrigger>
        <SelectContent>
          {projets.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.nom}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!activeProjetId ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Aucun projet actif.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scForProjet.map((sc) => {
            const Icon = getSousComposanteIcon(sc.icone);
            const scCompanies = companiesForProjet.filter((c) => c.sousComposantes.includes(sc.id));
            return (
              <div key={sc.id} className="card-soft p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary-deep">
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 className="min-w-0 truncate text-sm font-semibold">{sc.nom}</h3>
                </div>
                {sc.description && (
                  <p className="mb-3 text-xs text-muted-foreground">{sc.description}</p>
                )}
                <div className="space-y-1">
                  {scCompanies.map((c) => (
                    <CompanyRow key={c.id} company={c} />
                  ))}
                  {scCompanies.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Aucune entreprise pour l'instant.
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {scForProjet.length === 0 && (
            <div className="card-soft p-4 sm:col-span-2 lg:col-span-3">
              <p className="text-sm text-muted-foreground">
                Aucune sous-composante définie pour ce projet.
              </p>
            </div>
          )}

          <div className="card-soft p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                <Building2 className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-semibold">Autres opportunités liées au projet</h3>
            </div>
            <div className="space-y-1">
              {otherCompanies.map((c) => (
                <CompanyRow key={c.id} company={c} />
              ))}
              {otherCompanies.length === 0 && (
                <p className="text-xs text-muted-foreground">Aucune.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
