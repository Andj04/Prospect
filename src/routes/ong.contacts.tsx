import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Linkedin, Mail, Phone, RotateCcw, Search } from "lucide-react";
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
import { useOngContactsDirectory } from "@/lib/queries/ong";
import { CONTACT_FONCTIONS } from "@/lib/types";

export const Route = createFileRoute("/ong/contacts")({
  head: () => ({ meta: [{ title: "Contacts ONG — Prospection RSE Amal Biladi" }] }),
  component: ContactsOngPage,
});

const ALL = "__all__";

function ContactsOngPage() {
  const { data: contacts = [], isLoading } = useOngContactsDirectory();
  const [q, setQ] = useState("");
  const [fonction, setFonction] = useState(ALL);

  const list = useMemo(() => {
    const needle = normaliser(q);
    return contacts.filter((c) => {
      if (
        needle &&
        !normaliser(`${c.nom} ${c.ongNom} ${c.fonctionDetail ?? ""} ${c.email ?? ""}`).includes(
          needle,
        )
      )
        return false;
      return fonction === ALL || c.fonctionCategorie === fonction;
    });
  }, [contacts, q, fonction]);

  return (
    <AppShell>
      <div className="space-y-5">
        <PageHeader
          title="Contacts ONG"
          description={`${contacts.length} personnes nommées dans ${new Set(contacts.map((c) => c.ongId)).size} ONG. Les coordonnées générales de la structure sont sur chaque fiche.`}
        />
        <div className="card-soft flex flex-wrap items-center gap-2 p-4">
          <div className="relative min-w-60 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un nom, une ONG, une fonction…"
              className="pl-9"
            />
          </div>
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
          {(q || fonction !== ALL) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                setFonction(ALL);
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser
            </Button>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-64" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((c) => (
              <div key={c.id} className="card-soft p-4">
                <span className="inline-flex rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary-deep">
                  {c.fonctionDetail ||
                    CONTACT_FONCTIONS.find((f) => f.value === c.fonctionCategorie)?.label}
                </span>
                <p className="mt-2 font-semibold">{c.nom}</p>
                <Link
                  to="/ong/$id"
                  params={{ id: c.ongId }}
                  className="text-sm text-primary-deep hover:underline dark:text-primary"
                >
                  {c.ongNom}
                </Link>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {c.email && (
                    <p className="flex items-center gap-2 truncate">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      {c.email}
                    </p>
                  )}
                  {c.telephone && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      {c.telephone}
                    </p>
                  )}
                  {c.linkedin && (
                    <p className="flex items-center gap-2 truncate">
                      <Linkedin className="h-3.5 w-3.5 shrink-0" />
                      {c.linkedin}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {list.length === 0 && (
              <p className="card-soft col-span-full p-8 text-center text-sm text-muted-foreground">
                Aucun contact ne correspond à ces critères.
              </p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
