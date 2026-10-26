import { ArrowLeft, Layers, ListOrdered, Search } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useHospital } from '@/hooks/useHospital';
import { cn } from '@/lib/cn';
import { drugsForHospital } from '@/services/hospitals';
import { publishedDrugs } from '@/services/search';
import {
  drugsForClass,
  findTherapeuticClass,
  publishedTherapeuticClasses,
} from '@/services/therapeuticClasses';
import type { ContentState } from '@/types';

type IndexTab = 'az' | 'classes';

export function DrugIndexPage() {
  const { hospital, catalog } = useHospital();
  const hospitalDrugs = drugsForHospital(catalog.drugs, hospital.id);
  const state: ContentState = { ...catalog, drugs: hospitalDrugs };
  const [params, setParams] = useSearchParams();
  const tab: IndexTab = params.get('tab') === 'classes' ? 'classes' : 'az';
  const query = params.get('q') ?? '';
  const letter = (params.get('letter') ?? '').toUpperCase();
  const classId = params.get('class') ?? '';

  function setTab(next: IndexTab) {
    const nextParams = new URLSearchParams(params);
    if (next === 'az') nextParams.delete('tab');
    else nextParams.set('tab', 'classes');
    if (next === 'az') nextParams.delete('class');
    else nextParams.delete('letter');
    setParams(nextParams, { replace: true });
  }

  function setQuery(value: string) {
    const nextParams = new URLSearchParams(params);
    if (value.trim()) nextParams.set('q', value.trim());
    else nextParams.delete('q');
    setParams(nextParams, { replace: true });
  }

  function setLetter(value: string) {
    const nextParams = new URLSearchParams(params);
    if (value) nextParams.set('letter', value);
    else nextParams.delete('letter');
    setParams(nextParams, { replace: true });
  }

  function setClass(id: string) {
    const nextParams = new URLSearchParams(params);
    nextParams.set('tab', 'classes');
    if (id) nextParams.set('class', id);
    else nextParams.delete('class');
    setParams(nextParams, { replace: true });
  }

  return (
    <div className="mx-auto max-w-page px-4 py-10 sm:px-6">
      <p className="text-sm font-medium text-primary">Drug Index A–Z · {hospital.nameEn}</p>
      <h1 className="mt-2 font-serif text-[clamp(1.75rem,3vw,2.25rem)] text-navy">Formulary medications</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        Browse published medications assigned to {hospital.nameEn}, alphabetically or by therapeutic class. Assignment
        does not indicate live pharmacy stock.
      </p>

      <div className="mt-8" role="tablist" aria-label="Drug index views">
        <div className="inline-flex max-w-full flex-wrap gap-1 rounded-2xl border border-line bg-white p-1.5 shadow-sm">
          <TabButton active={tab === 'az'} onClick={() => setTab('az')} icon={ListOrdered} id="tab-az" controls="panel-az">
            Browse A–Z
          </TabButton>
          <TabButton
            active={tab === 'classes'}
            onClick={() => setTab('classes')}
            icon={Layers}
            id="tab-classes"
            controls="panel-classes"
          >
            Therapeutic Classes
          </TabButton>
        </div>
      </div>

      {tab === 'az' ? (
        <BrowseAzPanel
          state={state}
          query={query}
          letter={letter}
          onQuery={setQuery}
          onLetter={setLetter}
        />
      ) : (
        <TherapeuticClassesPanel
          state={state}
          query={query}
          classId={classId}
          onQuery={setQuery}
          onSelectClass={setClass}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  id,
  controls,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof ListOrdered;
  id: string;
  controls: string;
  children: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={controls}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          const tabs = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
          const index = tabs.indexOf(event.currentTarget);
          const next = event.key === 'ArrowRight' ? tabs[(index + 1) % tabs.length] : tabs[(index - 1 + tabs.length) % tabs.length];
          next?.focus();
          next?.click();
        }
      }}
      className={cn(
        'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        active ? 'bg-primary text-white shadow-sm' : 'text-navy hover:bg-clinical',
      )}
    >
      <Icon size={16} aria-hidden="true" />
      {children}
    </button>
  );
}

