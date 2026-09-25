import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/AuthProvider";
import logoAmalBiladi from "@/assets/logo-amal-biladi.png";

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
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-brand-orange/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-md">
            <img src={logoAmalBiladi} alt="" className="h-10 w-10 object-contain" />
          </span>
          <span className="text-xl font-bold text-white">Amal Biladi</span>
        </div>
        <div className="relative max-w-md space-y-5">
          <div className="brand-stripe h-1 w-20 rounded-full" />
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-white">
            Base de prospection RSE
          </h2>
          <p className="text-base text-sidebar-foreground/80">
            Identifiez les entreprises et fondations qui peuvent financer vos projets, suivez chaque
            échange et cartographiez vos partenariats au même endroit.
          </p>
        </div>
        <p className="relative text-xs text-sidebar-foreground/50">
          Accès réservé aux membres de l'équipe.
        </p>
      </aside>
      <div className="grid place-items-center bg-background px-4 py-10">
        <div className="card-soft w-full max-w-sm p-6 sm:p-8">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <img src={logoAmalBiladi} alt="Amal Biladi" className="h-16 w-16 object-contain" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-primary-deep dark:text-foreground">
                Connexion
              </h1>
              <p className="text-sm text-muted-foreground">Amal Biladi · Base de prospection RSE</p>
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
    </div>
  );
}
