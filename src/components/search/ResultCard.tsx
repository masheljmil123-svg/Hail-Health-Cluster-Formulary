import { ArrowRight, Pill, Tag } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/format';
import type { Drug } from '@/types';

export function ResultCard({ drug, index }: { drug: Drug; index: number }) {
  const location = useLocation();
  return (
    <article className="rounded-2xl border border-[#e6eef6] bg-[#f8fbfe] p-4 shadow-sm sm:p-5">
      <div className="flex gap-3 sm:gap-4">
        <div className="pt-1 text-sm font-semibold text-slate-400">{index}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl text-navy">
                <Link to={`/drugs/${drug.id}`} state={{ search: `${location.pathname}${location.search}` }} className="hover:text-primary">
                  {drug.genericName}
                </Link>
              </h2>
              <p className="mt-0.5 text-sm text-muted">
                {drug.pharmacologicalClass}
                <span className="px-1.5 text-slate-300">|</span>
                {drug.therapeuticClass}
              </p>
            </div>
            <StatusBadge status={drug.formularyStatus} />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px] md:gap-8">
            <dl className="space-y-2 text-sm">
              <Row icon={<Tag size={14} />} label="Brand name" value={drug.brandName || '—'} />
              <Row icon={<Pill size={14} />} label="Available formulations" value={drug.formulations.join('; ') || '—'} />
              <div>
                <dt className="text-xs font-medium text-muted">Main indications</dt>
                <dd className="mt-0.5 leading-6 text-ink">{drug.indicationsSummary}</dd>
              </div>
            </dl>
            <div className="flex items-start justify-between gap-4 border-t border-line pt-3 text-sm md:block md:border-l md:border-t-0 md:pl-6 md:pt-0">
              <div>
                <p className="text-xs text-muted">Last updated</p>
                <p className="font-medium text-navy">{formatDate(drug.lastUpdated)}</p>
                <p className="mt-3 text-xs text-muted">Version</p>
                <p className="font-medium text-navy">{drug.version}</p>
              </div>
              <Link
                to={`/drugs/${drug.id}`}
                state={{ search: `${location.pathname}${location.search}` }}
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline md:mt-4"
              >
                View details
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Row({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-2 text-ink">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div>
        <dt className="text-xs text-muted">{label}</dt>
        <dd>{value}</dd>
      </div>
    </div>
  );
}
