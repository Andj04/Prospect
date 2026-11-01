import { useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Building2, FolderKanban, HeartHandshake, UserRound, type LucideIcon } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useCompaniesList, useContactsDirectory } from "@/lib/queries/companies";
import { useOngContactsDirectory, useOngList } from "@/lib/queries/ong";
import { useProjects } from "@/lib/queries/projects";
import { CONTACT_FONCTIONS } from "@/lib/types";

export type PaletteLink = { to: string; label: string; icon: LucideIcon };

// Recherche globale : pages, entreprises, contacts et projets en un seul
// endroit. S'ouvre avec Ctrl+K (ou ⌘K) depuis n'importe quelle page.
export function CommandPalette({
  open,
  onOpenChange,
  pages,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: PaletteLink[];
}) {
  const navigate = useNavigate();
  const { data: companies = [] } = useCompaniesList();
  // L'annuaire n'est chargé qu'à l'ouverture de la palette.
  const { data: contacts = [] } = useContactsDirectory(open);
  const { data: ongs = [] } = useOngList();
  const { data: ongContacts = [] } = useOngContactsDirectory(open);
  const { data: projets = [] } = useProjects();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const go = (to: string, params?: Record<string, string>) => {
    onOpenChange(false);
    void navigate(params ? { to, params } : { to });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Rechercher une entreprise, une ONG, un contact, un projet, une page…" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>Aucun résultat.</CommandEmpty>
        <CommandGroup heading="Pages">
          {pages.map(({ to, label, icon: Icon }) => (
            <CommandItem key={to} value={`page ${label}`} onSelect={() => go(to)}>
              <Icon className="h-4 w-4 text-muted-foreground" />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Entreprises">
          {companies.map((c) => (
            <CommandItem
              key={c.id}
              value={`entreprise ${c.nom} ${c.secteur ?? ""} ${c.paysOrigine ?? ""}`}
              onSelect={() => go("/entreprises/$id", { id: c.id })}
            >
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{c.nom}</span>
              {c.secteur && (
                <span className="ml-auto truncate pl-2 text-xs text-muted-foreground">
                  {c.secteur}
                </span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="ONG">
          {ongs.map((o) => (
            <CommandItem
              key={o.id}
              value={`ong ${o.nom} ${o.acronyme ?? ""} ${o.siege ?? ""}`}
              onSelect={() => go("/ong/$id", { id: o.id })}
            >
              <HeartHandshake className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{o.nom}</span>
              <span className="ml-auto truncate pl-2 text-xs text-muted-foreground">ONG</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Contacts">
          {contacts.map((ct) => (
            <CommandItem
              key={ct.id}
              value={`contact ${ct.nom} ${ct.companyNom}`}
              onSelect={() => go("/entreprises/$id", { id: ct.companyId })}
            >
              <UserRound className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">
                {ct.nom.length > 70 ? `${ct.nom.slice(0, 70)}…` : ct.nom}
              </span>
              <span className="ml-auto truncate pl-2 text-xs text-muted-foreground">
                {ct.companyNom}
              </span>
            </CommandItem>
          ))}
          {ongContacts.map((ct) => (
            <CommandItem
              key={ct.id}
              value={`contact ong ${ct.nom} ${ct.ongNom}`}
              onSelect={() => go("/ong/$id", { id: ct.ongId })}
            >
              <UserRound className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{ct.nom.length > 70 ? `${ct.nom.slice(0, 70)}…` : ct.nom}</span>
              <span className="ml-auto truncate pl-2 text-xs text-muted-foreground">
                {ct.ongNom} · ONG
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Projets Amal Biladi">
          {projets.map((p) => (
            <CommandItem
              key={p.id}
              value={`projet ${p.nom}`}
              onSelect={() => {
                onOpenChange(false);
                void navigate({ to: "/cartographie", search: { vue: "projets", projet: p.id } });
              }}
            >
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
              {p.nom}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
