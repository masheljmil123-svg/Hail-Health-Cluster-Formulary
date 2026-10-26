import { Baby, Brain, Building2, HeartPulse, Hospital as HospitalIcon, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClusterLogo } from '@/components/brand/ClusterLogo';
import { site } from '@/config/site';
import { hospitalPhotoObjectPosition } from '@/config/hospitalHero';
import { siteAssets } from '@/config/siteAssets';
import { isLocalAdminEnabled } from '@/config/runtime';
import { homePathForRole } from '@/config/roleHome';
import { useAuth } from '@/hooks/useAuth';
import { usePortalCatalog } from '@/hooks/usePublished';
import { cn } from '@/lib/cn';
import { hospitalPath, sortedEnabledHospitals } from '@/services/hospitals';
import type { Hospital } from '@/types';

const INTRO_KEY = 'hhc-welcome-intro-seen';

const iconMap = {
  building: Building2,
  baby: Baby,
  'heart-pulse': HeartPulse,
  brain: Brain,
  hospital: HospitalIcon,
} as const;

export function WelcomePage() {
  const catalog = usePortalCatalog();
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const showAuth = isLocalAdminEnabled();
  const hospitals = sortedEnabledHospitals(catalog.hospitals);
  const [animate, setAnimate] = useState(false);
  const authHref = session ? homePathForRole(session.role) : '/login';
  const authLabel = !session
    ? 'Login'
    : session.role === 'administrator'
      ? 'Admin'
      : session.role === 'team_member'
        ? 'Workspace'
        : 'Signed in';

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const seen = sessionStorage.getItem(INTRO_KEY) === '1';
    if (reduce || seen) {
      setAnimate(false);
      sessionStorage.setItem(INTRO_KEY, '1');
      return;
    }
    setAnimate(true);
    sessionStorage.setItem(INTRO_KEY, '1');
  }, []);

  return (
    <div className={cn('welcome-page relative min-h-dvh', animate && 'welcome-page--animate')}>
      <div className="welcome-hero-bg absolute inset-0" aria-hidden="true">
        <img
          src={siteAssets.hospitalExteriorPrimary}
          alt=""
          className="welcome-hero-photo h-full w-full"
        />
        <div className="welcome-hero-overlay absolute inset-0" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(45,160,170,0.28),transparent_55%)]" />
        <div className="welcome-rx-pattern absolute inset-0 opacity-[0.14]" />
      </div>

      <div className="welcome-shell relative z-10 mx-auto flex min-h-dvh w-full flex-col">
        <header className="welcome-anim welcome-anim--logo welcome-header flex items-center justify-between gap-3">
          <div className="welcome-brand-pill inline-flex min-w-0 max-w-[min(100%,20rem)] items-center gap-2.5 rounded-2xl bg-white/90 px-2.5 py-1.5 shadow-sm backdrop-blur sm:max-w-none sm:gap-3 sm:px-3 sm:py-2">
            <ClusterLogo className="welcome-logo h-9 w-auto shrink-0 sm:h-11 md:h-12" />
            <span className="hidden h-7 w-px shrink-0 bg-line sm:block" aria-hidden="true" />
            <span className="welcome-platform-title hidden min-w-0 truncate font-serif font-semibold text-navy sm:block">
              {site.platformName}
            </span>
          </div>
          {showAuth && (
            <div className="flex shrink-0 items-center gap-2">
              {session?.role === 'staff' ? (
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    navigate('/');
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/85 px-3 py-2 text-sm font-medium text-navy shadow-sm backdrop-blur transition hover:bg-white sm:px-4"
                >
                  <LogOut size={14} aria-hidden="true" />
                  Sign out
                </button>
              ) : (
                <Link
                  to={authHref}
                  className="rounded-full border border-white/50 bg-white/85 px-3.5 py-2 text-sm font-medium text-navy shadow-sm backdrop-blur transition hover:bg-white sm:px-4"
                >
                  {authLabel}
                </Link>
              )}
            </div>
          )}
        </header>

        <div className="welcome-content mx-auto flex w-full flex-1 flex-col text-center">
          <p className="welcome-anim welcome-anim--brand welcome-eyebrow font-semibold uppercase tracking-[0.18em] text-teal-100/95">
            {site.platformName}
          </p>
          <h1 className="welcome-anim welcome-anim--title welcome-title mt-3 font-serif font-semibold leading-tight text-white drop-shadow-sm sm:mt-4">
            Welcome to Hail Health Cluster
          </h1>
          <p className="welcome-anim welcome-anim--subtitle welcome-subtitle mx-auto mt-3 max-w-xl leading-relaxed text-sky-50/95 sm:mt-4">
            One Cluster. Multiple Hospitals. One Formulary.
          </p>

          <div className="welcome-anim welcome-anim--cards welcome-select mt-8 text-left sm:mt-10 lg:mt-12">
            <h2 className="welcome-select-heading text-center font-serif text-white">Select Your Hospital</h2>

            <div className="welcome-hospital-grid mt-6 sm:mt-8" role="list">
              {hospitals.map((hospital, index) => (
                <div key={hospital.id} className="welcome-hospital-cell" role="listitem">
                  <HospitalCard hospital={hospital} index={index} />
                </div>
              ))}
            </div>
            {hospitals.length === 0 && (
              <p className="mt-8 rounded-2xl bg-white/90 px-4 py-6 text-center text-sm text-navy">
                No hospitals are enabled yet. Configure hospitals in the local admin workspace, then export to the published
                catalog.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HospitalCard({ hospital, index }: { hospital: Hospital; index: number }) {
  const Icon = iconMap[hospital.iconKey ?? 'building'] ?? Building2;
  const hasPhoto = Boolean(hospital.imagePath);
  const objectPosition = hospitalPhotoObjectPosition(hospital.slug);

  return (
    <Link
      to={hospitalPath(hospital.slug)}
      className="welcome-card group relative flex h-full w-full flex-col overflow-hidden rounded-[1.75rem] border border-white/40 bg-white/95 shadow-lift outline-none transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(11,42,80,0.22)] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
      style={{ animationDelay: `${0.55 + index * 0.08}s` }}
    >
      <div className="welcome-card-media relative overflow-hidden">
        {hasPhoto ? (
          <img
            src={hospital.imagePath}
            alt=""
            width={640}
            height={360}
            decoding="async"
            className="welcome-card-photo absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            style={{ objectPosition }}
          />
        ) : (
          <div
            className={cn(
              'absolute inset-0 flex items-end justify-between bg-gradient-to-br p-4',
              index % 2 === 0 ? 'from-[#0c3a6e] via-[#145a91] to-[#1a8a8f]' : 'from-[#0f4c5c] via-[#167a86] to-[#2a6f97]',
            )}
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 text-white backdrop-blur">
              <Icon size={22} />
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy/55 via-navy/10 to-transparent" />
      </div>
      <div className="flex flex-1 flex-col px-4 py-4 sm:px-5 sm:py-5">
        <h3 className="welcome-card-title font-serif leading-snug text-navy">{hospital.nameEn}</h3>
        {hospital.nameAr && (
          <p className="welcome-card-ar mt-1 font-arabic text-muted" dir="rtl" lang="ar">
            {hospital.nameAr}
          </p>
        )}
        <span className="welcome-card-cta mt-auto inline-flex min-h-11 items-center gap-2 pt-4 text-sm font-semibold text-primary transition group-hover:gap-3">
          View Formulary
          <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}
