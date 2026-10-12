import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, MailCheck } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/AuthProvider";

export const Route = createFileRoute("/mot-de-passe-oublie")({
  head: () => ({
    meta: [{ title: "Mot de passe oublié — Prospection RSE Amal Biladi" }],
  }),
  component: MotDePasseOubliePage,
});

function MotDePasseOubliePage() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (envoye) {
    return (
      <AuthLayout title="Vérifiez votre boîte mail" subtitle="Un lien vient de vous être envoyé">
        <div className="space-y-4 text-sm">
          <div className="flex items-start gap-3 rounded-xl bg-success-soft px-3 py-3 text-success">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              Si un compte existe pour <span className="font-semibold">{email}</span>, un message
              contenant un lien de réinitialisation vient d'y être envoyé.
            </p>
          </div>
          <p className="text-muted-foreground">
            Ouvrez ce message et cliquez sur le lien : il vous amènera directement sur l'application
            pour choisir un nouveau mot de passe. Le lien n'est valable qu'une heure et ne peut
            servir qu'une seule fois.
          </p>
          <p className="text-muted-foreground">
            Pensez à regarder dans les courriers indésirables si vous ne voyez rien arriver.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setEnvoye(false);
              setError("");
            }}
          >
            Renvoyer un lien
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Mot de passe oublié"
      subtitle="Recevez un lien pour en choisir un nouveau"
      footer={
        <p className="mt-6 text-center text-xs">
          <Link
            to="/connexion"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Revenir à la connexion
          </Link>
        </p>
      }
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setSubmitting(true);
          const { error: resetError } = await sendPasswordReset(email.trim());
          setSubmitting(false);
          if (resetError) {
            setError(
              /you can only request this after|rate limit/i.test(resetError)
                ? "Un lien a déjà été demandé il y a quelques instants. Patientez une minute avant de réessayer."
                : "L'envoi a échoué. Vérifiez l'adresse saisie et réessayez.",
            );
            return;
          }
          setEnvoye(true);
        }}
      >
        <p className="text-sm text-muted-foreground">
          Indiquez l'adresse de votre compte. Vous recevrez un lien qui vous permettra de définir un
          nouveau mot de passe.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Envoi…" : "Envoyer le lien"}
        </Button>
      </form>
    </AuthLayout>
  );
}
