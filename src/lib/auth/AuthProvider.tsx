import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewingAsUser, setViewingAsUser] = useState(false);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, structure, role, password_change_required")
      .eq("id", userId)
      .single();
    if (!error && data) setProfile(mapProfile(data as ProfileRow));
  };

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      if (active) setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        void loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  // Reset the "view as user" preview whenever the signed-in account changes.
  useEffect(() => {
    setViewingAsUser(false);
  }, [profile?.id]);

  const canPreviewUserView = profile?.role === "admin";

  const value: AuthCtx = {
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
    signOut: async () => {
      await supabase.auth.signOut();
    },
    refreshProfile: async () => {
      if (session) await loadProfile(session.user.id);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
