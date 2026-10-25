import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Shared Supabase client for the Hail Health Cluster Formulary.
 * Credentials come from Vite env (`.env.local`) — never hardcode secrets in source.
 * Content still uses local persistence until formulary migrations/RLS are applied;
 * this client is used for connectivity and upcoming Auth/DB wiring.
 */

function readSupabaseKey(): string | undefined {
  const publishable = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  const value = publishable || anon;
  return value?.trim() || undefined;
}

export function getSupabaseUrl(): string | undefined {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  return url?.trim() || undefined;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && readSupabaseKey());
}

let client: SupabaseClient | null = null;

/** Synchronous singleton used across the app. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(getSupabaseUrl()!, readSupabaseKey()!);
  }
  return client;
}

/** Convenience export for call sites that expect a non-null client when configured. */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const live = getSupabase();
    if (!live) {
      throw new Error(
        'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.',
      );
    }
    const value = Reflect.get(live, prop, receiver);
    return typeof value === 'function' ? value.bind(live) : value;
  },
});

/** @deprecated Prefer getSupabase(); kept for existing call sites. */
export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  return getSupabase();
}

export function getSupabaseConfigStatus(): {
  configured: boolean;
  message: string;
} {
  if (isSupabaseConfigured()) {
    return {
      configured: true,
      message:
        'Supabase is configured. Shared Auth/database tables still require applying supabase/migrations before multi-device content sync.',
    };
  }
  return {
    configured: false,
    message:
      'Supabase is not configured. Content, accounts, and notifications are stored in this browser only and will not sync across devices. See docs/BACKEND.md.',
  };
}
