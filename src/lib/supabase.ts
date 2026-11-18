import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True only when both public Supabase values are present at build time. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * The anon key is public by design: it ships to the browser and is constrained
 * by Row Level Security, not by secrecy. No service-role key ever reaches this
 * file or the bundle.
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

export const dataMode = isSupabaseConfigured ? 'supabase' : 'sample';
