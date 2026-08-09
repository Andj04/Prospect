import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Building2, GitBranch, LogOut, User, Users } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import logoMark from "@/assets/logo-mark.png";

function ViewSwitch() {
  const { canPreviewUserView, viewingAsUser, setViewingAsUser } = useAuth();
  if (!canPreviewUserView) return null;

  return (
    <div className="flex shrink-0 items-center rounded-full border border-border bg-muted p-0.5">
      {([false, true] as const).map((asUser) => (
        <button
          key={String(asUser)}
          onClick={() => setViewingAsUser(asUser)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
            viewingAsUser === asUser
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {asUser ? "Vue Utilisateur" : "Vue Admin"}
        </button>
      ))}
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: to === "/" }}
      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground data-[status=active]:bg-accent data-[status=active]:text-accent-foreground"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

function UserMenu() {
  const { profile, signOut, isAdmin, viewingAsUser } = useAuth();
  const navigate = useNavigate();
  if (!profile) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-muted py-1 pl-1 pr-3 text-sm font-medium transition-colors hover:bg-accent">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {profile.fullName.slice(0, 1).toUpperCase() || "?"}
          </span>
          <span className="hidden max-w-[140px] truncate sm:inline">{profile.fullName}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block truncate font-semibold">{profile.fullName}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {profile.structure || "—"} ·{" "}
            {profile.role === "admin" ? "Administrateur" : "Utilisateur"}
            {viewingAsUser && " (aperçu utilisateur)"}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate({ to: "/mon-compte" })}>
          <User className="h-4 w-4" />
          Mon compte
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem onSelect={() => navigate({ to: "/utilisateurs" })}>
            <Users className="h-4 w-4" />
            Gérer les utilisateurs
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void signOut().then(() => navigate({ to: "/connexion" }));
          }}
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PasswordChangeBanner() {
  const { profile } = useAuth();
  if (!profile?.passwordChangeRequired) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
      Vous utilisez un mot de passe temporaire.{" "}
      <Link to="/mon-compte" className="font-semibold underline underline-offset-2">
        Changez-le dès maintenant
      </Link>
      .
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { loading, session, profile, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      void navigate({ to: "/connexion" });
    }
  }, [loading, session, navigate]);

  if (loading || !session || !profile) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/" className="flex min-w-0 items-center gap-2.5">
              <img
                src={logoMark}
                alt="180 Degrees Consulting"
                className="h-9 w-9 shrink-0 rounded-xl object-cover"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold leading-tight">Amal Biladi</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  Base de prospection RSE
                </span>
              </span>
            </Link>
            <nav className="ml-2 hidden items-center gap-1 md:flex">
              <NavItem to="/" icon={<Building2 className="h-4 w-4" />} label="Entreprises" />
              <NavItem to="/pipeline" icon={<GitBranch className="h-4 w-4" />} label="Pipeline" />
              {isAdmin && (
                <NavItem
                  to="/utilisateurs"
                  icon={<Users className="h-4 w-4" />}
                  label="Utilisateurs"
                />
              )}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isAdmin && (
              <Button size="sm" asChild>
                <Link to="/entreprises/nouvelle">
                  <span className="hidden sm:inline">Ajouter une entreprise</span>
                  <span className="sm:hidden">Ajouter</span>
                </Link>
              </Button>
            )}
            <ViewSwitch />
            <UserMenu />
          </div>
        </div>
        <nav className="flex items-center gap-1 border-t border-border px-4 py-1.5 md:hidden">
          <NavItem to="/" icon={<Building2 className="h-4 w-4" />} label="Entreprises" />
          <NavItem to="/pipeline" icon={<GitBranch className="h-4 w-4" />} label="Pipeline" />
          {isAdmin && (
            <NavItem to="/utilisateurs" icon={<Users className="h-4 w-4" />} label="Utilisateurs" />
          )}
        </nav>
        <PasswordChangeBanner />
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">{children}</main>
    </div>
  );
}
