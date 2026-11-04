import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase-client";
import type { Role } from "@/lib/types";

export type Profile = {
  id: string;
  fullName: string;
  structure: string;
  role: Role;
  passwordChangeRequired: boolean;
};

type ProfileRow = {
  id: string;
  full_name: string;
  structure: string;
  role: Role;
  password_change_required: boolean;
};

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    fullName: row.full_name,
    structure: row.structure,
    role: row.role,
    passwordChangeRequired: row.password_change_required,
  };
}

type AuthCtx = {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  /** Effective role for the UI — false while an admin previews the user view. */
  isAdmin: boolean;
  /** True for real admins only — controls whether the view-switch is shown. */
  canPreviewUserView: boolean;
  viewingAsUser: boolean;
  setViewingAsUser: (v: boolean) => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  /** Envoie le mail de réinitialisation qui ramène sur /nouveau-mot-de-passe. */
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>;
  /** Définit le mot de passe du compte connecté (y compris en session de récupération). */
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewingAsUser, setViewingAsUser] = useState(false);
  // Utilisateur dont le profil est déjà chargé : évite de le recharger à chaque
  // renouvellement du jeton (toutes les heures, et au retour sur l'onglet).
  const loadedUserId = useRef<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, structure, role, password_change_required")
      .eq("id", userId)
      .single();
    if (!error && data) {
      loadedUserId.current = userId;
      setProfile(mapProfile(data as ProfileRow));
    }
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      if (active) setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Même utilisateur, jeton renouvelé : on garde l'objet session tel quel
      // pour ne pas réafficher toute l'application.
      setSession((prev) =>
        prev && newSession && prev.user.id === newSession.user.id &&
        prev.access_token === newSession.access_token
          ? prev
          : newSession,
      );
      if (!newSession) {
        loadedUserId.current = null;
        setProfile(null);
        return;
      }
      if (loadedUserId.current === newSession.user.id) return;
      // Supabase interdit d'appeler une autre de ses méthodes depuis ce rappel
      // (risque d'interblocage : les requêtes suivantes restent en attente).
      // On diffère donc le chargement du profil.
      const userId = newSession.user.id;
      setTimeout(() => {
        if (active) void loadProfile(userId);
      }, 0);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  // Reset the "view as user" preview whenever the signed-in account changes.
  useEffect(() => {
    setViewingAsUser(false);
  }, [profile?.id]);

  const canPreviewUserView = profile?.role === "admin";

  // Objet mémorisé : les composants qui lisent useAuth() ne se réaffichent que
  // si la session, le profil ou l'aperçu changent réellement.
  const value = useMemo<AuthCtx>(
    () => ({
      loading,
      session,
      profile,
      isAdmin: canPreviewUserView && !viewingAsUser,
      canPreviewUserView,
      viewingAsUser,
      setViewingAsUser,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      sendPasswordReset: async (email) => {
        // Le lien du mail doit revenir sur l'app : Supabase n'accepte que les
        // URL déclarées dans Authentication > URL Configuration > Redirect URLs.
        const redirectTo =
          typeof window === "undefined"
            ? undefined
            : `${window.location.origin}/nouveau-mot-de-passe`;
        const { error } = await supabase.auth.resetPasswordForEmail(
          email,
          redirectTo ? { redirectTo } : {},
        );
        return { error: error?.message ?? null };
      },
      updatePassword: async (password) => {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) return { error: error.message };
        // Le compte n'est plus sur un mot de passe temporaire.
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          await supabase
            .from("profiles")
            .update({ password_change_required: false })
            .eq("id", data.session.user.id);
          await loadProfile(data.session.user.id);
        }
        return { error: null };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
      refreshProfile: async () => {
        if (session) await loadProfile(session.user.id);
      },
    }),
    [loading, session, profile, canPreviewUserView, viewingAsUser, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
