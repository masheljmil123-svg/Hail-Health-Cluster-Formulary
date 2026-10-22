import { ArrowUpRight, BookOpen, FileText, Pill, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { kindLabels, type UpdateItem } from '@/services/library';
import type { FeatureAccent, FeatureIcon, HomepageSection, SearchCount } from '@/types';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';

const icons: Record<FeatureIcon, typeof Pill> = {
  pill: Pill,
  file: FileText,
  book: BookOpen,
  users: Users,
};

const accents: Record<FeatureAccent, { card: string; icon: string; arrow: string }> = {
  blue: { card: 'bg-[#f3f8fd]', icon: 'bg-[#e7f1fb] text-[#145A91]', arrow: 'border-[#d5e6f6] text-[#145A91]' },
  green: { card: 'bg-[#f3faf6]', icon: 'bg-[#e5f6ee] text-[#12815f]', arrow: 'border-[#d5efe4] text-[#12815f]' },
  amber: { card: 'bg-[#fdf8f1]', icon: 'bg-[#f8efdf] text-[#c4842a]', arrow: 'border-[#f0e3cc] text-[#c4842a]' },
  lavender: { card: 'bg-[#f7f5fc]', icon: 'bg-[#efeaf8] text-[#7A5BB5]', arrow: 'border-[#e4dcf2] text-[#7A5BB5]' },
};

const kindStyles: Record<UpdateItem['kind'], string> = {
  drug: 'bg-[#e7f1fb] text-[#145A91]',
  protocol: 'bg-[#e5f6ee] text-[#12815f]',
  guideline: 'bg-[#f8efdf] text-[#c4842a]',
  education: 'bg-[#efeaf8] text-[#7A5BB5]',
};

export function FeatureGrid({ sections }: { sections: HomepageSection[] }) {
  if (!sections.length) return null;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {sections.map((section) => {
        const accent = accents[section.accent ?? 'blue'];
        const Icon = icons[section.icon ?? 'pill'];
        return (
          <Link
            key={section.id}
            to={section.linkHref || '/resources'}
            className={cn('group relative overflow-hidden rounded-3xl p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-lift', accent.card)}
          >
            <span className={cn('absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border bg-white/80', accent.arrow)}>
              <ArrowUpRight size={16} />
            </span>
            <span className={cn('grid h-12 w-12 place-items-center rounded-2xl', accent.icon)}>
              <Icon size={22} />
            </span>
            <h2 className="mt-4 font-serif text-xl text-navy">{section.title}</h2>
            <p className="mt-1 pr-6 text-sm leading-6 text-muted">{section.description}</p>
          </Link>
        );
      })}
    </div>
  );
}

export function UpdatesPanel({ section, items }: { section: HomepageSection; items: UpdateItem[] }) {
  return (
    <section className="panel h-full min-w-0 p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-navy">{section.title}</h2>
          <p className="mt-1 text-sm text-muted">{section.description}</p>
        </div>
        {section.linkHref && (
          <Link to={section.linkHref} className="shrink-0 text-sm font-medium text-primary hover:underline">
            {section.linkLabel || 'View all'} →
          </Link>
        )}
      </div>
      <ul className="mt-5 divide-y divide-line">
        {items.length === 0 && <li className="py-6 text-sm text-muted">No published demonstration records yet.</li>}
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`}>
            <Link to={item.href} className="flex items-center gap-3 py-3.5 transition hover:bg-clinical/40">
              <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', kindStyles[item.kind])}>
                <KindIcon kind={item.kind} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">{kindLabels[item.kind]}</span>
                <span className="block truncate font-medium text-navy">{item.title}</span>
              </span>
              <time className="shrink-0 text-sm text-muted" dateTime={item.lastUpdated}>
                {formatDate(item.lastUpdated)}
              </time>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TrendingPanel({ section, counts }: { section: HomepageSection; counts: SearchCount[] }) {
  const top = [...counts].sort((a, b) => b.count - a.count).slice(0, 5);
  const max = Math.max(...top.map((item) => item.count), 1);
  return (
    <section className="panel h-full min-w-0 p-6 sm:p-7">
      <h2 className="font-serif text-2xl text-navy">{section.title}</h2>
      <p className="mt-1 text-sm text-muted">{section.description}</p>
      <p className="mt-1 text-xs text-muted">Demonstration activity stored in this browser.</p>
      <ol className="mt-5 space-y-4">
        {top.length === 0 && <li className="text-sm text-muted">Searches will appear here after visitors use the library.</li>}
        {top.map((item, index) => (
          <li key={item.term} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <span className="w-5 text-sm font-semibold text-muted">{index + 1}</span>
            <div>
              <Link to={`/search?q=${encodeURIComponent(item.term)}`} className="text-sm font-medium text-navy hover:text-primary">
                {item.term}
              </Link>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[#7eb0d8]" style={{ width: `${Math.max(8, (item.count / max) * 100)}%` }} />
              </div>
            </div>
            <span className="text-xs text-muted">{item.count} searches</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function CustomSection({ section }: { section: HomepageSection }) {
  return (
    <section className="panel p-6 sm:p-8">
      <h2 className="font-serif text-2xl text-navy">{section.title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{section.description}</p>
      {section.linkHref && (
        <Link to={section.linkHref} className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline">
          {section.linkLabel || 'Open'} →
        </Link>
      )}
    </section>
  );
}

function KindIcon({ kind }: { kind: UpdateItem['kind'] }) {
  if (kind === 'drug') return <Pill size={16} />;
  if (kind === 'protocol') return <FileText size={16} />;
  if (kind === 'guideline') return <BookOpen size={16} />;
  return <Users size={16} />;
}
