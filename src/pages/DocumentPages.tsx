import { ArrowLeft, BookOpen, FileText } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { DocumentAttachments } from '@/components/documents/DocumentAttachments';
import { PENDING_REVIEW } from '@/config/site';
import { useAuth } from '@/hooks/useAuth';
import { useContent } from '@/hooks/useContent';
import { fieldOrPending, formatDate, isPending } from '@/lib/format';
import { collectionFor } from '@/services/library';
import type { DocumentKind, LibraryDocument } from '@/types';

const copy: Record<DocumentKind, { eyebrow: string; title: string; base: string }> = {
  protocol: { eyebrow: 'Protocols', title: 'Therapeutic protocols and pathways', base: '/protocols' },
  guideline: { eyebrow: 'Guidelines', title: 'Clinical practice guidelines', base: '/guidelines' },
  education: {
    eyebrow: 'Patient Counseling Materials',
    title: 'Patient counseling materials',
    base: '/education',
  },
  chemotherapy: {
    eyebrow: 'Chemotherapy Protocols',
    title: 'Chemotherapy protocol library',
    base: '/chemotherapy-protocols',
  },
};

export function ProtocolsGuidelinesPage() {
  const { state } = useContent();
  const protocols = collectionFor(state, 'protocol')
    .filter((item) => item.status === 'published')
    .sort((a, b) => a.title.localeCompare(b.title));
  const guidelines = collectionFor(state, 'guideline')
    .filter((item) => item.status === 'published')
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="mx-auto max-w-page px-4 py-10 sm:px-6">
      <p className="text-sm font-medium text-primary">Protocols & Guidelines</p>
      <h1 className="mt-2 font-serif text-4xl text-navy">Protocols and clinical guidelines</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        Protocols and guidelines remain separate collections. Only administrator-approved and published documents appear here.
      </p>

      <DocumentSection
        id="protocols"
        title="Protocols"
        description="Therapeutic protocols and pathways."
        icon={<FileText size={18} />}
        accent="bg-[#e5f6ee] text-[#12815f]"
        base="/protocols"
        items={protocols}
      />
      <DocumentSection
        id="guidelines"
        title="Guidelines"
        description="Clinical practice guidelines and evidence-based resources."
        icon={<BookOpen size={18} />}
        accent="bg-[#f8efdf] text-[#c4842a]"
        base="/guidelines"
        items={guidelines}
      />
    </div>
  );
}

function DocumentSection({
  id,
  title,
  description,
  icon,
  accent,
  base,
  items,
}: {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  accent: string;
  base: string;
  items: LibraryDocument[];
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-24">
      <div className="mb-4 flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${accent}`}>{icon}</span>
        <div>
          <h2 className="font-serif text-2xl text-navy">{title}</h2>
          <p className="text-sm text-muted">{description}</p>
        </div>
      </div>
      <div className="space-y-3">
        {items.length === 0 && (
          <div className="panel p-8 text-center">
            <p className="font-serif text-xl text-navy">No documents available yet.</p>
            <p className="mt-2 text-sm text-muted">Approved documents will appear here once published.</p>
          </div>
        )}
        {items.map((item) => (
          <Link key={item.id} to={`${base}/${item.id}`} className="panel block p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-serif text-xl text-navy">{item.title}</h3>
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
    </section>
  );
}

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
        Only administrator-approved and published documents are listed. Draft and pending-review files are not publicly accessible.
      </p>
      <div className="mt-8 space-y-3">
        {items.length === 0 && (
          <div className="panel p-10 text-center">
            <p className="font-serif text-2xl text-navy">No documents available yet.</p>
            <p className="mt-2 text-sm text-muted">Approved materials will appear here once published.</p>
          </div>
        )}
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
        <p className="mt-3 text-muted">This record is unpublished or does not exist.</p>
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
        <h2 className="mt-8 font-serif text-2xl text-navy">Documents & links</h2>
        <DocumentAttachments document={item} />
        {(kind === 'education' || item.body.trim()) && (
          <>
            <h2 className="mt-8 font-serif text-2xl text-navy">Document text</h2>
            {isPending(item.body) ? (
              <p className="mt-3 italic text-muted">{fieldOrPending(item.body) || PENDING_REVIEW}</p>
            ) : (
              <div className="mt-3 whitespace-pre-wrap leading-7 text-ink">{item.body}</div>
            )}
          </>
        )}
      </article>
    </div>
  );
}
