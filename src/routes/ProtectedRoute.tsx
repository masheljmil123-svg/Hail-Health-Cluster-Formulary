import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/** Requires an authenticated staff account (administrator or team member). */
export function ProtectedRoute() {
  const { session, allowed } = useAuth();
  const location = useLocation();

  if (!session || !allowed('content:create')) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
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
    return <Navigate to="/workspace" replace />;
  }

  return <Outlet />;
}
