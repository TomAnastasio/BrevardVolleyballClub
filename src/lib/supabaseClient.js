import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// True only when both env vars are present non-empty strings. Until the
// Supabase project exists (and these are set in .env / GitHub secrets), the
// app must keep working entirely off localStorage.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// `supabase` is null when not configured so importers can no-op instead of
// crashing (e.g. `if (!isSupabaseConfigured) return;` before using it).
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
