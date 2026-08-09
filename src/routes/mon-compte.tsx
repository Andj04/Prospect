import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/AuthProvider";
import { supabase } from "@/lib/supabase-client";

export const Route = createFileRoute("/mon-compte")({
  head: () => ({
    meta: [{ title: "Mon compte — Prospection RSE Amal Biladi" }],
  }),
  component: MonComptePage,
});

function MonComptePage() {
  const { profile, session, refreshProfile } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <AppShell>
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mon compte</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Informations de connexion et sécurité.
          </p>
        </div>

        <section className="card-soft space-y-3 p-5 sm:p-6">
          <h2 className="text-base font-semibold">Informations</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Nom complet
              </dt>
              <dd className="mt-1">{profile?.fullName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Email
              </dt>
              <dd className="mt-1">{session?.user.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Structure
              </dt>
              <dd className="mt-1">{profile?.structure || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Rôle
              </dt>
              <dd className="mt-1">
                {profile?.role === "admin" ? "Administrateur" : "Utilisateur"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="card-soft space-y-4 p-5 sm:p-6">
          <h2 className="text-base font-semibold">Changer de mot de passe</h2>
          {profile?.passwordChangeRequired && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Vous utilisez un mot de passe temporaire — merci de le changer maintenant.
            </p>
          )}
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              if (password.length < 6) {
                setError("Le mot de passe doit contenir au moins 6 caractères.");
                return;
              }
              if (password !== confirm) {
                setError("Les deux mots de passe ne correspondent pas.");
                return;
              }
              setSubmitting(true);
              const { error: updateError } = await supabase.auth.updateUser({ password });
              if (updateError) {
                setSubmitting(false);
                setError(updateError.message);
                return;
              }
              if (session) {
                await supabase
                  .from("profiles")
                  .update({ password_change_required: false })
                  .eq("id", session.user.id);
              }
              await refreshProfile();
              setSubmitting(false);
              setPassword("");
              setConfirm("");
              toast.success("Mot de passe mis à jour");
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting}>
              {submitting ? "Mise à jour…" : "Mettre à jour le mot de passe"}
            </Button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
