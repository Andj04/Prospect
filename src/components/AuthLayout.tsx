import type { ReactNode } from "react";
import logoAmalBiladi from "@/assets/logo-amal-biladi.png";

// Écran d'authentification : panneau de marque à gauche, formulaire à droite.
// Partagé par la connexion et les deux étapes de réinitialisation du mot de
// passe, pour qu'elles ne divergent pas visuellement.
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
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
                {title}
              </h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          {children}
          {footer}
        </div>
      </div>
    </div>
  );
}
