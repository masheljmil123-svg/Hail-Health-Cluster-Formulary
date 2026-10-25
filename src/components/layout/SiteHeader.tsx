import { Menu, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { site } from '@/config/site';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/cn';
import { ClusterLogo } from '@/components/brand/ClusterLogo';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/resources', label: 'Resources' },
  { to: '/help', label: 'Help' },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { session } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-white/95 shadow-header backdrop-blur">
      <div className="mx-auto flex h-[76px] max-w-page items-center gap-4 px-4 sm:px-6">
        <NavLink to="/" className="flex min-w-0 max-w-[min(100%,18rem)] items-center gap-3 sm:max-w-[22rem] md:max-w-none" onClick={() => setOpen(false)}>
          <ClusterLogo className="h-11 w-auto shrink-0 sm:h-12" />
          <span className="hidden h-8 w-px shrink-0 bg-line sm:block" aria-hidden="true" />
          <span className="min-w-0 font-serif text-[13px] font-semibold leading-snug text-navy sm:text-[15px] md:text-[16px]">
            {site.platformName}
          </span>
        </NavLink>

        <nav className="ml-auto hidden items-center gap-7 text-[15px] text-ink lg:flex" aria-label="Primary">
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
          <span className="h-6 w-px bg-line" />
          <NavLink
            to={session ? '/admin' : '/login'}
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-navy transition hover:border-primary/40 hover:bg-clinical"
          >
            <UserRound size={16} />
            {session ? 'Admin' : 'Login'}
          </NavLink>
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
          <NavLink
            to={session ? '/admin' : '/login'}
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2 rounded-xl px-3 py-3 font-medium text-primary hover:bg-clinical"
          >
            <UserRound size={16} />
            {session ? 'Admin' : 'Login'}
          </NavLink>
        </nav>
      )}
    </header>
  );
}
