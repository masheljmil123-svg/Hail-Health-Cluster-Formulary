import { accountsInitialized, verifyCredentials } from '@/services/accounts';
import { getSupabaseConfigStatus, isSupabaseConfigured } from '@/services/supabaseClient';
import type { AuthProvider, AuthSession } from '@/types';

const SESSION_KEY = 'kssh-formulary-session-v2';
const LEGACY_SESSION_KEY = 'kssh-formulary-demo-session';

function readSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY) ?? localStorage.getItem(LEGACY_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (!session?.userId || !session.role) return null;
    if (session.role !== 'administrator' && session.role !== 'team_member') return null;
    // Migrate legacy demo session label
    if ((session.mode as string) === 'demo') {
      session.mode = 'local';
    }
    return session;
  } catch {
    return null;
  }
}

function writeSession(session: AuthSession | null): void {
  localStorage.removeItem(LEGACY_SESSION_KEY);
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/**
 * Local multi-user authentication for development / single-browser testing.
 * Replace with Supabase Auth (or hospital IdP) for cross-device production use.
 * Frontend route guards are not sufficient authorization on their own.
 */
export const localAuthProvider: AuthProvider = {
  id: 'local',
  label: isSupabaseConfigured()
    ? 'Supabase authentication (configure client wiring)'
    : 'Local team accounts (this browser only)',
  getSession() {
    return readSession();
  },
  async signIn({ username, password }) {
    if (!accountsInitialized()) {
      return null;
    }
    const account = await verifyCredentials(username, password);
    if (!account) return null;
    const session: AuthSession = {
      userId: account.id,
      username: account.username,
      displayName: account.displayName,
      email: account.email,
      role: account.role,
      mode: 'local',
    };
    writeSession(session);
    return session;
  },
  async signOut() {
    writeSession(null);
  },
};

export function authStatusBanner(): string {
  const supabase = getSupabaseConfigStatus();
  if (supabase.configured) return supabase.message;
  if (!accountsInitialized()) {
    return 'No team accounts yet. Create the first administrator on the login page. Multi-device sync requires Supabase — see docs/BACKEND.md.';
  }
  return supabase.message;
}

export { localAuthProvider as demoAuthProvider };
