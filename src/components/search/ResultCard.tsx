import { ArrowRight, Pill, Route, Tag } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MedicationAlertBadge } from '@/components/ui/MedicationAlertBadge';
import { SafetyBadges } from '@/components/ui/SafetyBadges';
import { useHospital } from '@/hooks/useHospital';
import { formatDate } from '@/lib/format';
import { formulationSummary } from '@/services/search';
import type { Drug, SafetyFlag } from '@/types';

export function ResultCard({ drug, index }: { drug: Drug; index: number }) {
  const location = useLocation();
  const { path } = useHospital();
  const drugHref = path(`/drugs/${drug.id}`);
  const brands = drug.brandNames?.length ? drug.brandNames.join(', ') : '—';
  const formulations = formulationSummary(drug);
  const routes = [...new Set(drug.formulations.map((item) => item.route).filter(Boolean))];

  return (
    <article className="rounded-2xl border border-[#e6eef6] bg-[#f8fbfe] p-4 shadow-sm sm:p-5">
      <div className="flex gap-3 sm:gap-4">
        <div className="pt-1 text-sm font-semibold text-slate-400">{index}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-serif text-2xl text-navy">
                <Link to={drugHref} state={{ search: `${location.pathname}${location.search}` }} className="hover:text-primary">
                  {drug.genericName}
                </Link>
              </h2>
              <p className="mt-0.5 text-sm text-muted">{drug.therapeuticClass || 'Therapeutic class pending'}</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <MedicationAlertBadge classification={drug.publishedAlertClassification} />
              <SafetyBadges
                flags={drug.safetyFlags.filter((flag): flag is SafetyFlag => flag === 'lasa' || flag === 'hazardous')}
                boxedWarning={drug.hasBoxedWarning}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px] md:gap-8">
            <dl className="space-y-2 text-sm">
              <Row icon={<Tag size={14} />} label="Brand names" value={brands} />
              <div className="flex gap-2 text-ink">
                <span className="mt-0.5 text-slate-400">
                  <Pill size={14} />
                </span>
                <div className="min-w-0">
                  <dt className="text-xs text-muted">Available formulations</dt>
                  <dd>
                    {formulations.length ? (
                      <ul className="mt-0.5 list-disc space-y-0.5 pl-4">
                        {formulations.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
              </div>
              <Row icon={<Route size={14} />} label="Routes" value={routes.join(', ') || '—'} />
            </dl>
            <div className="flex items-start justify-between gap-4 border-t border-line pt-3 text-sm md:block md:border-l md:border-t-0 md:pl-6 md:pt-0">
              <div>
                <p className="text-xs text-muted">Last reviewed</p>
                <p className="font-medium text-navy">{formatDate(drug.lastReviewedAt || drug.lastUpdated)}</p>
                <p className="mt-3 text-xs text-muted">Version</p>
                <p className="font-medium text-navy">{drug.version}</p>
              </div>
              <Link
                to={drugHref}
                state={{ search: `${location.pathname}${location.search}` }}
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline md:mt-4"
              >
                View Monograph
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
