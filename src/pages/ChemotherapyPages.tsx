import { ArrowLeft, FileText, Filter, Ribbon, Search } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { DocumentAttachments } from '@/components/documents/DocumentAttachments';
import { PENDING_REVIEW } from '@/config/site';
import { useAuth } from '@/hooks/useAuth';
import { useContent } from '@/hooks/useContent';
import { fieldOrPending, formatDate, isPending } from '@/lib/format';

export function ChemotherapyProtocolsPage() {
  const { state } = useContent();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const category = params.get('category') ?? 'all';
  const [draft, setDraft] = useState(query);

  const published = useMemo(
    () => state.chemotherapy.filter((item) => item.status === 'published'),
    [state.chemotherapy],
  );
  const categories = useMemo(
    () => [...new Set(published.map((item) => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [published],
  );
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return published
      .filter((item) => (category === 'all' ? true : item.category === category))
      .filter((item) => {
        if (!needle) return true;
        return `${item.title} ${item.summary} ${item.category} ${item.body} ${item.references ?? ''}`
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [published, query, category]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams(params);
    if (draft.trim()) next.set('q', draft.trim());
    else next.delete('q');
    setParams(next, { replace: true });
  }

  function setCategory(value: string) {
    const next = new URLSearchParams(params);
    if (value === 'all') next.delete('category');
    else next.set('category', value);
    setParams(next, { replace: true });
  }

  return (
    <div className="mx-auto max-w-page px-4 py-10 sm:px-6">
      <p className="text-sm font-medium text-[#d97757]">Chemotherapy Protocols</p>
      <h1 className="mt-2 font-serif text-4xl text-navy">Chemotherapy protocol library</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        Only administrator-approved and published chemotherapy protocol documents appear here.
      </p>

      <form onSubmit={onSearch} className="mt-8 flex flex-col gap-3 sm:flex-row" role="search">
        <label className="sr-only" htmlFor="chemo-search">
          Search chemotherapy protocols
        </label>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input
            id="chemo-search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Search by title, category, or keyword..."
            className="ui-input pl-10"
          />
        </div>
        <button type="submit" className="btn-primary shrink-0">
          Search
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-sm text-muted">
          <Filter size={14} />
          Category
        </span>
        <button
          type="button"
          onClick={() => setCategory('all')}
          className={`rounded-full px-3 py-1.5 text-sm ${category === 'all' ? 'bg-navy text-white' : 'bg-white text-navy shadow-sm'}`}
        >
          All
        </button>
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={`rounded-full px-3 py-1.5 text-sm ${category === item ? 'bg-navy text-white' : 'bg-white text-navy shadow-sm'}`}
          >
            {item}
          </button>
        ))}
      </div>

      <p className="mt-6 text-sm text-muted">
        {results.length} {results.length === 1 ? 'protocol' : 'protocols'}
        {query.trim() ? ` for “${query.trim()}”` : ''}
      </p>

      {results.length === 0 ? (
        <div className="panel mt-4 px-6 py-16 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#fff5f0] text-[#d97757]">
            <Ribbon size={24} />
          </span>
          <h2 className="mt-4 font-serif text-2xl text-navy">
            {published.length === 0 ? 'Chemotherapy protocols will appear here once published' : 'No protocols match this search'}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            {published.length === 0
              ? 'No chemotherapy protocols available yet. Approved protocols will appear here once published.'
              : 'Try another keyword or clear the category filter.'}
          </p>
          {(query || category !== 'all') && (
            <button
              type="button"
              className="btn-secondary mt-5"
              onClick={() => {
                setDraft('');
                setParams({}, { replace: true });
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {results.map((item) => (
            <Link
              key={item.id}
              to={`/chemotherapy-protocols/${item.id}`}
              className="panel block p-5 transition hover:-translate-y-0.5 hover:shadow-lift"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-serif text-2xl text-navy">{item.title}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {item.category || 'Uncategorized'} · {item.language} · Version {item.version}
                  </p>
                </div>
                <time className="text-sm text-muted" dateTime={item.lastUpdated}>
                  {formatDate(item.lastUpdated)}
                </time>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink">{item.summary || 'Summary pending clinical review.'}</p>
              {item.attachmentName && (
                <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#d97757]">
                  <FileText size={14} />
                  Attachment available
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChemotherapyProtocolDetailPage() {
  const { id } = useParams();
  const { state } = useContent();
  const { allowed } = useAuth();
  const [params] = useSearchParams();
  const item = state.chemotherapy.find((entry) => entry.id === id);
  const preview = params.get('preview') === '1' && allowed('content:update');

  if (!item || (item.status !== 'published' && !preview)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-serif text-4xl text-navy">Protocol not found</h1>
        <p className="mt-3 text-muted">This chemotherapy protocol is unpublished or does not exist.</p>
        <Link to="/chemotherapy-protocols" className="btn-primary mt-6">
          Back to chemotherapy protocols
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link to="/chemotherapy-protocols" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
        <ArrowLeft size={16} />
        Back to chemotherapy protocols
      </Link>
      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
        Demonstration content — not approved for clinical use. Do not use this page for dosing, cycles, or administration decisions.
      </div>
      {item.status !== 'published' && (
        <p className="mt-3 rounded-2xl bg-clinical px-4 py-3 text-sm text-navy">Previewing a {item.status} record.</p>
      )}
      <article className="panel mt-5 p-6 sm:p-8">
        <p className="text-sm font-medium text-[#d97757]">Chemotherapy Protocol</p>
        <h1 className="mt-2 font-serif text-4xl text-navy">{item.title}</h1>
        <p className="mt-3 text-sm text-muted">
          {item.category || 'Uncategorized'} · {item.language} · Version {item.version} · {formatDate(item.lastUpdated)}
        </p>
        <p className="mt-6 leading-7 text-ink">{item.summary || 'Summary pending clinical review.'}</p>

        <h2 className="mt-8 font-serif text-2xl text-navy">Protocol text</h2>
        {isPending(item.body) ? (
          <p className="mt-3 italic text-muted">{fieldOrPending(item.body) || PENDING_REVIEW}</p>
        ) : (
          <div className="mt-3 whitespace-pre-wrap leading-7 text-ink">{item.body}</div>
        )}

        <h2 className="mt-8 font-serif text-2xl text-navy">References</h2>
        {isPending(item.references) ? (
          <p className="mt-3 italic text-muted">{PENDING_REVIEW}</p>
        ) : (
          <div className="mt-3 whitespace-pre-wrap leading-7 text-ink">{item.references}</div>
        )}

        <h2 className="mt-8 font-serif text-2xl text-navy">Documents & links</h2>
        <DocumentAttachments document={item} />
      </article>
    </div>
  );
}
