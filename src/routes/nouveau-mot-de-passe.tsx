import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth/AuthProvider";

export const Route = createFileRoute("/nouveau-mot-de-passe")({
  head: () => ({
    meta: [{ title: "Nouveau mot de passe — Prospection RSE Amal Biladi" }],
  }),
  component: NouveauMotDePassePage,
});

// Page d'arrivée du lien reçu par mail. Supabase dépose le jeton de
// récupération dans l'URL ; le client l'échange contre une session dès son
// initialisation, ce qui autorise un seul changement de mot de passe.
function NouveauMotDePassePage() {
  const { loading, session, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [lienInvalide, setLienInvalide] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Un lien expiré ou déjà utilisé revient avec l'erreur dans l'URL plutôt
  // qu'avec un jeton. On la lit puis on nettoie l'URL.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const code = hash.get("error_code") ?? query.get("error_code");
    const desc = hash.get("error_description") ?? query.get("error_description");
    if (!code && !desc) return;
    setLienInvalide(
      code === "otp_expired"
        ? "Ce lien a expiré. Les liens de réinitialisation ne sont valables qu'une heure."
        : "Ce lien n'est plus valable. Il a peut-être déjà été utilisé.",
    );
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const indisponible = lienInvalide || (!loading && !session);

  if (loading && !lienInvalide) {
    return (
      <AuthLayout title="Nouveau mot de passe" subtitle="Vérification du lien…">
        <div className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </AuthLayout>
    );
  }

  if (indisponible) {
    return (
      <AuthLayout title="Lien invalide" subtitle="Impossible de réinitialiser le mot de passe">
        <div className="space-y-4 text-sm">
          <div className="flex items-start gap-3 rounded-xl bg-warning-soft px-3 py-3 text-warning-foreground">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              {lienInvalide ||
                "Cette page doit être ouverte depuis le lien reçu par mail. Aucun lien de réinitialisation n'a été détecté."}
            </p>
          </div>
          <Button asChild className="w-full">
            <Link to="/mot-de-passe-oublie">Demander un nouveau lien</Link>
          </Button>
          <p className="text-center">
            <Link
              to="/connexion"
              className="text-xs text-muted-foreground hover:text-primary hover:underline"
            >
              Revenir à la connexion
            </Link>
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Nouveau mot de passe"
      subtitle={session?.user.email ?? "Choisissez votre mot de passe"}
    >
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
          const { error: updateError } = await updatePassword(password);
          setSubmitting(false);
          if (updateError) {
            setError(
              /should be different|same as the old/i.test(updateError)
                ? "Choisissez un mot de passe différent de l'ancien."
                : updateError,
            );
            return;
          }
          toast.success("Mot de passe mis à jour — vous êtes connecté.");
          void navigate({ to: "/" });
        }}
      >
        <p className="text-sm text-muted-foreground">
          Choisissez un nouveau mot de passe. Vous serez connecté aussitôt.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="new-password">Nouveau mot de passe</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            autoFocus
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
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Enregistrement…" : "Définir le mot de passe"}
        </Button>
      </form>
    </AuthLayout>
  );
}
