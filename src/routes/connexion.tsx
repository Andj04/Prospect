import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/AuthProvider";
import logoMark from "@/assets/logo-mark.png";

export const Route = createFileRoute("/connexion")({
  head: () => ({
    meta: [{ title: "Connexion — Prospection RSE Amal Biladi" }],
  }),
  component: ConnexionPage,
});

function ConnexionPage() {
  const { session, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      void navigate({ to: "/" });
    }
  }, [loading, session, navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="card-soft w-full max-w-sm p-6 sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img
            src={logoMark}
            alt="180 Degrees Consulting"
            className="h-14 w-14 rounded-2xl object-cover"
          />
          <div>
            <h1 className="text-lg font-bold tracking-tight">Amal Biladi</h1>
            <p className="text-sm text-muted-foreground">Base de prospection RSE</p>
          </div>
        </div>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setSubmitting(true);
            const { error: signInError } = await signIn(email, password);
            setSubmitting(false);
            if (signInError) {
              setError("Email ou mot de passe incorrect.");
              return;
            }
            void navigate({ to: "/" });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Connexion…" : "Se connecter"}
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Pas de compte ? Contactez un administrateur pour qu'il vous en crée un.
        </p>
      </div>
    </div>
  );
}