function BrowseAzPanel({
  state,
  query,
  letter,
  onQuery,
  onLetter,
}: {
  state: ContentState;
  query: string;
  letter: string;
  onQuery: (value: string) => void;
  onLetter: (value: string) => void;
}) {
  const { path } = useHospital();
  const drugs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return publishedDrugs(state.drugs)
      .filter((drug) => {
        if (!q) return true;
        return (
          drug.genericName.toLowerCase().includes(q) ||
          drug.brandNames.some((name) => name.toLowerCase().includes(q)) ||
          drug.keywords.some((keyword) => keyword.toLowerCase().includes(q))
        );
      })
      .filter((drug) => (letter ? drug.genericName.toUpperCase().startsWith(letter) : true))
      .sort((a, b) => a.genericName.localeCompare(b.genericName));
  }, [state.drugs, query, letter]);

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const available = new Set(
    publishedDrugs(state.drugs).map((drug) => drug.genericName.charAt(0).toUpperCase()),
  );
  const grouped = letters
    .map((item) => ({
      letter: item,
      items: drugs.filter((drug) => drug.genericName.toUpperCase().startsWith(item)),
    }))
    .filter((group) => group.items.length);

  return (
    <div id="panel-az" role="tabpanel" aria-labelledby="tab-az" className="mt-8">
      <label className="relative block max-w-xl">
        <span className="sr-only">Search medications by generic or brand name</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
        <input
          className="ui-input pl-10"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search by generic or brand name…"
        />
      </label>

      <div className="mt-6 flex flex-wrap gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => onLetter('')}
          className={cn(
            'rounded-full px-3 py-1.5 text-sm font-semibold',
            !letter ? 'bg-primary text-white' : 'bg-white text-navy shadow-sm hover:bg-clinical',
          )}
        >
          All
        </button>
        {letters.map((item) => {
          const enabled = available.has(item);
          if (!enabled) {
            return (
              <span
                key={item}
                className="grid h-8 w-8 place-items-center rounded-full text-xs text-slate-300 sm:h-9 sm:w-9 sm:text-sm"
              >
                {item}
              </span>
            );
          }
          return (
            <button
              key={item}
              type="button"
              onClick={() => onLetter(letter === item ? '' : item)}
              className={cn(
                'grid h-8 w-8 place-items-center rounded-full text-xs font-semibold shadow-sm sm:h-9 sm:w-9 sm:text-sm',
                letter === item ? 'bg-primary text-white' : 'bg-white text-navy hover:bg-clinical',
              )}
              aria-pressed={letter === item}
            >
              {item}
            </button>
          );
        })}
      </div>

      <div className="mt-8 space-y-8">
        {grouped.map((group) => (
          <section key={group.letter} id={`letter-${group.letter}`} className="scroll-mt-24">
            <h2 className="font-serif text-2xl text-navy">{group.letter}</h2>
            <ul className="mt-3 divide-y divide-line rounded-3xl bg-white px-5 shadow-card">
              {group.items.map((drug) => (
                <li key={drug.id}>
                  <Link to={path(`/drugs/${drug.id}`)} className="flex flex-wrap items-center justify-between gap-2 py-4 hover:text-primary">
                    <span>
                      <span className="block font-medium text-navy">{drug.genericName}</span>
                      <span className="text-sm text-muted">
                        {drug.brandNames[0] ? `${drug.brandNames.join(', ')} · ` : ''}
                        {drug.therapeuticClass}
                      </span>
                    </span>
                    <span className="text-sm text-primary">View details</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {grouped.length === 0 && (
          <p className="rounded-3xl bg-white px-5 py-8 text-center text-muted shadow-card">
            No medications available yet. Approved medications will appear here once published.
          </p>
        )}
      </div>
    </div>
  );
}

function TherapeuticClassesPanel({
  state,
  query,
  classId,
  onQuery,
  onSelectClass,
}: {
  state: ContentState;
  query: string;
  classId: string;
  onQuery: (value: string) => void;
  onSelectClass: (id: string) => void;
}) {
  const { path } = useHospital();
  const classes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return publishedTherapeuticClasses(state.therapeuticClasses).filter((item) => {
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.subclasses.some((sub) => sub.name.toLowerCase().includes(q))
      );
    });
  }, [state.therapeuticClasses, query]);

  const selected = classId ? findTherapeuticClass(state.therapeuticClasses, classId) : undefined;
  const selectedPublished = selected?.status === 'published' ? selected : undefined;
  const medications = selectedPublished ? drugsForClass(state, selectedPublished.id) : [];

  if (selectedPublished) {
    return (
      <div id="panel-classes" role="tabpanel" aria-labelledby="tab-classes" className="mt-8">
        <button
          type="button"
          onClick={() => onSelectClass('')}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft size={16} />
          Back to therapeutic classes
        </button>
        <h2 className="mt-4 font-serif text-3xl text-navy">{selectedPublished.name}</h2>
        {selectedPublished.description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{selectedPublished.description}</p>
        )}
        {selectedPublished.subclasses.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-semibold text-navy">Subclasses</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {selectedPublished.subclasses.map((sub) => (
                <li key={sub.id} className="rounded-full bg-clinical px-3 py-1.5 text-sm text-navy">
                  {sub.name}
                </li>
              ))}
            </ul>
          </div>
        )}
        <h3 className="mt-8 font-serif text-2xl text-navy">Medications</h3>
        <ul className="mt-3 divide-y divide-line rounded-3xl bg-white px-5 shadow-card">
          {medications.map((drug) => (
            <li key={drug.id}>
              <Link to={path(`/drugs/${drug.id}`)} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <span>
                  <span className="block font-medium text-navy hover:text-primary">{drug.genericName}</span>
                  <span className="text-sm text-muted">{drug.brandNames[0] || drug.pharmacologicalClass}</span>
                </span>
                <StatusBadge status={drug.formularyStatus} />
              </Link>
            </li>
          ))}
        </ul>
        {medications.length === 0 && (
          <p className="mt-3 rounded-3xl bg-white px-5 py-8 text-center text-muted shadow-card">
            No published medications are assigned to this class.
          </p>
        )}
      </div>
    );
  }

  return (
    <div id="panel-classes" role="tabpanel" aria-labelledby="tab-classes" className="mt-8">
      <label className="relative block max-w-xl">
        <span className="sr-only">Search therapeutic classes</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
        <input
          className="ui-input pl-10"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search therapeutic classes…"
        />
      </label>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {classes.map((item) => {
          const count = drugsForClass(state, item.id).length;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelectClass(item.id)}
                className="flex w-full flex-col rounded-3xl border border-line bg-white p-5 text-left shadow-sm transition hover:border-primary/30 hover:shadow-card"
              >
                <span className="font-serif text-xl text-navy">{item.name}</span>
                <span className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
                  {item.description || 'Demonstration therapeutic class.'}
                </span>
                <span className="mt-4 text-xs font-semibold uppercase tracking-wide text-primary">
                  {count} {count === 1 ? 'medication' : 'medications'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {classes.length === 0 && (
        <p className="mt-6 rounded-3xl bg-white px-5 py-8 text-center text-muted shadow-card">
          No therapeutic classes match this search.
        </p>
      )}
      {classId && !selectedPublished && (
        <p className="mt-4 text-sm text-amber-800">
          That therapeutic class is unavailable or archived.{' '}
          <button type="button" className="font-medium text-primary hover:underline" onClick={() => onSelectClass('')}>
            View all classes
          </button>
        </p>
      )}
    </div>
  );
}
