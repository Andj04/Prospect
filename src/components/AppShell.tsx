import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import {
  Building2,
  ChevronsUpDown,
  FolderKanban,
  GitBranch,
  History,
  LogOut,
  Network,
  Plus,
  User,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useRealtimeSync } from "@/lib/realtime";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { cn } from "@/lib/utils";
import logoAmalBiladi from "@/assets/logo-amal-biladi.png";

type NavEntry = { to: string; label: string; icon: typeof Building2; group: string };

const PROSPECTION_NAV: NavEntry[] = [
  { to: "/", label: "Entreprises", icon: Building2, group: "Prospection" },
  { to: "/pipeline", label: "Pipeline", icon: GitBranch, group: "Prospection" },
  { to: "/cartographie", label: "Cartographie", icon: Network, group: "Prospection" },
];

const ADMIN_NAV: NavEntry[] = [
  { to: "/projets", label: "Projets", icon: FolderKanban, group: "Administration" },
  { to: "/utilisateurs", label: "Utilisateurs", icon: Users, group: "Administration" },
  { to: "/journal", label: "Journal d'activité", icon: History, group: "Administration" },
];

function isActivePath(pathname: string, to: string) {
  return to === "/"
    ? pathname === "/" || pathname.startsWith("/entreprises")
    : pathname === to || pathname.startsWith(`${to}/`);
}

function ViewSwitch() {
  const { canPreviewUserView, viewingAsUser, setViewingAsUser } = useAuth();
  const { state } = useSidebar();
  if (!canPreviewUserView) return null;

  if (state === "collapsed") {
    return (
      <button
        onClick={() => setViewingAsUser(!viewingAsUser)}
        title={viewingAsUser ? "Repasser en vue Admin" : "Basculer en vue Utilisateur"}
        className="mx-auto grid h-8 w-8 place-items-center rounded-lg bg-sidebar-accent text-[10px] font-bold text-sidebar-accent-foreground"
      >
        {viewingAsUser ? "U" : "A"}
      </button>
    );
  }

  return (
    <div className="flex items-center rounded-full bg-sidebar-accent/60 p-0.5">
      {([false, true] as const).map((asUser) => (
        <button
          key={String(asUser)}
          onClick={() => setViewingAsUser(asUser)}
          className={cn(
            "flex-1 rounded-full px-2 py-1.5 text-xs font-semibold transition-all",
            viewingAsUser === asUser
              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
              : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
          )}
        >
          {asUser ? "Vue Utilisateur" : "Vue Admin"}
        </button>
      ))}
    </div>
  );
}

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: NavEntry[];
  pathname: string;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
        {label}
      </SidebarGroupLabel>
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
                  className="h-10 gap-3 text-[0.9rem] font-medium text-sidebar-foreground/80 hover:text-sidebar-accent-foreground data-[active=true]:font-semibold data-[active=true]:shadow-[inset_3px_0_0_var(--sidebar-primary)]"
                >
                  <Link to={to} onClick={() => isMobile && setOpenMobile(false)}>
                    <Icon className={cn("h-[18px] w-[18px]", active && "text-sidebar-primary")} />
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

function UserMenu() {
  const { profile, signOut, isAdmin, viewingAsUser } = useAuth();
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
              {viewingAsUser && " (aperçu)"}
            </span>
          </span>
          <ChevronsUpDown className="ml-auto h-4 w-4 text-sidebar-foreground/50" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={isMobile ? "top" : "right"} align="end" className="w-56">
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
        <Link to="/" className="flex items-center gap-3 overflow-hidden rounded-lg">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white shadow-sm">
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
        <NavGroup label="Prospection" items={PROSPECTION_NAV} pathname={pathname} />
        {isAdmin && <NavGroup label="Administration" items={ADMIN_NAV} pathname={pathname} />}
      </SidebarContent>
      <SidebarFooter className="gap-2 p-3">
        <ViewSwitch />
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

function currentSection(pathname: string): { group: string; label: string } {
  const entry = [...PROSPECTION_NAV, ...ADMIN_NAV]
    .filter((e) => isActivePath(pathname, e.to))
    .sort((a, b) => b.to.length - a.to.length)[0];
  if (entry) return { group: entry.group, label: entry.label };
  if (pathname.startsWith("/mon-compte")) return { group: "Compte", label: "Mon compte" };
  return { group: "Prospection", label: "Entreprises" };
}

export function AppShell({ children }: { children: ReactNode }) {
  const { loading, session, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useRealtimeSync(Boolean(session));

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
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
