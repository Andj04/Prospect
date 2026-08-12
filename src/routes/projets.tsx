import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useAllProjects, useCreateProject, useUpdateProject } from "@/lib/queries/projects";
import {
  useCreateSousComposante,
  useDeleteSousComposante,
  useSousComposantes,
  useUpdateSousComposante,
} from "@/lib/queries/sous-composantes";
import { SOUS_COMPOSANTE_ICONS, getSousComposanteIcon } from "@/lib/sous-composante-icons";
import type { Projet } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projets")({
  head: () => ({
    meta: [
      { title: "Projets Amal Biladi — Administration" },
      {
        name: "description",
        content: "Gestion des projets Amal Biladi et de leurs sous-composantes.",
      },
    ],
  }),
  component: ProjetsPage,
});

function InlineText({
  value,
  onCommit,
  placeholder,
  className,
}: {
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (editing) {
    return (
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft !== value) onCommit(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="h-8"
      />
    );
  }
  return (
    <button
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className={cn(
        "block w-full min-w-[80px] rounded px-1.5 py-1 text-left transition-colors hover:bg-accent",
        className,
      )}
    >
      {value || <span className="text-muted-foreground/60">{placeholder ?? "—"}</span>}
    </button>
  );
}

function SousComposantesSheet({
  projet,
  open,
  onOpenChange,
}: {
  projet: Projet;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { data: all = [] } = useSousComposantes();
  const createSc = useCreateSousComposante();
  const updateSc = useUpdateSousComposante();
  const deleteSc = useDeleteSousComposante();
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [icone, setIcone] = useState(SOUS_COMPOSANTE_ICONS[0]?.key ?? "sparkles");

  const items = all.filter((sc) => sc.projetId === projet.id).sort((a, b) => a.ordre - b.ordre);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Sous-composantes — {projet.nom}</SheetTitle>
          <SheetDescription>
            Visibles dans le formulaire entreprise dès qu'une entreprise coche ce projet.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-8">
          <div className="space-y-3">
            {items.map((sc) => {
              const Icon = getSousComposanteIcon(sc.icone);
              return (
                <div key={sc.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start gap-2">
                    <Select
                      value={sc.icone}
                      onValueChange={(v) => updateSc.mutate({ id: sc.id, icone: v })}
                    >
                      <SelectTrigger className="h-9 w-12 shrink-0 px-2">
                        <Icon className="h-4 w-4" />
                      </SelectTrigger>
                      <SelectContent>
                        {SOUS_COMPOSANTE_ICONS.map((opt) => {
                          const OptIcon = opt.icon;
                          return (
                            <SelectItem key={opt.key} value={opt.key}>
                              <span className="flex items-center gap-2">
                                <OptIcon className="h-4 w-4" />
                                {opt.label}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <div className="min-w-0 flex-1 space-y-1">
                      <InlineText
                        value={sc.nom}
                        onCommit={(v) => v.trim() && updateSc.mutate({ id: sc.id, nom: v.trim() })}
                        className="font-medium"
                      />
                      <InlineText
                        value={sc.description ?? ""}
                        onCommit={(v) => updateSc.mutate({ id: sc.id, description: v })}
                        placeholder="Description courte (optionnel)"
                        className="text-xs text-muted-foreground"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        deleteSc.mutate(sc.id, {
                          onSuccess: () => toast.success("Sous-composante supprimée"),
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucune sous-composante pour l'instant.
              </p>
            )}
          </div>

          <form
            className="space-y-3 border-t border-border pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!nom.trim()) return;
              createSc.mutate(
                { projetId: projet.id, nom: nom.trim(), description, icone },
                {
                  onSuccess: () => {
                    setNom("");
                    setDescription("");
                    toast.success("Sous-composante ajoutée");
                  },
                },
              );
            }}
          >
            <h3 className="text-sm font-semibold">Ajouter une sous-composante</h3>
            <div className="space-y-1.5">
              <Label htmlFor="sc-nom">Nom</Label>
              <Input id="sc-nom" value={nom} onChange={(e) => setNom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sc-desc">Description courte</Label>
              <Textarea
                id="sc-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Icône</Label>
              <Select value={icone} onValueChange={setIcone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOUS_COMPOSANTE_ICONS.map((opt) => {
                    const OptIcon = opt.icon;
                    return (
                      <SelectItem key={opt.key} value={opt.key}>
                        <span className="flex items-center gap-2">
                          <OptIcon className="h-4 w-4" />
                          {opt.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" size="sm" disabled={createSc.isPending}>
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ProjetsPage() {
  const { isAdmin } = useAuth();
  const { data: projets = [] } = useAllProjects();
  const { data: sousComposantes = [] } = useSousComposantes();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [managingId, setManagingId] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <AppShell>
        <p className="card-soft p-8 text-center text-sm text-muted-foreground">
          Cette page est réservée à la vue Admin.
        </p>
      </AppShell>
    );
  }

  const sorted = [...projets].sort((a, b) => {
    if (a.actif !== b.actif) return a.actif ? -1 : 1;
    return a.ordre - b.ordre;
  });
  const managing = sorted.find((p) => p.id === managingId);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projets Amal Biladi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Un projet désactivé disparaît des formulaires et filtres, mais les entreprises déjà
            liées le conservent — jamais de suppression définitive.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="card-soft overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Nom</th>
                  <th className="px-4 py-3 text-left font-semibold">Description</th>
                  <th className="px-4 py-3 text-left font-semibold">Sous-composantes</th>
                  <th className="px-4 py-3 text-left font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => {
                  const count = sousComposantes.filter((sc) => sc.projetId === p.id).length;
                  return (
                    <tr
                      key={p.id}
                      className={cn(
                        "border-t border-border hover:bg-muted/40",
                        !p.actif && "opacity-60",
                      )}
                    >
                      <td className="px-4 py-2 font-medium">
                        <InlineText
                          value={p.nom}
                          onCommit={(v) =>
                            v.trim() && updateProject.mutate({ id: p.id, nom: v.trim() })
                          }
                        />
                      </td>
                      <td className="px-4 py-2">
                        <InlineText
                          value={p.description ?? ""}
                          onCommit={(v) => updateProject.mutate({ id: p.id, description: v })}
                          placeholder="Description courte"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Button variant="ghost" size="sm" onClick={() => setManagingId(p.id)}>
                          <Settings2 className="h-4 w-4" />
                          {count} sous-composante{count > 1 ? "s" : ""}
                        </Button>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={p.actif}
                            onCheckedChange={(v) =>
                              updateProject.mutate(
                                { id: p.id, actif: v },
                                {
                                  onSuccess: () =>
                                    toast.success(v ? "Projet réactivé" : "Projet désactivé"),
                                },
                              )
                            }
                          />
                          <span className="text-xs text-muted-foreground">
                            {p.actif ? "Actif" : "Inactif"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                      Aucun projet pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <form
            className="card-soft h-fit space-y-4 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!nom.trim()) {
                toast.error("Le nom du projet est requis.");
                return;
              }
              createProject.mutate(
                { nom: nom.trim(), description },
                {
                  onSuccess: () => {
                    setNom("");
                    setDescription("");
                    toast.success("Projet créé");
                  },
                  onError: (err) =>
                    toast.error(err instanceof Error ? err.message : "Échec de la création"),
                },
              );
            }}
          >
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Plus className="h-4 w-4 text-primary" />
              Nouveau projet
            </h2>
            <div className="space-y-1.5">
              <Label htmlFor="p-nom">Nom</Label>
              <Input id="p-nom" value={nom} onChange={(e) => setNom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-desc">Description courte</Label>
              <Textarea
                id="p-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={createProject.isPending}>
              {createProject.isPending ? "Création…" : "Créer le projet"}
            </Button>
          </form>
        </div>
      </div>

      {managing && (
        <SousComposantesSheet
          projet={managing}
          open={managingId !== null}
          onOpenChange={(o) => !o && setManagingId(null)}
        />
      )}
    </AppShell>
  );
}
