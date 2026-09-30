import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BarChart3,
  Building2,
  ChevronsUpDown,
  Eye,
  FolderKanban,
  GitBranch,
  History,
  Home,
  LogOut,
  Monitor,
  Moon,
  Network,
  Plus,
  Search,
  Star,
  Sun,
  User,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useRealtimeSync } from "@/lib/realtime";
import { useFavorites, useTheme, type ThemeChoice } from "@/lib/preferences";
import { useCompanies } from "@/lib/queries/companies";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { CommandPalette, type PaletteLink } from "@/components/CommandPalette";
import { cn } from "@/lib/utils";
import logoAmalBiladi from "@/assets/logo-amal-biladi.png";

type NavEntry = PaletteLink & { group: string };

const HOME_NAV: NavEntry[] = [{ to: "/", label: "Accueil", icon: Home, group: "Accueil" }];

const PROSPECTION_NAV: NavEntry[] = [
  { to: "/entreprises", label: "Entreprises", icon: Building2, group: "Prospection" },
  { to: "/pipeline", label: "Pipeline", icon: GitBranch, group: "Prospection" },
];

const ANALYSE_NAV: NavEntry[] = [
  { to: "/tableau-de-bord", label: "Tableau de bord", icon: BarChart3, group: "Analyse" },
  { to: "/cartographie", label: "Cartographie", icon: Network, group: "Analyse" },
];

const ADMIN_NAV: NavEntry[] = [
  { to: "/projets", label: "Projets Amal Biladi", icon: FolderKanban, group: "Administration" },
  { to: "/utilisateurs", label: "Utilisateurs", icon: Users, group: "Administration" },
  { to: "/journal", label: "Journal d'activité", icon: History, group: "Administration" },
];

function isActivePath(pathname: string, to: string) {
  return to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
}

const navButtonClass =
  "h-10 gap-3 text-[0.9rem] font-medium text-sidebar-foreground/80 transition-all duration-200 hover:translate-x-0.5 hover:text-sidebar-accent-foreground data-[active=true]:font-semibold data-[active=true]:shadow-[inset_3px_0_0_var(--sidebar-primary)]";

