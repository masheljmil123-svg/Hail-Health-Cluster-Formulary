import { ArrowRight, Search, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HospitalPhoto } from '@/components/brand/HospitalPhoto';
import { HeroArt } from '@/components/home/HeroArt';
import { site } from '@/config/site';
import { useContent } from '@/hooks/useContent';

export function HeroSearch({
  density = 'home',
  showIntro = true,
  subtitle,
  placeholder,
  popular,
}: {
  density?: 'home' | 'compact';
  showIntro?: boolean;
  subtitle: string;
  placeholder: string;
  popular: string[];
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { recordSearch } = useContent();
  const [value, setValue] = useState(() => new URLSearchParams(location.search).get('q') ?? '');

  useEffect(() => {
    setValue(new URLSearchParams(location.search).get('q') ?? '');
  }, [location.search]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const query = value.trim();
    if (query) recordSearch(query);
    const next = new URLSearchParams(location.pathname === '/search' ? location.search : '');
    if (query) next.set('q', query);
    else next.delete('q');
    const search = next.toString();
    navigate({ pathname: '/search', search: search ? `?${search}` : '' });
  }

  return (
    <section className={density === 'home' ? 'relative pb-20' : 'relative pb-10'}>
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-r from-[#d4e9f7] via-[#eef6fc] to-[#e7f3fb]" />
        <div className="absolute inset-y-0 left-0 w-[68%] sm:w-[60%]">
          <HospitalPhoto variant="primary" decorative className="hero-photo h-full w-full" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(234,244,252,0)_0%,rgba(234,244,252,0.05)_22%,rgba(238,246,252,0.82)_42%,rgba(239,247,252,0.94)_68%,rgba(226,239,248,0.7)_100%)]" />
        <HeroArt />
      </div>

      <div className={`relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 ${density === 'home' ? 'pb-6 pt-14 md:pt-16' : 'pb-2 pt-10 md:pt-12'}`}>
        {showIntro && (
          <>
            <h1 className="font-serif text-[2rem] font-semibold leading-tight text-navy sm:text-5xl">
              {site.hospitalName}
            </h1>
            <p className="mt-1 font-serif text-2xl text-navy/90 sm:text-[2rem]">{site.platformName}</p>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-ink/80 sm:text-[15px]">{subtitle}</p>
          </>
        )}

        <form onSubmit={onSubmit} className="mx-auto mt-7 max-w-3xl" role="search">
          <label htmlFor="formulary-search" className="sr-only">
            Search the formulary library
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

        {showIntro && popular.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="text-muted">Popular searches:</span>
            {popular.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => {
                  recordSearch(term);
                  navigate(`/search?q=${encodeURIComponent(term)}`);
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
