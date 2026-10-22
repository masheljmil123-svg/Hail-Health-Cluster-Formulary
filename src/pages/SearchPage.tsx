import { Bookmark, Download, Share2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FilterSidebar } from '@/components/search/FilterSidebar';
import { HeroSearch } from '@/components/search/HeroSearch';
import { ResultCard } from '@/components/search/ResultCard';
import { site } from '@/config/site';
import { useContent } from '@/hooks/useContent';
import { applyFilters, emptyFilters, matchDrugs, readFilters, sortResults, writeSearchParams } from '@/services/search';
import type { SearchFilters, SortKey } from '@/types';

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const { state, toggleSavedSearch } = useContent();
  const query = params.get('q') ?? '';
  const filters = readFilters(params);
  const [notice, setNotice] = useState('');
  const hero = state.sections.find((section) => section.kind === 'hero');

  const matched = useMemo(() => matchDrugs(state.drugs, query), [state.drugs, query]);
  const filtered = useMemo(() => applyFilters(matched, filters), [matched, filters]);
  const results = useMemo(() => sortResults(filtered, filters.sort, Boolean(query.trim())), [filtered, filters.sort, query]);
  const saved = state.savedSearches.some((item) => item.toLowerCase() === query.trim().toLowerCase());

  function updateFilters(next: SearchFilters) {
    setParams(writeSearchParams(query, next), { replace: true });
  }

  async function share() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setNotice('Link copied.');
    } catch {
      setNotice(url);
    }
  }

  function exportResults() {
    const header = ['Generic name', 'Brand', 'Pharmacological class', 'Therapeutic class', 'Formulary status', 'Updated', 'Version'];
    const lines = results.map((drug) =>
      [drug.genericName, drug.brandName, drug.pharmacologicalClass, drug.therapeuticClass, drug.formularyStatus, drug.lastUpdated, drug.version]
        .map(csvCell)
        .join(','),
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'formulary-search.csv';
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice('Exported the current results as a CSV file.');
  }

  return (
    <div>
      <HeroSearch
        density="compact"
        showIntro={hero?.visible !== false}
        subtitle={hero?.description || site.tagline}
        placeholder={hero?.searchPlaceholder || site.searchPlaceholder}
        popular={hero?.visible === false ? [] : hero?.popularSearches ?? []}
      />

      <div className="mx-auto grid max-w-page grid-cols-1 gap-5 px-4 pb-8 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <FilterSidebar
            drugs={matched.map((item) => item.drug)}
            filters={filters}
            onChange={updateFilters}
            onClear={() => updateFilters({ ...emptyFilters(), sort: filters.sort })}
          />
        </div>

        <section aria-live="polite">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-serif text-2xl text-navy">
                {results.length} {results.length === 1 ? 'result' : 'results'}
                {query.trim() ? ` for “${query.trim()}”` : ''}
              </h2>
              <p className="mt-1 text-sm text-muted">Demonstration records. Not approved for clinical use.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn-secondary" onClick={() => query.trim() && toggleSavedSearch(query.trim())} disabled={!query.trim()}>
                <Bookmark size={15} />
                {saved ? 'Saved' : 'Save'}
              </button>
              <button type="button" className="btn-secondary" onClick={share}>
                <Share2 size={15} />
                Share
              </button>
              <button type="button" className="btn-secondary" onClick={exportResults} disabled={!results.length}>
                <Download size={15} />
                Export
              </button>
              <label className="ml-auto flex items-center gap-2 text-sm text-muted">
                Sort by
                <select
                  value={filters.sort}
                  onChange={(event) => updateFilters({ ...filters, sort: event.target.value as SortKey })}
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-navy"
                >
                  <option value="best">Best match</option>
                  <option value="updated">Recently updated</option>
                  <option value="name">Name A–Z</option>
                  <option value="name-desc">Name Z–A</option>
                </select>
              </label>
            </div>
          </div>

          {notice && (
            <p className="mb-3 rounded-xl bg-clinical px-3 py-2 text-sm text-navy" role="status">
              {notice}
            </p>
          )}

          {results.length === 0 ? (
            <div className="panel px-6 py-16 text-center">
              <h3 className="font-serif text-2xl text-navy">No medications match this search</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
                Try another drug name, class, or keyword, or clear the filters.
              </p>
              <button type="button" className="btn-primary mt-5" onClick={() => updateFilters(emptyFilters())}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((drug, index) => (
                <ResultCard key={drug.id} drug={drug} index={index + 1} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
