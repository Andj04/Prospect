import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useCreateUser, useDeleteUser, useUsers } from "@/lib/queries/users";
import type { Role } from "@/lib/types";

export const Route = createFileRoute("/utilisateurs")({
  head: () => ({
    meta: [
      { title: "Gérer les utilisateurs — Amal Biladi" },
      {
        name: "description",
        content: "Administration des comptes accédant à la base de prospection RSE d'Amal Biladi.",
      },
      { property: "og:title", content: "Gérer les utilisateurs — Amal Biladi" },
      {
        property: "og:description",
        content: "Créez et gérez les accès administrateurs et utilisateurs.",
      },
    ],
  }),
  component: UtilisateursPage,
});

const empty = {
  nomComplet: "",
  email: "",
  motDePasse: "",
  structure: "",
  role: "user" as Role,
};

function UtilisateursPage() {
  const { isAdmin, profile } = useAuth();
  const { data: users = [] } = useUsers();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();
  const [form, setForm] = useState(empty);

  if (!isAdmin) {
    return (
      <AppShell>
        <p className="card-soft p-8 text-center text-sm text-muted-foreground">
          Cette page est réservée à la vue Admin.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gérer les utilisateurs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chaque compte créé reçoit un mot de passe temporaire à changer à la première connexion.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="card-soft overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Nom complet</th>
                  <th className="px-4 py-3 text-left font-semibold">Email</th>
                  <th className="px-4 py-3 text-left font-semibold">Structure</th>
                  <th className="px-4 py-3 text-left font-semibold">Rôle</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-border hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">{u.nomComplet}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.structure}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                        {u.role === "admin" ? "Administrateur" : "Utilisateur"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={u.id === profile?.id || deleteUser.isPending}
                        onClick={() => {
                          deleteUser.mutate(u.id, {
                            onSuccess: () => toast.success("Utilisateur supprimé"),
                            onError: (err) =>
                              toast.error(
                                err instanceof Error ? err.message : "Échec de la suppression",
                              ),
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form
            className="card-soft h-fit space-y-4 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.nomComplet.trim() || !form.email.trim() || form.motDePasse.length < 6) {
                toast.error("Nom, email et mot de passe (6 caractères min.) sont requis.");
                return;
              }
              createUser.mutate(
                {
                  email: form.email,
                  password: form.motDePasse,
                  fullName: form.nomComplet,
                  structure: form.structure,
                  role: form.role,
                },
                {
                  onSuccess: () => {
                    setForm(empty);
                    toast.success("Utilisateur créé");
                  },
                  onError: (err) =>
                    toast.error(err instanceof Error ? err.message : "Échec de la création"),
                },
              );
            }}
          >
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <UserPlus className="h-4 w-4 text-primary" />
              Créer un utilisateur
            </h2>
            <div className="space-y-1.5">
              <Label htmlFor="u-nom">Nom complet</Label>
              <Input
                id="u-nom"
                value={form.nomComplet}
                onChange={(e) => setForm({ ...form, nomComplet: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-email">Email</Label>
              <Input
                id="u-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-mdp">Mot de passe temporaire</Label>
              <Input
                id="u-mdp"
                type="password"
                value={form.motDePasse}
                onChange={(e) => setForm({ ...form, motDePasse: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-struct">Structure / organisation</Label>
              <Input
                id="u-struct"
                value={form.structure}
                onChange={(e) => setForm({ ...form, structure: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rôle</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as Role })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="user">Utilisateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={createUser.isPending}>
              {createUser.isPending ? "Création…" : "Créer le compte"}
            </Button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
