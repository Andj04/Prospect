import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Copy, Linkedin, Mail, Phone, RotateCcw, Search, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { CompanyPreviewSheet } from "@/components/CompanyPreviewSheet";
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
import { useContactsDirectory } from "@/lib/queries/companies";
import { CONTACT_FONCTIONS, type ContactFonction } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/contacts")({
  head: () => ({ meta: [{ title: "Contacts — Prospection RSE Amal Biladi" }] }),
  component: ContactsPage,
});

const ALL = "__all__";
type Canal = "tous" | "email" | "telephone" | "linkedin" | "aucun";

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error("Copie impossible dans ce navigateur");
  }
}

function CopyCell({
  value,
  label,
  icon,
}: {
  value?: string | undefined;
  label: string;
  icon: React.ReactNode;
}) {
  const [done, setDone] = useState(false);
  if (!value) return <span className="text-muted-foreground/40">—</span>;
  return (
    <span className="group inline-flex max-w-full items-center gap-1.5">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="min-w-0 truncate select-all">{value}</span>
      <button
        type="button"
        aria-label={`Copier ${label}`}
        onClick={async (e) => {
          e.stopPropagation();
          await copy(value, `${label} copié`);
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        }}
        className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
      >
        {done ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </span>
  );
}

// Annuaire de tous les contacts de la base, avec copie rapide des emails et
// téléphones — pratique pour préparer un envoi groupé.
function ContactsPage() {
  const { data: contacts = [], isLoading } = useContactsDirectory();
  const [q, setQ] = useState("");
  const [fonction, setFonction] = useState(ALL);
  const [secteur, setSecteur] = useState(ALL);
  const [canal, setCanal] = useState<Canal>("tous");
  const [previewId, setPreviewId] = useState<string | null>(null);

  const secteurs = useMemo(
    () => [...new Set(contacts.map((c) => c.companySecteur).filter(Boolean))].sort(),
    [contacts],
  );

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return contacts.filter((c) => {
      if (needle && !`${c.nom} ${c.companyNom} ${c.email ?? ""}`.toLowerCase().includes(needle))
        return false;
      if (fonction !== ALL && c.fonction !== fonction) return false;
      if (secteur !== ALL && c.companySecteur !== secteur) return false;
      if (canal === "email" && !c.email) return false;
      if (canal === "telephone" && !c.telephone) return false;
      if (canal === "linkedin" && !c.linkedin) return false;
      if (canal === "aucun" && (c.email || c.telephone || c.linkedin)) return false;
      return true;
    });
  }, [contacts, q, fonction, secteur, canal]);

  const emails = [...new Set(list.map((c) => c.email).filter(Boolean))] as string[];
  const filtered = q.trim() !== "" || fonction !== ALL || secteur !== ALL || canal !== "tous";

  return (
    <AppShell>
      <div className="space-y-5">
        <PageHeader
          title="Contacts"
          description={`${contacts.length} contacts dans ${new Set(contacts.map((c) => c.companyId)).size} entreprises. Survolez un email ou un téléphone pour le copier.`}
          actions={
            <Button
              variant="outline"
              disabled={emails.length === 0}
              onClick={() => void copy(emails.join("; "), `${emails.length} emails copiés`)}
            >
              <Mail className="h-4 w-4" />
              Copier les {emails.length} emails
            </Button>
          }
        />

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["tous", "Tous"],
              ["email", "Avec email"],
              ["telephone", "Avec téléphone"],
              ["linkedin", "Avec LinkedIn"],
              ["aucun", "Sans coordonnées"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setCanal(v)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                canal === v
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="card-soft flex flex-wrap items-center gap-2 p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nom, entreprise ou email…"
              className="pl-9"
            />
          </div>
          <Select value={fonction} onValueChange={setFonction}>
            <SelectTrigger className="w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Toutes les fonctions</SelectItem>
              {CONTACT_FONCTIONS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={secteur} onValueChange={setSecteur}>
            <SelectTrigger className="w-[210px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous les secteurs</SelectItem>
              {secteurs.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filtered && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                setQ("");
                setFonction(ALL);
                setSecteur(ALL);
                setCanal("tous");
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{list.length} contacts</span>
        </div>

        <div className="card-soft themed-scrollbar overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead className="sticky top-0 bg-muted text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Contact</th>
                <th className="px-4 py-3 text-left font-semibold">Fonction</th>
                <th className="px-4 py-3 text-left font-semibold">Entreprise</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Téléphone</th>
                <th className="px-4 py-3 text-left font-semibold">LinkedIn</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-t border-border">
                      <td colSpan={6} className="px-4 py-2">
                        <Skeleton className="h-6 w-full" />
                      </td>
                    </tr>
                  ))
                : list.map((c) => (
                    <tr
                      key={c.id}
                      className="border-t border-border align-top transition-colors hover:bg-secondary/60"
                    >
                      <td className="max-w-[280px] px-4 py-2.5 font-medium">
                        <span className="line-clamp-2">{c.nom || "—"}</span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {
                          CONTACT_FONCTIONS.find((f) => f.value === (c.fonction as ContactFonction))
                            ?.label
                        }
                      </td>
                      <td className="max-w-[220px] px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => setPreviewId(c.companyId)}
                          className="line-clamp-2 text-left text-primary hover:underline"
                        >
                          {c.companyNom}
                        </button>
                      </td>
                      <td className="max-w-[240px] px-4 py-2.5">
                        <CopyCell
                          value={c.email}
                          label="Email"
                          icon={<Mail className="h-3.5 w-3.5" />}
                        />
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">
                        <CopyCell
                          value={c.telephone}
                          label="Téléphone"
                          icon={<Phone className="h-3.5 w-3.5" />}
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        {c.linkedin ? (
                          <a
                            href={c.linkedin}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <Linkedin className="h-3.5 w-3.5" />
                            Profil
                          </a>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!isLoading && list.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-sm text-muted-foreground">
              <UsersRound className="h-8 w-8" />
              Aucun contact ne correspond à ces filtres.
            </div>
          )}
        </div>
      </div>
      <CompanyPreviewSheet companyId={previewId} onOpenChange={(o) => !o && setPreviewId(null)} />
    </AppShell>
  );
}
