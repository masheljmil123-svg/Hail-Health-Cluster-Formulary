import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { can } from '@/config/permissions';
import type { LoginTab } from '@/config/testAccounts';
import { setContentActorLabel } from '@/services/auditActor';
import { localAuthProvider } from '@/services/authProvider';
import type { AuthSession, Permission, RoleId } from '@/types';

interface AuthContextValue {
  session: AuthSession | null;
  role: RoleId;
  signIn: (username: string, password: string) => Promise<AuthSession | null>;
  signInWithTab: (
    username: string,
    password: string,
    tab: LoginTab,
  ) => Promise<{ session: AuthSession | null; error?: string }>;
  signOut: () => Promise<void>;
  allowed: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => localAuthProvider.getSession());

  useEffect(() => {
    setContentActorLabel(session?.displayName ?? 'System', session?.userId);
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      role: session?.role ?? 'visitor',
      async signIn(username, password) {
        const next = await localAuthProvider.signIn({ username, password });
        setSession(next);
        return next;
      },
      async signInWithTab(username, password, tab) {
        const result = await localAuthProvider.signInWithTab({ username, password, tab });
        setSession(result.session);
        return result;
      },
      async signOut() {
        await localAuthProvider.signOut();
        setSession(null);
      },
      allowed(permission) {
        return can(session?.role ?? 'visitor', permission);
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
