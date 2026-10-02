import { createContext, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

function useAuthState() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setUser(null);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data?.session?.user ?? null);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription?.subscription?.unsubscribe();
    };
  }, []);

  // Drives the admin-only UI (4th landing-page button, admin panel):
  // `profiles.is_admin` is only ever true for the one designated account
  // (migration 0003), set by hand in Supabase, not user-editable.
  useEffect(() => {
    if (!isSupabaseConfigured || !user) {
      setIsAdmin(false);
      return;
    }

    let cancelled = false;

    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsAdmin(Boolean(data?.is_admin));
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  function signInWithGoogle() {
    if (!isSupabaseConfigured) {
      console.warn("Supabase is not configured; cannot sign in.");
      return;
    }
    supabase.auth.signInWithOAuth({ provider: "google" });
  }

  function signOut() {
    if (!isSupabaseConfigured) return;
    supabase.auth.signOut();
  }

  return { user, loading, isConfigured: isSupabaseConfigured, isAdmin, signInWithGoogle, signOut };
}

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const value = useAuthState();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
