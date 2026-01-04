import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || (import.meta as any).env?.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Keep a console warning but allow server-only builds to continue
  console.warn("Supabase client env vars are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for client realtime features.");
}

// If env vars are missing, export null so callers can guard and avoid runtime errors
export const supabaseClient: SupabaseClient | null = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {
        params: {
          // Ensure we receive the minimal payloads quickly
          // (no special params required for standard Postgres changes)
        },
      },
    })
  : null;

export default supabaseClient;
