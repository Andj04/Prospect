import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Mail, Phone, RotateCcw, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { normaliser } from "@/lib/ong-utils";
import { useContactsDirectory } from "@/lib/queries/companies";
import { useOngContactsDirectory } from "@/lib/queries/ong";
import { CONTACT_FONCTIONS, type ContactFonction } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/annuaire")({
  head: () => ({ meta: [{ title: "Annuaire unifié — Prospection RSE Amal Biladi" }] }),
  component: AnnuairePage,
});

const ALL = "__all__";
type Type = "entreprise" | "ong";

type Ligne = {
  key: string;
  type: Type;
  orgId: string;
  orgNom: string;
  nom: string;
  fonction: ContactFonction;
  detail?: string | undefined;
  email?: string | undefined;
  telephone?: string | undefined;
};

// Annuaire des deux bases : mêmes catégories de fonction, filtrable par type d'organisation.
function AnnuairePage() {
  const { data: ce = [], isLoading: l1 } = useContactsDirectory();
  const { data: co = [], isLoading: l2 } = useOngContactsDirectory();
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>(ALL);
  const [fonction, setFonction] = useState(ALL);

  const lignes = useMemo<Ligne[]>(
    () => [
      ...ce.map((c) => ({
        key: `e-${c.id}`,
        type: "entreprise" as const,
        orgId: c.companyId,
        orgNom: c.companyNom,
        nom: c.nom,
        fonction: c.fonction,
        email: c.email,
        telephone: c.telephone,
      })),
      ...co.map((c) => ({
        key: `o-${c.id}`,
        type: "ong" as const,
        orgId: c.ongId,
        orgNom: c.ongNom,
        nom: c.nom,
        fonction: c.fonctionCategorie,
        detail: c.fonctionDetail,
        email: c.email,
        telephone: c.telephone,
      })),
    ],
    [ce, co],
  );

  const list = useMemo(() => {
    const needle = normaliser(q);
    return lignes.filter(
      (l) =>
        (!needle ||
          normaliser(`${l.nom} ${l.orgNom} ${l.detail ?? ""} ${l.email ?? ""}`).includes(needle)) &&
        (type === ALL || l.type === type) &&
        (fonction === ALL || l.fonction === fonction),
    );
  }, [lignes, q, type, fonction]);

  return (
    <AppShell>
      <div className="space-y-5">
        <PageHeader
          title="Annuaire unifié"
          description={`${lignes.length} contacts : ${ce.length} côté entreprises, ${co.length} côté ONG. Les pages Contacts et Contacts ONG restent disponibles séparément.`}
        />
        <div className="card-soft flex flex-wrap items-center gap-2 p-4">
          <div className="relative min-w-60 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un nom, une organisation, un email…"
              className="pl-9"
            />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9 w-48" aria-label="Type d'organisation">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Organisation : toutes</SelectItem>
              <SelectItem value="entreprise">Entreprises</SelectItem>
              <SelectItem value="ong">ONG</SelectItem>
            </SelectContent>
          </Select>
          <Select value={fonction} onValueChange={setFonction}>
            <SelectTrigger className="h-9 w-48" aria-label="Fonction">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Fonction : toutes</SelectItem>
              {CONTACT_FONCTIONS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(q || type !== ALL || fonction !== ALL) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                setType(ALL);
                setFonction(ALL);
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser
            </Button>
          )}
        </div>

        {l1 || l2 ? (
          <Skeleton className="h-64" />
        ) : (
          <ul className="card-soft divide-y divide-border">
            {list.map((l) => (
              <li key={l.key} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3 text-sm">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    l.type === "ong"
                      ? "bg-brand-orange/25 text-warning-foreground"
                      : "bg-primary/10 text-primary-deep",
                  )}
                >
                  {l.type === "ong" ? "ONG" : "Entreprise"}
                </span>
                <span className="min-w-48 flex-1">
                  <span className="font-semibold">{l.nom}</span>
                  <span className="text-muted-foreground">
                    {" · "}
                    {l.detail || CONTACT_FONCTIONS.find((f) => f.value === l.fonction)?.label}
                  </span>
                </span>
                {l.type === "ong" ? (
                  <Link to="/ong/$id" params={{ id: l.orgId }} className="hover:underline">
                    {l.orgNom}
                  </Link>
                ) : (
                  <Link to="/entreprises/$id" params={{ id: l.orgId }} className="hover:underline">
                    {l.orgNom}
                  </Link>
                )}
                {l.email && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {l.email}
                  </span>
                )}
                {l.telephone && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    {l.telephone}
                  </span>
                )}
              </li>
            ))}
            {list.length === 0 && (
              <li className="p-8 text-center text-muted-foreground">Aucun contact.</li>
            )}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
