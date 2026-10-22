import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { can } from '@/config/permissions';
import { demoAuthProvider } from '@/services/authProvider';
import type { AuthSession, Permission, RoleId } from '@/types';

interface AuthContextValue {
  session: AuthSession | null;
  role: RoleId;
  signIn: (username: string, password: string) => Promise<AuthSession | null>;
  signOut: () => Promise<void>;
  allowed: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => demoAuthProvider.getSession());

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      role: session?.role ?? 'visitor',
      async signIn(username, password) {
        const next = await demoAuthProvider.signIn({ username, password });
        setSession(next);
        return next;
      },
      async signOut() {
        await demoAuthProvider.signOut();
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
