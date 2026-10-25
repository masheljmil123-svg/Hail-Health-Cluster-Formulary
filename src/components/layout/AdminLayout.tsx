import {
  Bell,
  BookOpen,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Images,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelsTopLeft,
  Pill,
  Ribbon,
  ScrollText,
  Search,
  Settings,
  Shield,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ClusterLogo } from '@/components/brand/ClusterLogo';
import { site } from '@/config/site';
import { useAuth } from '@/hooks/useAuth';
import { useContent } from '@/hooks/useContent';
import { cn } from '@/lib/cn';
import { notificationsForUser, unreadCount } from '@/services/notifications';
import { getSupabaseConfigStatus } from '@/services/supabaseClient';

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean; adminOnly?: boolean };

const links: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true, adminOnly: true },
  { to: '/admin/review-requests', label: 'Review Requests', icon: ClipboardCheck, adminOnly: true },
  { to: '/workspace', label: 'My Workspace', icon: UserRound },
  { to: '/admin/drugs', label: 'Manage Drugs', icon: Pill },
  { to: '/admin/therapeutic-classes', label: 'Therapeutic Classes', icon: Layers, adminOnly: true },
  { to: '/admin/protocols', label: 'Manage Protocols', icon: FileText },
  { to: '/admin/guidelines', label: 'Manage Guidelines', icon: BookOpen },
  { to: '/admin/chemotherapy', label: 'Manage Chemotherapy', icon: Ribbon },
  { to: '/admin/education', label: 'Manage Counseling Materials', icon: Users },
  { to: '/admin/sections', label: 'Homepage Sections', icon: PanelsTopLeft, adminOnly: true },
  { to: '/admin/media', label: 'Media Library', icon: Images, adminOnly: true },
  { to: '/admin/users', label: 'Users & Permissions', icon: Shield, adminOnly: true },
  { to: '/admin/activity', label: 'Activity Log', icon: ScrollText, adminOnly: true },
  { to: '/admin/settings', label: 'Settings', icon: Settings, adminOnly: true },
];

export function AdminLayout() {
  const { signOut, session, allowed } = useAuth();
  const { state } = useContent();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [showNotifs, setShowNotifs] = useState(false);
  const isAdmin = allowed('content:review');
  const pendingReviews = useMemo(
    () =>
      [
        ...state.drugs,
        ...state.protocols,
        ...state.guidelines,
        ...state.education,
        ...state.chemotherapy,
      ].filter((item) => item.status === 'pending-review').length,
    [state],
  );
  const unread = session ? unreadCount(session.userId) : 0;
  const notifs = session ? notificationsForUser(session.userId).slice(0, 8) : [];
  const backend = getSupabaseConfigStatus();

  function onSearch(event: FormEvent) {
    event.preventDefault();
    navigate(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : '/search');
  }

  async function logout() {
    await signOut();
    navigate('/');
  }

  const visibleLinks = links.filter((link) => !link.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-canvas">
      <a href="#admin-main" className="skip-link">
        Skip to content
      </a>
      {!backend.configured && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-950 sm:text-sm">
          Multi-device team workflow requires Supabase configuration. Content and notifications are stored in this browser only.
          See docs/BACKEND.md.
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-line bg-white">
        <div className="flex h-[72px] items-center gap-3 px-4 lg:px-6">
          <button type="button" className="rounded-full border border-line p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open admin menu">
            <Menu size={18} />
          </button>
          <NavLink to="/" className="flex min-w-0 max-w-[min(100%,16rem)] items-center gap-3 sm:max-w-[20rem] lg:max-w-none">
            <ClusterLogo className="h-11 w-auto shrink-0" />
            <span className="hidden h-8 w-px shrink-0 bg-line sm:block" aria-hidden="true" />
            <span className="min-w-0 font-serif text-[13px] font-semibold leading-snug text-navy sm:text-[15px]">
              {site.platformName}
            </span>
          </NavLink>
          <form onSubmit={onSearch} className="mx-auto hidden max-w-md flex-1 md:block" role="search">
            <label htmlFor="admin-search" className="sr-only">
              Search in formulary
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
              <input
                id="admin-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search in formulary..."
                className="w-full rounded-full border border-line bg-canvas py-2 pl-10 pr-4 text-sm outline-none focus:border-primary"
              />
            </div>
          </form>
          <div className="relative ml-auto md:ml-0">
            <button
              type="button"
              className="relative rounded-full p-2 text-navy hover:bg-clinical"
              aria-label="Notifications"
              onClick={() => setShowNotifs((v) => !v)}
            >
              <Bell size={18} />
              {(unread > 0 || (isAdmin && pendingReviews > 0)) && (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
                  {Math.min(unread || pendingReviews, 9)}
                </span>
              )}
            </button>
            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-line bg-white p-3 shadow-lift">
                <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted">Notifications</p>
                <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto">
                  {notifs.length === 0 && <li className="px-2 py-4 text-sm text-muted">No notifications.</li>}
                  {notifs.map((n) => (
                    <li key={n.id}>
                      <Link to={n.href} className="block rounded-xl px-2 py-2 hover:bg-clinical" onClick={() => setShowNotifs(false)}>
                        <p className="text-sm font-medium text-navy">{n.title}</p>
                        <p className="text-xs text-muted">{n.message}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
                {isAdmin && (
                  <Link
                    to="/admin/review-requests"
                    className="mt-2 block rounded-xl bg-clinical px-3 py-2 text-center text-sm font-medium text-primary"
                    onClick={() => setShowNotifs(false)}
                  >
                    Review requests ({pendingReviews})
                  </Link>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-clinical text-primary">
              <UserRound size={18} />
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-semibold text-navy">{session?.displayName ?? 'Staff'}</span>
              <span className="block text-xs text-muted">{session?.role === 'administrator' ? 'Administrator' : 'Team Member'}</span>
            </span>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-[72px] hidden h-[calc(100vh-72px)] w-[272px] shrink-0 flex-col border-r border-line bg-white lg:flex">
          <Sidebar links={visibleLinks} onNavigate={() => undefined} onLogout={logout} isAdmin={isAdmin} />
        </aside>
        {open && (
          <div className="fixed inset-0 z-50 bg-navy/40 lg:hidden" onClick={() => setOpen(false)}>
            <aside className="flex h-full w-[280px] flex-col bg-white" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <p className="text-sm font-semibold text-navy">{isAdmin ? 'Admin Panel' : 'Team Workspace'}</p>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close admin menu">
                  <X size={18} />
                </button>
              </div>
              <Sidebar links={visibleLinks} onNavigate={() => setOpen(false)} onLogout={logout} isAdmin={isAdmin} />
            </aside>
          </div>
        )}
        <main id="admin-main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Sidebar({
  links: navLinks,
  onNavigate,
  onLogout,
  isAdmin,
}: {
  links: NavItem[];
  onNavigate: () => void;
  onLogout: () => void;
  isAdmin: boolean;
}) {
  return (
    <>
      <p className="px-5 pb-2 pt-5 text-xs font-semibold uppercase tracking-wide text-muted">{isAdmin ? 'Admin Panel' : 'Team Panel'}</p>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Staff navigation">
        {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink transition hover:bg-clinical',
                isActive && 'bg-clinical font-semibold text-primary',
              )
            }
          >
            <link.icon size={16} />
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-2 border-t border-line p-4">
        <NavLink to="/" onClick={onNavigate} className="btn-secondary w-full">
          <ExternalLink size={15} />
          View Public Site
        </NavLink>
        <button type="button" onClick={onLogout} className="btn w-full text-muted hover:bg-rose-50 hover:text-rose-700">
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </>
  );
}
