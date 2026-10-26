import { LogOut, Menu, RefreshCcw, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ClusterLogo } from '@/components/brand/ClusterLogo';
import { isLocalAdminEnabled } from '@/config/runtime';
import { site } from '@/config/site';
import { homePathForRole } from '@/config/roleHome';
import { useAuth } from '@/hooks/useAuth';
import { useOptionalHospital } from '@/hooks/useHospital';
import { cn } from '@/lib/cn';

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const hospitalCtx = useOptionalHospital();
  const showAuthEntry = isLocalAdminEnabled();
  const homePath = hospitalCtx ? hospitalCtx.path('/') : '/';
  const workspaceHome = session ? homePathForRole(session.role) : '/login';
  const authLabel = !session
    ? 'Login'
    : session.role === 'administrator'
      ? 'Admin'
      : session.role === 'team_member'
        ? 'Workspace'
        : 'Staff';

  const links = hospitalCtx
    ? [
        { to: hospitalCtx.path('/'), label: 'Home', end: true },
        { to: hospitalCtx.path('/about'), label: 'About' },
        { to: hospitalCtx.path('/resources'), label: 'Resources' },
        { to: hospitalCtx.path('/help'), label: 'Help' },
      ]
    : [
        { to: '/', label: 'Home', end: true },
        { to: '/about', label: 'About' },
        { to: '/resources', label: 'Resources' },
        { to: '/help', label: 'Help' },
      ];

  async function logout() {
    await signOut();
    setOpen(false);
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-white/95 shadow-header backdrop-blur">
      <div className="mx-auto flex h-[76px] max-w-page items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <NavLink
          to={homePath}
          className="flex min-w-0 max-w-[min(100%,17rem)] items-center gap-3 sm:max-w-[22rem] md:max-w-none"
          onClick={() => setOpen(false)}
        >
          <ClusterLogo className="h-11 w-auto shrink-0 sm:h-12" />
          <span className="hidden h-8 w-px shrink-0 bg-line sm:block" aria-hidden="true" />
          <span className="min-w-0 leading-snug">
            <span className="block truncate font-serif text-[13px] font-semibold text-navy sm:text-[15px] md:text-[16px]">
              {site.platformName}
            </span>
            {hospitalCtx && (
              <span className="block truncate text-[11px] text-primary sm:text-xs">{hospitalCtx.hospital.nameEn}</span>
            )}
          </span>
        </NavLink>

        <nav className="ml-auto hidden items-center gap-5 text-[15px] text-ink lg:flex xl:gap-7" aria-label="Primary">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  'border-b-2 border-transparent pb-1 transition hover:text-primary',
                  isActive && 'border-primary font-medium text-primary',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
          {hospitalCtx && (
            <NavLink
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-2 text-sm font-medium text-navy transition hover:border-primary/40 hover:bg-clinical"
            >
              <RefreshCcw size={14} />
              Change Hospital
            </NavLink>
          )}
          {showAuthEntry && (
            <>
              <span className="h-6 w-px bg-line" />
              {session?.role === 'staff' ? (
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-navy transition hover:border-primary/40 hover:bg-clinical"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              ) : (
                <NavLink
                  to={session ? workspaceHome : '/login'}
                  className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-navy transition hover:border-primary/40 hover:bg-clinical"
                >
                  <UserRound size={16} />
                  {authLabel}
                </NavLink>
              )}
            </>
          )}
        </nav>

        <button
          type="button"
          className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-navy lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
          <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" className="border-t border-line bg-white px-4 py-3 lg:hidden" aria-label="Mobile">
          <div className="mb-3 px-2">
            <p className="font-serif text-base font-semibold leading-snug text-navy">{site.platformName}</p>
            {hospitalCtx && <p className="text-sm text-primary">{hospitalCtx.hospital.nameEn}</p>}
          </div>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-3 text-navy hover:bg-clinical"
            >
              {link.label}
            </NavLink>
          ))}
          {hospitalCtx && (
            <NavLink
              to="/"
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center gap-2 rounded-xl px-3 py-3 font-medium text-primary hover:bg-clinical"
            >
              <RefreshCcw size={16} />
              Change Hospital
            </NavLink>
          )}
          {showAuthEntry &&
            (session?.role === 'staff' ? (
              <button
                type="button"
                onClick={() => void logout()}
                className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left font-medium text-primary hover:bg-clinical"
              >
                <LogOut size={16} />
                Sign out
              </button>
            ) : (
              <NavLink
                to={session ? workspaceHome : '/login'}
                onClick={() => setOpen(false)}
                className="mt-1 flex items-center gap-2 rounded-xl px-3 py-3 font-medium text-primary hover:bg-clinical"
              >
                <UserRound size={16} />
                {authLabel}
              </NavLink>
            ))}
        </nav>
      )}
    </header>
  );
}
