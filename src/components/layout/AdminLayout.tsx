import {
  Bell,
  BookOpen,
  ExternalLink,
  FileText,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelsTopLeft,
  Pill,
  ScrollText,
  Search,
  Settings,
  Shield,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ClusterLogo } from '@/components/brand/ClusterLogo';
import { site } from '@/config/site';
import { useAuth } from '@/hooks/useAuth';
import { useContent } from '@/hooks/useContent';
import { cn } from '@/lib/cn';

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/drugs', label: 'Manage Drugs', icon: Pill },
  { to: '/admin/protocols', label: 'Manage Protocols', icon: FileText },
  { to: '/admin/guidelines', label: 'Manage Guidelines', icon: BookOpen },
  { to: '/admin/education', label: 'Manage Patient Education', icon: Users },
  { to: '/admin/sections', label: 'Homepage Sections', icon: PanelsTopLeft },
  { to: '/admin/media', label: 'Media Library', icon: Images },
  { to: '/admin/users', label: 'Users & Permissions', icon: Shield },
  { to: '/admin/activity', label: 'Activity Log', icon: ScrollText },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminLayout() {
  const { signOut } = useAuth();
  const { state } = useContent();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  function onSearch(event: FormEvent) {
    event.preventDefault();
    navigate(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : '/search');
  }

  async function logout() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-canvas">
      <a href="#admin-main" className="skip-link">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-white">
        <div className="flex h-[72px] items-center gap-3 px-4 lg:px-6">
          <button type="button" className="rounded-full border border-line p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open admin menu">
            <Menu size={18} />
          </button>
          <NavLink to="/" className="flex items-center gap-3">
            <ClusterLogo className="h-11 w-auto" />
            <span className="hidden h-9 w-px bg-line sm:block" />
            <span className="hidden leading-tight sm:block">
              <span className="block font-serif text-[15px] font-semibold text-navy">{site.hospitalName}</span>
              <span className="block text-xs text-primary">{site.platformName}</span>
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
          <NavLink to="/admin/activity" className="relative ml-auto rounded-full p-2 text-navy hover:bg-clinical md:ml-0" aria-label="Activity log">
            <Bell size={18} />
            {state.audit.length > 0 && (
              <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
                {Math.min(state.audit.length, 9)}
              </span>
            )}
          </NavLink>
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-clinical text-primary">
              <UserRound size={18} />
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-semibold text-navy">Administrator</span>
              <span className="block text-xs text-muted">Demo session</span>
            </span>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-[72px] hidden h-[calc(100vh-72px)] w-[272px] shrink-0 flex-col border-r border-line bg-white lg:flex">
          <Sidebar onNavigate={() => undefined} onLogout={logout} />
        </aside>
        {open && (
          <div className="fixed inset-0 z-50 bg-navy/40 lg:hidden" onClick={() => setOpen(false)}>
            <aside className="flex h-full w-[280px] flex-col bg-white" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <p className="text-sm font-semibold text-navy">Admin Panel</p>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close admin menu">
                  <X size={18} />
                </button>
              </div>
              <Sidebar onNavigate={() => setOpen(false)} onLogout={logout} />
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

function Sidebar({ onNavigate, onLogout }: { onNavigate: () => void; onLogout: () => void }) {
  return (
    <>
      <p className="px-5 pb-2 pt-5 text-xs font-semibold uppercase tracking-wide text-muted">Admin Panel</p>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Admin">
        {links.map((link) => (
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
