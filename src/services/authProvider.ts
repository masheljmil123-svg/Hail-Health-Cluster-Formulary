import type { LoginTab } from '@/config/testAccounts';
import { accountsInitialized, verifyCredentials } from '@/services/accounts';
import type { AuthProvider, AuthSession, RoleId } from '@/types';

const SESSION_KEY = 'kssh-formulary-session-v2';
const LEGACY_SESSION_KEY = 'kssh-formulary-demo-session';

const SESSION_ROLES: RoleId[] = ['administrator', 'team_member', 'staff'];

function readSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY) ?? localStorage.getItem(LEGACY_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (!session?.userId || !session.role) return null;
    if (!SESSION_ROLES.includes(session.role)) return null;
    if ((session.mode as string) === 'demo' || (session.mode as string) === 'supabase') {
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
 * Local prototype authentication for role-based UI evaluation.
 * Test credentials are public frontend constants — not real security.
 * Optional legacy localStorage workspace accounts still work for admin/team.
 */
export const localAuthProvider: AuthProvider & {
  signInWithTab: (input: {
    username: string;
    password: string;
    tab: LoginTab;
  }) => Promise<{ session: AuthSession | null; error?: string }>;
} = {
  id: 'local',
  label: 'Local evaluation accounts (this browser only)',
  getSession() {
    return readSession();
  },
  async signIn({ username, password }) {
    const result = await this.signInWithTab({ username, password, tab: 'admin-team' });
    if (result.session) return result.session;
    const staff = await this.signInWithTab({ username, password, tab: 'staff' });
    return staff.session;
  },
  async signInWithTab({ username, password, tab }) {
    if (!(import.meta.env.DEV || import.meta.env.VITE_ENABLE_LOCAL_ADMIN === 'true')) {
      return { session: null, error: 'Sign-in is not available on the public website.' };
    }

    const { findTestAccount } = await import('@/config/testAccounts');
    const test = findTestAccount(username, password);
    if (test) {
      if (test.tab !== tab) {
        return {
          session: null,
          error:
            tab === 'staff'
              ? 'This account belongs under Admin & Team Login. Switch tabs and try again.'
              : 'This account belongs under General Staff Login. Switch tabs and try again.',
        };
      }
      const session: AuthSession = {
        userId: test.userId,
        username: test.username,
        displayName: test.displayName,
        role: test.role,
        mode: 'local',
      };
      writeSession(session);
      return { session };
    }

    // Legacy browser-local accounts (admin/team only) — never for staff tab.
    if (tab === 'staff') {
      return { session: null, error: 'Credentials were not recognized.' };
    }

    if (!accountsInitialized()) {
      return {
        session: null,
        error: 'Credentials were not recognized. Use the documented test accounts below.',
      };
    }

    const account = await verifyCredentials(username, password);
    if (!account) {
      return { session: null, error: 'Credentials were not recognized, or the account is disabled.' };
    }

    const session: AuthSession = {
      userId: account.id,
      username: account.username,
      displayName: account.displayName,
      email: account.email,
      role: account.role,
      mode: 'local',
    };
    writeSession(session);
    return { session };
  },
  async signOut() {
    writeSession(null);
  },
};

export function authStatusBanner(): string {
  return 'Prototype sign-in for role-based UI evaluation on this device. Test credentials are not real security. Local drafts stay in this browser; export approved content to update the public GitHub Pages catalog.';
}

export { localAuthProvider as demoAuthProvider };
