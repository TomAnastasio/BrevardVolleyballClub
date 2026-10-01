import { createContext, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

function useAuthState() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

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

  return { user, loading, isConfigured: isSupabaseConfigured, signInWithGoogle, signOut };
}

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const value = useAuthState();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
