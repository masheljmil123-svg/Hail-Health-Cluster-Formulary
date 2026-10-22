import { site } from '@/config/site';
import type { AuthProvider, AuthSession } from '@/types';

const SESSION_KEY = 'kssh-formulary-demo-session';

/**
 * Demonstration authentication provider.
 * It keeps a local session flag only. It does not store passwords, create
 * hospital accounts, or connect to an identity provider.
 * Replace this module with a server-side provider before production use.
 */
export const demoAuthProvider: AuthProvider = {
  id: 'demo',
  label: 'DEMO authentication mode',
  getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw) as AuthSession;
      if (session.mode !== 'demo' || session.role !== 'administrator') return null;
      if (session.displayName !== 'Administrator') return null;
      return session;
    } catch {
      return null;
    }
  },
  async signIn({ username, password }) {
    const normalized = username.trim().toLowerCase();
    const accepted = normalized === site.demoUsername;
    if (!accepted || password !== site.demoPassword) return null;
    const session: AuthSession = {
      userId: 'demo-administrator',
      username: site.demoUsername,
      displayName: 'Administrator',
      role: 'administrator',
      mode: 'demo',
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },
  async signOut() {
    localStorage.removeItem(SESSION_KEY);
  },
};
