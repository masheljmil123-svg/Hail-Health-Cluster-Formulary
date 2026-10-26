import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { homePathForRole } from '@/config/roleHome';
import { useAuth } from '@/hooks/useAuth';

/**
 * Requires an authenticated content workspace role (administrator or team member).
 * Prototype navigation only — not genuine security enforcement.
 */
export function ProtectedRoute() {
  const { session, allowed } = useAuth();
  const location = useLocation();

  if (!session) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  // General staff is read-only and uses hospital selection / public formulary routes.
  if (session.role === 'staff' || !allowed('content:create')) {
    return <Navigate to={homePathForRole(session.role)} replace />;
  }

  return <Outlet />;
}

/** Administrator-only routes (approve, publish, user management). */
export function AdminOnlyRoute() {
  const { session, allowed } = useAuth();
  const location = useLocation();

  if (!session) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  if (!allowed('content:review')) {
    return <Navigate to={homePathForRole(session.role)} replace />;
  }

  return <Outlet />;
}
