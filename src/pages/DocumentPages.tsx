import { ArrowLeft } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PENDING_REVIEW } from '@/config/site';
import { useAuth } from '@/hooks/useAuth';
import { useContent } from '@/hooks/useContent';
import { fieldOrPending, formatDate, isPending } from '@/lib/format';
import { collectionFor } from '@/services/library';
import type { DocumentKind } from '@/types';

const copy: Record<DocumentKind, { eyebrow: string; title: string; base: string }> = {
  protocol: { eyebrow: 'Protocols', title: 'Therapeutic protocols and pathways', base: '/protocols' },
  guideline: { eyebrow: 'Guidelines', title: 'Clinical practice guidelines', base: '/guidelines' },
  education: { eyebrow: 'Patient Education', title: 'Patient information and counseling materials', base: '/education' },
};

export function DocumentListPage({ kind }: { kind: DocumentKind }) {
  const { state } = useContent();
  const items = collectionFor(state, kind)
    .filter((item) => item.status === 'published')
    .sort((a, b) => a.title.localeCompare(b.title));
  const meta = copy[kind];

  return (
    <div className="mx-auto max-w-page px-4 py-10 sm:px-6">
      <p className="text-sm font-medium text-primary">{meta.eyebrow}</p>
      <h1 className="mt-2 font-serif text-4xl text-navy">{meta.title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        Demonstration records only. They are not approved hospital documents and are not for clinical use.
      </p>
      <div className="mt-8 space-y-3">
        {items.length === 0 && <div className="panel p-8 text-sm text-muted">No published records in this collection.</div>}
        {items.map((item) => (
          <Link key={item.id} to={`${meta.base}/${item.id}`} className="panel block p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl text-navy">{item.title}</h2>
                <p className="mt-1 text-sm text-muted">
                  {item.category} · {item.language} · Version {item.version}
                </p>
              </div>
              <time className="text-sm text-muted" dateTime={item.lastUpdated}>
                {formatDate(item.lastUpdated)}
              </time>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink">{item.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function DocumentDetailPage({ kind }: { kind: DocumentKind }) {
  const { id } = useParams();
  const { state } = useContent();
  const { allowed } = useAuth();
  const [params] = useSearchParams();
  const meta = copy[kind];
  const item = collectionFor(state, kind).find((entry) => entry.id === id);
  const preview = params.get('preview') === '1' && allowed('content:update');

  if (!item || (item.status !== 'published' && !preview)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-serif text-4xl text-navy">Record not found</h1>
        <p className="mt-3 text-muted">This demonstration record is unpublished or does not exist.</p>
        <Link to={meta.base} className="btn-primary mt-6">
          Back to {meta.eyebrow.toLowerCase()}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link to={meta.base} className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
        <ArrowLeft size={16} />
        Back to {meta.eyebrow.toLowerCase()}
      </Link>
      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
        Demonstration content — not approved for clinical use.
      </div>
      {item.status !== 'published' && (
        <p className="mt-3 rounded-2xl bg-clinical px-4 py-3 text-sm text-navy">Previewing a {item.status} record.</p>
      )}
      <article className="panel mt-5 p-6 sm:p-8">
        <p className="text-sm font-medium text-primary">{meta.eyebrow}</p>
        <h1 className="mt-2 font-serif text-4xl text-navy">{item.title}</h1>
        <p className="mt-3 text-sm text-muted">
          {item.category} · {item.language} · Version {item.version} · {formatDate(item.lastUpdated)}
        </p>
        <p className="mt-6 leading-7 text-ink">{item.summary}</p>
        <h2 className="mt-8 font-serif text-2xl text-navy">Document text</h2>
        {isPending(item.body) ? (
          <p className="mt-3 italic text-muted">{fieldOrPending(item.body) || PENDING_REVIEW}</p>
        ) : (
          <div className="mt-3 whitespace-pre-wrap leading-7 text-ink">{item.body}</div>
        )}
      </article>
    </div>
  );
}
