import { ArrowRight, Search, X } from 'lucide-react';
import { type CSSProperties, type FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { resolveHospitalHeroVisual } from '@/config/hospitalHero';
import { isLocalAdminEnabled } from '@/config/runtime';
import { site } from '@/config/site';
import { useContent } from '@/hooks/useContent';
import { useHospital } from '@/hooks/useHospital';

export function HeroSearch({
  density = 'home',
  showIntro = true,
  hospitalName,
  subtitle,
  placeholder,
  popular = [],
}: {
  density?: 'home' | 'compact';
  showIntro?: boolean;
  hospitalName?: string;
  subtitle: string;
  placeholder: string;
  popular?: string[];
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { path, hospital } = useHospital();
  const { recordSearch } = useContent();
  const [value, setValue] = useState(() => new URLSearchParams(location.search).get('q') ?? '');
  const [photoMissing, setPhotoMissing] = useState(false);
  const showPopular = density !== 'home' && showIntro && popular.length > 0;
  const searchPath = path('/search');
  const heroVisual = resolveHospitalHeroVisual(hospital);
  const displayHospitalName = hospitalName || hospital.nameEn;

  useEffect(() => {
    setValue(new URLSearchParams(location.search).get('q') ?? '');
  }, [location.search]);

  useEffect(() => {
    setPhotoMissing(false);
  }, [heroVisual.composedHeroPath]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const query = value.trim();
    if (query && isLocalAdminEnabled()) recordSearch(query);
    const next = new URLSearchParams(location.pathname.endsWith('/search') ? location.search : '');
    if (query) next.set('q', query);
    else next.delete('q');
    const search = next.toString();
    navigate({ pathname: searchPath, search: search ? `?${search}` : '' });
  }

  return (
    <section className={density === 'home' ? 'relative pb-16' : 'relative pb-10'}>
      {/* Single pre-composited photographic hero (hospital + medication baked in) */}
      <div className="hero-visual absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="hero-visual__base absolute inset-0" />
        {photoMissing ? null : (
          <img
            key={heroVisual.composedHeroPath}
            src={heroVisual.composedHeroPath}
            alt=""
            width={2560}
            height={760}
            decoding="async"
            className="hero-composed-photo absolute inset-0 h-full w-full"
            style={
              {
                ['--hero-pos-mobile']: heroVisual.objectPosition,
                ['--hero-pos-desktop']: heroVisual.objectPositionDesktop,
              } as CSSProperties
            }
            onError={() => setPhotoMissing(true)}
          />
        )}
        {/* Light center readability veil only — no photo blending */}
        <div className="hero-visual__readability absolute inset-0" />
      </div>

      <div className={`relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 ${density === 'home' ? 'pb-8 pt-14 md:pt-16' : 'pb-2 pt-10 md:pt-12'}`}>
        {showIntro && (
          <div className="hero-copy relative mx-auto max-w-[40rem]">
            <div className="hero-copy__scrim" aria-hidden="true" />
            <div className="relative z-[1]">
              {density === 'home' ? (
                <>
                  <h1 className="hero-copy__title mx-auto max-w-[16ch] px-1 font-serif font-semibold leading-[1.15] tracking-tight sm:max-w-none">
                    {site.platformName}
                  </h1>
                  {displayHospitalName && (
                    <p className="hero-copy__hospital mt-2 font-serif">{displayHospitalName}</p>
                  )}
                </>
              ) : (
                <>
                  <h1 className="hero-copy__title font-serif font-semibold leading-tight">
                    {displayHospitalName || site.platformName}
                  </h1>
                  <p className="hero-copy__hospital mt-1 px-1 font-serif">{site.platformName}</p>
                </>
              )}
              <p className={`hero-copy__subtitle mx-auto max-w-xl leading-6 ${density === 'home' ? 'mt-3' : 'mt-4'}`}>{subtitle}</p>
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className={`relative z-[1] mx-auto max-w-3xl ${density === 'home' ? 'mt-8' : 'mt-7'}`} role="search">
          <label htmlFor="formulary-search" className="sr-only">
            Search the Hail Health Cluster Formulary
          </label>
          <div className="flex items-center gap-2 rounded-full bg-white p-2 shadow-search">
            <Search className="ml-3 shrink-0 text-slate-400" size={18} aria-hidden="true" />
            <input
              id="formulary-search"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={placeholder}
              className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-ink outline-none placeholder:text-slate-400"
            />
            {value && (
              <button
                type="button"
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-navy"
                onClick={() => setValue('')}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
            <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-primary-deep px-5 py-3 text-sm font-semibold text-white transition hover:bg-navy">
              Search
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </form>

        {showPopular && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="text-muted">Popular searches:</span>
            {popular.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => {
                  if (isLocalAdminEnabled()) recordSearch(term);
                  navigate(`${searchPath}?q=${encodeURIComponent(term)}`);
                }}
                className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-navy shadow-sm transition hover:bg-white"
              >
                {term}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
