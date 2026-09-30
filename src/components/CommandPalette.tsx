import { useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Building2, FolderKanban, UserRound, type LucideIcon } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useCompanies } from "@/lib/queries/companies";
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
  const { data: companies = [] } = useCompanies();
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

  const contacts = useMemo(
    () =>
      companies.flatMap((c) =>
        c.contacts.map((ct) => ({
          id: ct.id,
          nom: ct.nom.length > 70 ? `${ct.nom.slice(0, 70)}…` : ct.nom,
          fonction: CONTACT_FONCTIONS.find((f) => f.value === ct.fonction)?.label ?? "",
          companyId: c.id,
          companyNom: c.nom,
        })),
      ),
    [companies],
  );

  const go = (to: string, params?: Record<string, string>) => {
    onOpenChange(false);
    void navigate(params ? { to, params } : { to });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Rechercher une entreprise, un contact, un projet, une page…" />
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
        <CommandGroup heading="Contacts">
          {contacts.map((ct) => (
            <CommandItem
              key={ct.id}
              value={`contact ${ct.nom} ${ct.companyNom}`}
              onSelect={() => go("/entreprises/$id", { id: ct.companyId })}
            >
              <UserRound className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{ct.nom}</span>
              <span className="ml-auto truncate pl-2 text-xs text-muted-foreground">
                {ct.companyNom}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Projets Amal Biladi">
          {projets.map((p) => (
            <CommandItem key={p.id} value={`projet ${p.nom}`} onSelect={() => go("/cartographie")}>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
              {p.nom}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
