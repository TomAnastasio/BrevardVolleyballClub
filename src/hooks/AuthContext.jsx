import { createContext, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

function useAuthState() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [isAdmin, setIsAdmin] = useState(false);
  // The player's own profiles.avatar_url, which (unlike the Google photo in
  // user_metadata) reflects a photo they changed from their profile page.
  const [avatarUrl, setAvatarUrl] = useState(null);
  // Their own profiles.display_name, which an admin may have changed from
  // the Google name in user_metadata.
  const [displayName, setDisplayName] = useState(null);
  const [profileVersion, setProfileVersion] = useState(0);

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
  // (migration 0003), set by hand in Supabase, not user-editable. Also
  // loads the player's own avatar_url; refreshProfile() re-runs this after
  // they change their photo.
  useEffect(() => {
    if (!isSupabaseConfigured || !user) {
      setIsAdmin(false);
      setAvatarUrl(null);
      setDisplayName(null);
      return;
    }

    let cancelled = false;

    supabase
      .from("profiles")
      .select("is_admin, avatar_url, display_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setIsAdmin(Boolean(data?.is_admin));
        setAvatarUrl(data?.avatar_url || null);
        setDisplayName(data?.display_name || null);
      });

    return () => {
      cancelled = true;
    };
  }, [user, profileVersion]);

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

  function refreshProfile() {
    setProfileVersion((v) => v + 1);
  }

  return {
    user,
    loading,
    isConfigured: isSupabaseConfigured,
    isAdmin,
    avatarUrl,
    displayName,
    refreshProfile,
    signInWithGoogle,
    signOut,
  };
}

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const value = useAuthState();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