function NavGroup({
  label,
  items,
  pathname,
}: {
  label?: string;
  items: NavEntry[];
  pathname: string;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarGroup className="py-1">
      {label && (
        <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map(({ to, label: itemLabel, icon: Icon }) => {
            const active = isActivePath(pathname, to);
            return (
              <SidebarMenuItem key={to}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={itemLabel}
                  className={navButtonClass}
                >
                  <Link to={to} onClick={() => isMobile && setOpenMobile(false)}>
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px] transition-colors",
                        active && "text-sidebar-primary",
                      )}
                    />
                    <span>{itemLabel}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

// Entreprises épinglées par l'utilisateur (étoile sur la fiche).
function FavoritesGroup({ pathname }: { pathname: string }) {
  const { profile } = useAuth();
  const { favorites } = useFavorites(profile?.id);
  const { data: companies = [] } = useCompanies();
  const { isMobile, setOpenMobile } = useSidebar();
  const items = useMemo(
    () =>
      favorites
        .map((id) => companies.find((c) => c.id === id))
        .filter((c): c is NonNullable<typeof c> => Boolean(c)),
    [favorites, companies],
  );
  if (items.length === 0) return null;
  return (
    <SidebarGroup className="py-1">
      <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
        Favoris
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((c) => (
            <SidebarMenuItem key={c.id}>
              <SidebarMenuButton
                asChild
                isActive={pathname === `/entreprises/${c.id}`}
                tooltip={c.nom}
                className={cn(navButtonClass, "h-9 text-[0.85rem]")}
              >
                <Link
                  to="/entreprises/$id"
                  params={{ id: c.id }}
                  onClick={() => isMobile && setOpenMobile(false)}
                >
                  <Star className="h-4 w-4 fill-sidebar-primary text-sidebar-primary" />
                  <span className="truncate">{c.nom}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

const THEME_OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon },
  { value: "system", label: "Automatique", icon: Monitor },
];

function UserMenu() {
  const { profile, signOut, isAdmin, viewingAsUser, canPreviewUserView, setViewingAsUser } =
    useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { isMobile } = useSidebar();
  if (!profile) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton size="lg" className="text-sidebar-foreground">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
            {profile.fullName.slice(0, 1).toUpperCase() || "?"}
          </span>
          <span className="grid min-w-0 flex-1 text-left leading-tight">
            <span className="truncate text-sm font-semibold">{profile.fullName}</span>
            <span className="truncate text-xs text-sidebar-foreground/60">
              {profile.role === "admin" ? "Administrateur" : "Utilisateur"}
              {viewingAsUser && " (aperçu utilisateur)"}
            </span>
          </span>
          <ChevronsUpDown className="ml-auto h-4 w-4 text-sidebar-foreground/50" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={isMobile ? "top" : "right"} align="end" className="w-60">
        <DropdownMenuLabel>
          <span className="block truncate font-semibold">{profile.fullName}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {profile.structure || "—"}
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
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            Thème
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemeChoice)}>
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  <Icon className="h-4 w-4" />
                  {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {canPreviewUserView && (
          <DropdownMenuCheckboxItem
            checked={viewingAsUser}
            onCheckedChange={(v) => setViewingAsUser(v === true)}
          >
            <Eye className="h-4 w-4" />
            Aperçu vue utilisateur
          </DropdownMenuCheckboxItem>
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

function AppSidebar({ pathname }: { pathname: string }) {
  const { isAdmin } = useAuth();
  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-3 pb-2 pt-4">
        <Link to="/" className="group/logo flex items-center gap-3 overflow-hidden rounded-lg">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white shadow-sm transition-transform duration-300 group-hover/logo:rotate-[-6deg] group-hover/logo:scale-105">
            <img src={logoAmalBiladi} alt="Amal Biladi" className="h-8 w-8 object-contain" />
          </span>
          <span className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-base font-bold text-sidebar-accent-foreground">
              Amal Biladi
            </span>
            <span className="block truncate text-xs text-sidebar-foreground/60">
              Base de prospection RSE
            </span>
          </span>
        </Link>
      </SidebarHeader>
      <div className="brand-stripe mx-3 h-0.5 rounded-full opacity-80 group-data-[collapsible=icon]:mx-2" />
      <SidebarContent className="pt-2">
        <NavGroup items={HOME_NAV} pathname={pathname} />
        <NavGroup label="Prospection" items={PROSPECTION_NAV} pathname={pathname} />
        <NavGroup label="Analyse" items={ANALYSE_NAV} pathname={pathname} />
        {isAdmin && <NavGroup label="Administration" items={ADMIN_NAV} pathname={pathname} />}
        <FavoritesGroup pathname={pathname} />
      </SidebarContent>
      <SidebarFooter className="gap-2 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <UserMenu />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function PasswordChangeBanner() {
  const { profile } = useAuth();
  if (!profile?.passwordChangeRequired) return null;

  return (
    <div className="border-b border-warning/40 bg-warning-soft px-4 py-2 text-center text-sm text-warning-foreground">
      Vous utilisez un mot de passe temporaire.{" "}
      <Link to="/mon-compte" className="font-semibold underline underline-offset-2">
        Changez-le dès maintenant
      </Link>
      .
    </div>
  );
}

const ALL_NAV = [...HOME_NAV, ...PROSPECTION_NAV, ...ANALYSE_NAV, ...ADMIN_NAV];

function currentSection(pathname: string): { group: string; label: string } {
  if (pathname === "/entreprises/nouvelle")
    return { group: "Entreprises", label: "Nouvelle fiche" };
  if (/^\/entreprises\/[^/]+\/modifier/.test(pathname))
    return { group: "Entreprises", label: "Modifier la fiche" };
  if (/^\/entreprises\/[^/]+$/.test(pathname)) return { group: "Entreprises", label: "Fiche" };
  const entry = ALL_NAV.filter((e) => isActivePath(pathname, e.to)).sort(
    (a, b) => b.to.length - a.to.length,
  )[0];
  if (entry) return { group: entry.group, label: entry.label };
  if (pathname.startsWith("/mon-compte")) return { group: "Compte", label: "Mon compte" };
  return { group: "Accueil", label: "Accueil" };
}

// Squelette affiché pendant la vérification de session : la page garde sa
// silhouette au lieu d'un écran blanc avec une roue.
function ShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden w-64 shrink-0 flex-col gap-3 bg-sidebar p-4 md:flex">
        <Skeleton className="h-10 w-40 bg-sidebar-accent" />
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full bg-sidebar-accent/70" />
        ))}
      </div>
      <div className="flex-1 space-y-6 p-8">
        <Skeleton className="h-9 w-72" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { loading, session, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [paletteOpen, setPaletteOpen] = useState(false);
  useRealtimeSync(Boolean(session));

  useEffect(() => {
    if (!loading && !session) {
      void navigate({ to: "/connexion" });
    }
  }, [loading, session, navigate]);

  const paletteLinks = useMemo(
    () => (isAdmin ? ALL_NAV : [...HOME_NAV, ...PROSPECTION_NAV, ...ANALYSE_NAV]),
    [isAdmin],
  );

  if (loading || !session || !profile) return <ShellSkeleton />;

  const section = currentSection(pathname);

  return (
    <SidebarProvider>
      <AppSidebar pathname={pathname} />
      <SidebarInset className="min-w-0 bg-background">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/85 px-4 backdrop-blur lg:px-8">
          <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
          <Separator orientation="vertical" className="h-5" />
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="hidden text-muted-foreground sm:inline">{section.group}</span>
            <span className="hidden text-muted-foreground/50 sm:inline">/</span>
            <span className="truncate font-semibold">{section.label}</span>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="group flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              aria-label="Rechercher (Ctrl+K)"
            >
              <Search className="h-4 w-4" />
              <span className="hidden md:inline">Rechercher…</span>
              <kbd className="ml-2 hidden rounded border border-border bg-muted px-1.5 font-mono text-[10px] md:inline">
                Ctrl K
              </kbd>
            </button>
            {isAdmin && (
              <Button size="sm" asChild>
                <Link to="/entreprises/nouvelle">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Ajouter une entreprise</span>
                  <span className="sm:hidden">Ajouter</span>
                </Link>
              </Button>
            )}
          </div>
        </header>
        <PasswordChangeBanner />
        <main
          key={pathname}
          className="mx-auto w-full max-w-[1600px] px-4 py-6 animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none lg:px-8 lg:py-8"
        >
          {children}
        </main>
      </SidebarInset>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} pages={paletteLinks} />
    </SidebarProvider>
  );
}
