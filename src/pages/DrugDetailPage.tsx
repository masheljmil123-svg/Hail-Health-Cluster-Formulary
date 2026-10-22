import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PENDING_REVIEW } from '@/config/site';
import { useAuth } from '@/hooks/useAuth';
import { useContent } from '@/hooks/useContent';
import { fieldOrPending, formatDate, isPending } from '@/lib/format';
const tabs = [
  { id: 'overview', label: 'Overview', field: 'overview' },
  { id: 'dosing', label: 'Dosing', field: 'dosing' },
  { id: 'restrictions', label: 'Restrictions', field: 'restrictions' },
  { id: 'safety', label: 'Safety', field: 'safety' },
  { id: 'monitoring', label: 'Monitoring', field: 'monitoring' },
  { id: 'compatibility', label: 'Compatibility', field: 'compatibility' },
  { id: 'references', label: 'References', field: 'references' },
] as const;

type TabId = (typeof tabs)[number]['id'];

export function DrugDetailPage() {
  const { id } = useParams();
  const { state } = useContent();
  const { allowed } = useAuth();
  const [params] = useSearchParams();
  const location = useLocation();
  const [tab, setTab] = useState<TabId>('overview');
  const drug = state.drugs.find((item) => item.id === id);
  const preview = params.get('preview') === '1' && allowed('content:update');
  const back = (location.state as { search?: string } | null)?.search || `/search?q=${encodeURIComponent(drug?.genericName ?? '')}`;

  if (!drug || (drug.status !== 'published' && !preview)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-serif text-4xl text-navy">Medication not found</h1>
        <p className="mt-3 text-muted">This record is unpublished or does not exist in the demonstration library.</p>
        <Link to="/search" className="btn-primary mt-6">
          Back to search
        </Link>
      </div>
    );
  }

  const active = tabs.find((item) => item.id === tab) ?? tabs[0];

  return (
    <div className="mx-auto max-w-page px-4 py-8 sm:px-6">
      <Link to={back} className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
        <ArrowLeft size={16} />
        Back to results
      </Link>

      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
        Demonstration content — not approved for clinical use. Fields without reviewed text show “{PENDING_REVIEW}”.
      </div>

      {drug.status !== 'published' && (
        <p className="mt-3 rounded-2xl bg-clinical px-4 py-3 text-sm text-navy">Previewing a {drug.status} record. Public visitors cannot see this page.</p>
      )}

      <article className="panel mt-5 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl text-navy">{drug.genericName}</h1>
            <p className="mt-2 text-muted">{drug.brandName ? `Brand name: ${drug.brandName}` : 'No brand name recorded'}</p>
          </div>
          <StatusBadge status={drug.formularyStatus} />
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Meta label="Therapeutic class" value={drug.therapeuticClass} />
          <Meta label="Pharmacological class" value={drug.pharmacologicalClass} />
          <Meta label="Last reviewed" value={formatDate(drug.lastUpdated)} />
          <Meta label="Document version" value={drug.version} />
        </dl>

        <div className="mt-8 overflow-x-auto border-b border-line">
          <div role="tablist" aria-label="Medication sections" className="flex min-w-max gap-1">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={tab === item.id}
                aria-controls={`panel-${item.id}`}
                onClick={() => setTab(item.id)}
                className={`border-b-2 px-3 py-3 text-sm font-medium ${tab === item.id ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-navy'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div role="tabpanel" id={`panel-${active.id}`} aria-labelledby={`tab-${active.id}`} className="pt-6">
          <Monograph text={drug[active.field]} />
        </div>
      </article>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-canvas px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 font-medium text-navy">{value}</dd>
    </div>
  );
}

function Monograph({ text }: { text: string }) {
  const value = fieldOrPending(text);
  if (isPending(text)) {
    return <p className="text-base italic text-muted">{value}</p>;
  }
  return <div className="max-w-3xl whitespace-pre-wrap text-[15px] leading-7 text-ink">{value}</div>;
}
