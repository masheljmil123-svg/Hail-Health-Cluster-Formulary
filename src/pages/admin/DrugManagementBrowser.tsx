import {
  Activity,
  ArrowRight,
  Bone,
  Droplets,
  HeartPulse,
  Layers,
  ListOrdered,
  Pill,
  Shield,
  Sparkles,
  Syringe,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { PublicationBadge } from '@/components/ui/StatusBadge';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import {
  editorialLabel,
  getDeploymentStatus,
  isReadyForDeployment,
  summarizeDrugVisibility,
} from '@/services/deploymentStatus';
import { ensureHospitalAssignments, hospitalPath, sortedHospitals } from '@/services/hospitals';
import { classNamesForDrug, drugBelongsToClass } from '@/services/therapeuticClasses';
import type { Drug, Hospital, TherapeuticClass } from '@/types';

type BrowseTab = 'classes' | 'az';
type DrugListStatusFilter = 'all' | 'published' | 'live' | 'pending-review' | 'draft' | 'archived';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const UNCLASSIFIED_ID = 'unclassified';

function drugStatusFromParam(value: string | null): DrugListStatusFilter {
  if (value === 'approved' || value === 'ready' || value === 'published') return 'published';
  if (value === 'live') return 'live';
  if (value === 'pending' || value === 'pending-review') return 'pending-review';
  if (value === 'draft') return 'draft';
  if (value === 'archived') return 'archived';
  return 'all';
}

function matchesStatus(drug: Drug, statusFilter: DrugListStatusFilter): boolean {
  if (statusFilter === 'published' && !isReadyForDeployment(drug.status)) return false;
  if (statusFilter === 'live' && getDeploymentStatus(drug) !== 'live-on-website') return false;
  if (statusFilter === 'pending-review' && drug.status !== 'pending-review') return false;
  if (statusFilter === 'draft' && drug.status !== 'draft') return false;
  if (statusFilter === 'archived' && drug.status !== 'archived') return false;
  return true;
}

function matchesSearch(drug: Drug, query: string, classes: TherapeuticClass[]): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const classNames = classNamesForDrug(drug, classes).join(' ');
  return `${drug.genericName} ${drug.brandNames.join(' ')} ${drug.synonyms.join(' ')} ${drug.therapeuticClass} ${classNames} ${drug.keywords.join(' ')}`
    .toLowerCase()
    .includes(needle);
}

function isUnclassified(drug: Drug, classes: TherapeuticClass[]): boolean {
  const ids = drug.therapeuticClassIds ?? [];
  if (ids.some((id) => classes.some((item) => item.id === id))) return false;
  if (drug.therapeuticClass && classes.some((item) => item.name === drug.therapeuticClass)) return false;
  return true;
}

function iconForClass(name: string): LucideIcon {
  const lower = name.toLowerCase();
  if (lower.includes('anticoagul') || lower.includes('antiplatelet') || lower.includes('blood')) return Droplets;
  if (lower.includes('cardiac') || lower.includes('cardio') || lower.includes('hypertens') || lower.includes('lipid')) {
    return HeartPulse;
  }
  if (lower.includes('diabet') || lower.includes('endocrine')) return Activity;
  if (lower.includes('immunosup') || lower.includes('rheumat') || lower.includes('immune')) return Shield;
  if (lower.includes('analges') || lower.includes('pain') || lower.includes('antipyretic')) return Bone;
  if (lower.includes('antibiot') || lower.includes('antimicrob') || lower.includes('infect')) return Syringe;
  if (lower.includes('gastro')) return Sparkles;
  return Pill;
}

export function DrugManagementBrowser({
  drugs,
  classes,
  hospitals,
  canEdit,
  previewHospital,
  onArchive,
  onRestore,
  onDelete,
  onSaveAssignments,
}: {
  drugs: Drug[];
  classes: TherapeuticClass[];
  hospitals: Hospital[];
  canEdit: boolean;
  previewHospital: string;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveAssignments: (drug: Drug) => void;
}) {
  const [params, setParams] = useSearchParams();
  const statusFilter = drugStatusFromParam(params.get('status'));
  const tab: BrowseTab = params.get('tab') === 'az' ? 'az' : 'classes';
  const classId = params.get('class') ?? '';
  const letter = (params.get('letter') ?? '').toUpperCase();
  const query = params.get('q') ?? '';
  const [visibilityDrug, setVisibilityDrug] = useState<Drug | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Drug | null>(null);
  const [classQuery, setClassQuery] = useState('');

  const sortedClasses = useMemo(
    () => [...classes].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
    [classes],
  );

  const statusFiltered = useMemo(
    () => drugs.filter((drug) => matchesStatus(drug, statusFilter)),
    [drugs, statusFilter],
  );

  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    return statusFiltered
      .filter((drug) => matchesSearch(drug, query, classes))
      .sort((a, b) => a.genericName.localeCompare(b.genericName));
  }, [statusFiltered, query, classes]);

  const classCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of sortedClasses) {
      map.set(
        item.id,
        statusFiltered.filter((drug) => drugBelongsToClass(drug, item.id, classes)).length,
      );
    }
    map.set(UNCLASSIFIED_ID, statusFiltered.filter((drug) => isUnclassified(drug, classes)).length);
    return map;
  }, [sortedClasses, statusFiltered, classes]);

  function patchParams(mutator: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(params);
    mutator(next);
    setParams(next, { replace: true });
  }

  function setStatusFilter(next: DrugListStatusFilter) {
    patchParams((p) => {
      if (next === 'all') p.delete('status');
      else p.set('status', next === 'pending-review' ? 'pending' : next);
    });
  }

  function setTab(next: BrowseTab) {
    patchParams((p) => {
      if (next === 'classes') p.delete('tab');
      else p.set('tab', 'az');
      if (next === 'classes') p.delete('letter');
      else p.delete('class');
    });
  }

  function setQuery(value: string) {
    patchParams((p) => {
      if (value.trim()) p.set('q', value.trim());
      else p.delete('q');
    });
  }

  function setClass(id: string) {
    patchParams((p) => {
      p.delete('tab');
      if (id) p.set('class', id);
      else p.delete('class');
      p.delete('q');
    });
  }

  function setLetter(value: string) {
    patchParams((p) => {
      p.set('tab', 'az');
      if (value) p.set('letter', value);
      else p.delete('letter');
      p.delete('q');
    });
  }

  const selectedClass =
    classId && classId !== UNCLASSIFIED_ID ? sortedClasses.find((item) => item.id === classId) : undefined;
  const showingUnclassified = classId === UNCLASSIFIED_ID;

  const classDrugs = useMemo(() => {
    if (showingUnclassified) {
      return statusFiltered
        .filter((drug) => isUnclassified(drug, classes))
        .sort((a, b) => a.genericName.localeCompare(b.genericName));
    }
    if (!selectedClass) return [];
    return statusFiltered
      .filter((drug) => drugBelongsToClass(drug, selectedClass.id, classes))
      .sort((a, b) => a.genericName.localeCompare(b.genericName));
  }, [showingUnclassified, selectedClass, statusFiltered, classes]);

  const classScoped = useMemo(() => {
    const needle = classQuery.trim().toLowerCase();
    if (!needle) return classDrugs;
    return classDrugs.filter((drug) => matchesSearch(drug, needle, classes));
  }, [classDrugs, classQuery, classes]);

  const azDrugs = useMemo(() => {
    return statusFiltered
      .filter((drug) => (letter ? drug.genericName.toUpperCase().startsWith(letter) : true))
      .sort((a, b) => a.genericName.localeCompare(b.genericName));
  }, [statusFiltered, letter]);

  const availableLetters = useMemo(() => {
    return new Set(statusFiltered.map((drug) => drug.genericName.charAt(0).toUpperCase()).filter(Boolean));
  }, [statusFiltered]);

  const azGrouped = useMemo(() => {
    return LETTERS.map((item) => ({
      letter: item,
      items: azDrugs.filter((drug) => drug.genericName.toUpperCase().startsWith(item)),
    })).filter((group) => group.items.length);
  }, [azDrugs]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative block min-w-[16rem] flex-1 sm:max-w-md">
          <span className="sr-only">Search all medications</span>
          <input
            className="ui-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search generic, brand, synonym, or class…"
          />
        </label>
        <select
          className="ui-input sm:max-w-xs"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as DrugListStatusFilter)}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="live">Online catalog (deployed)</option>
          <option value="pending-review">Pending Review</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        {query.trim() && (
          <button type="button" className="btn-secondary" onClick={() => setQuery('')}>
            Clear search
          </button>
        )}
      </div>

      {!searchResults && (
        <div className="inline-flex max-w-full flex-wrap gap-1 rounded-2xl border border-line bg-white p-1.5 shadow-sm" role="tablist">
          <TabButton active={tab === 'classes'} onClick={() => setTab('classes')} icon={Layers}>
            Therapeutic Classes
          </TabButton>
          <TabButton active={tab === 'az'} onClick={() => setTab('az')} icon={ListOrdered}>
            Browse A–Z
          </TabButton>
        </div>
      )}

      {searchResults ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-primary">Search results</p>
              <h2 className="font-serif text-2xl text-navy">
                {searchResults.length} medication{searchResults.length === 1 ? '' : 's'} matching “{query.trim()}”
              </h2>
            </div>
          </div>
          <DrugRows
            drugs={searchResults}
            classes={classes}
            hospitals={hospitals}
            canEdit={canEdit}
            previewHospital={previewHospital}
            onArchive={onArchive}
            onRestore={onRestore}
            onDelete={setPendingDelete}
            onVisibility={setVisibilityDrug}
          />
        </section>
      ) : tab === 'classes' && !selectedClass && !showingUnclassified ? (
        <section className="space-y-4">
          <p className="text-sm text-muted">
            {statusFiltered.length} medication{statusFiltered.length === 1 ? '' : 's'} in this view · organized by
            therapeutic class
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {sortedClasses.map((item) => {
              const Icon = iconForClass(item.name);
              const count = classCounts.get(item.id) ?? 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setClass(item.id)}
                  className="panel flex items-start gap-4 p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-clinical text-primary">
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif text-xl text-navy">{item.name}</span>
                    <span className="mt-1 block text-sm text-muted">
                      {count} medication{count === 1 ? '' : 's'}
                    </span>
                  </span>
                  <ArrowRight className="mt-1 shrink-0 text-primary" size={18} aria-hidden="true" />
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setClass(UNCLASSIFIED_ID)}
              className="panel flex items-start gap-4 p-5 text-left transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-lift"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-800">
                <Layers size={22} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-serif text-xl text-navy">Unclassified Medications</span>
                <span className="mt-1 block text-sm text-muted">
                  {classCounts.get(UNCLASSIFIED_ID) ?? 0} medication
                  {(classCounts.get(UNCLASSIFIED_ID) ?? 0) === 1 ? '' : 's'} without a class assignment
                </span>
              </span>
              <ArrowRight className="mt-1 shrink-0 text-amber-800" size={18} aria-hidden="true" />
            </button>
          </div>
          {sortedClasses.length === 0 && (
            <p className="panel p-6 text-sm text-muted">
              No therapeutic classes yet. Assign classes when editing a medication, or create them under Therapeutic
              Classes.
            </p>
          )}
        </section>
      ) : tab === 'classes' && (selectedClass || showingUnclassified) ? (
        <section className="space-y-4">
          <nav className="text-sm text-muted">
            <button type="button" className="font-medium text-primary hover:underline" onClick={() => setClass('')}>
              Manage Drugs
            </button>
            <span className="mx-2">/</span>
            <button type="button" className="font-medium text-primary hover:underline" onClick={() => setClass('')}>
              Therapeutic Classes
            </button>
            <span className="mx-2">/</span>
            <span className="text-navy">{showingUnclassified ? 'Unclassified Medications' : selectedClass?.name}</span>
          </nav>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-serif text-3xl text-navy">
                {showingUnclassified ? 'Unclassified Medications' : selectedClass?.name}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {classScoped.length} medication{classScoped.length === 1 ? '' : 's'}
                {selectedClass?.description ? ` · ${selectedClass.description}` : ''}
              </p>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setClass('')}>
              Back to All Classes
            </button>
          </div>
          <input
            className="ui-input sm:max-w-sm"
            value={classQuery}
            onChange={(event) => setClassQuery(event.target.value)}
            placeholder="Search within this class…"
          />
          <DrugRows
            drugs={classScoped}
            classes={classes}
            hospitals={hospitals}
            canEdit={canEdit}
            previewHospital={previewHospital}
            onArchive={onArchive}
            onRestore={onRestore}
            onDelete={setPendingDelete}
            onVisibility={setVisibilityDrug}
          />
        </section>
      ) : (
        <section className="space-y-4">
          <p className="text-sm text-muted">Browse medications alphabetically by generic name.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setLetter('')}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-semibold',
                !letter ? 'bg-primary text-white' : 'bg-white text-navy shadow-sm hover:bg-clinical',
              )}
            >
              All
            </button>
            {LETTERS.map((item) => {
              const enabled = availableLetters.has(item);
              if (!enabled) {
                return (
                  <span key={item} className="grid h-9 w-9 place-items-center rounded-full text-sm text-slate-300">
                    {item}
                  </span>
                );
              }
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLetter(letter === item ? '' : item)}
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-full text-sm font-semibold shadow-sm',
                    letter === item ? 'bg-primary text-white' : 'bg-white text-navy hover:bg-clinical',
                  )}
                  aria-pressed={letter === item}
                >
                  {item}
                </button>
              );
            })}
          </div>
          <div className="space-y-8">
            {azGrouped.map((group) => (
              <div key={group.letter}>
                <h2 className="font-serif text-2xl text-navy">{group.letter}</h2>
                <div className="mt-3">
                  <DrugRows
                    drugs={group.items}
                    classes={classes}
                    hospitals={hospitals}
                    canEdit={canEdit}
                    previewHospital={previewHospital}
                    onArchive={onArchive}
                    onRestore={onRestore}
                    onDelete={setPendingDelete}
                    onVisibility={setVisibilityDrug}
                  />
                </div>
              </div>
            ))}
            {azGrouped.length === 0 && (
              <p className="panel p-6 text-center text-sm text-muted">No medications match this letter or status filter.</p>
            )}
          </div>
        </section>
      )}

      <Modal open={Boolean(visibilityDrug)} onClose={() => setVisibilityDrug(null)} title="Hospital Visibility" wide>
        {visibilityDrug && (
          <HospitalVisibilityEditor
            drug={visibilityDrug}
            hospitals={hospitals}
            canEdit={canEdit}
            onClose={() => setVisibilityDrug(null)}
            onSave={(next) => {
              onSaveAssignments(next);
              setVisibilityDrug(null);
            }}
          />
        )}
      </Modal>

      <Modal open={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)} title="Delete medication?">
        <p>
          Permanently delete <span className="font-semibold text-navy">{pendingDelete?.genericName}</span> from this local
          workspace? This does not change GitHub Pages until you export and deploy.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => setPendingDelete(null)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              if (pendingDelete) onDelete(pendingDelete.id);
              setPendingDelete(null);
            }}
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  children: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition',
        active ? 'bg-primary text-white shadow-sm' : 'text-navy hover:bg-clinical',
      )}
    >
      <Icon size={16} aria-hidden="true" />
      {children}
    </button>
  );
}

function DrugRows({
  drugs,
  classes,
  hospitals,
  canEdit,
  previewHospital,
  onArchive,
  onRestore,
  onDelete,
  onVisibility,
}: {
  drugs: Drug[];
  classes: TherapeuticClass[];
  hospitals: Hospital[];
  canEdit: boolean;
  previewHospital: string;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (drug: Drug) => void;
  onVisibility: (drug: Drug) => void;
}) {
  if (drugs.length === 0) {
    return <p className="panel p-6 text-center text-sm text-muted">No medications in this view.</p>;
  }

  return (
    <div className="space-y-3">
      {drugs.map((drug) => {
        const summary = summarizeDrugVisibility(drug, hospitals);
        const enabledCount = summary.hospitals.filter((item) => item.enabled).length;
        const classLabel = classNamesForDrug(drug, classes).join(', ') || drug.therapeuticClass || 'Unclassified';
        return (
          <article key={drug.id} className="panel space-y-3 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="font-serif text-xl text-navy">{drug.genericName}</h3>
                <p className="text-sm text-muted">
                  {drug.brandNames.length ? drug.brandNames.join(', ') : 'No brand names'}
                  <span className="text-line"> · </span>
                  {classLabel}
                </p>
                <p className="mt-1 text-xs text-muted">Updated {formatDate(drug.lastUpdated)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <PublicationBadge
                    status={
                      drug.status === 'approved'
                        ? 'published'
                        : drug.status === 'rejected'
                          ? 'changes-requested'
                          : drug.status
                    }
                  />
                  <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold text-navy">
                    {enabledCount}/{summary.hospitals.length} hospitals ON
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {canEdit && (
                  <Link to={`/admin/drugs/${drug.id}`} className="btn-secondary">
                    Edit
                  </Link>
                )}
                <Link
                  to={`${hospitalPath(previewHospital, `/drugs/${drug.id}`)}?preview=1`}
                  className="btn-secondary"
                  target="_blank"
                  rel="noreferrer"
                >
                  Preview
                </Link>
                <button type="button" className="btn-secondary" onClick={() => onVisibility(drug)}>
                  Hospital Visibility
                </button>
                {canEdit && drug.status !== 'archived' && (
                  <button type="button" className="btn-secondary" onClick={() => onArchive(drug.id)}>
                    Archive
                  </button>
                )}
                {canEdit && drug.status === 'archived' && (
                  <button type="button" className="btn-secondary" onClick={() => onRestore(drug.id)}>
                    Restore
                  </button>
                )}
                {canEdit && (
                  <button type="button" className="btn-danger" onClick={() => onDelete(drug)}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function HospitalVisibilityEditor({
  drug,
  hospitals,
  canEdit,
  onClose,
  onSave,
}: {
  drug: Drug;
  hospitals: Hospital[];
  canEdit: boolean;
  onClose: () => void;
  onSave: (drug: Drug) => void;
}) {
  const [assignments, setAssignments] = useState(() => ensureHospitalAssignments(drug, hospitals));
  const summary = summarizeDrugVisibility({ ...drug, hospitalAssignments: assignments }, hospitals);

  return (
    <div className="space-y-4 text-left text-ink">
      <p className="text-sm text-muted">
        Inclusion controls which hospital Drug Index / search results may show this medication after local publish or
        deployment. This is not live pharmacy stock.
      </p>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-canvas px-2.5 py-1 font-semibold">Editorial: {summary.editorialLabel}</span>
        <span className="rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-900">
          Online catalog: {summary.deploymentLabel}
        </span>
        <span className="rounded-full bg-clinical px-2.5 py-1 font-semibold text-navy">
          Status detail: {editorialLabel(drug.status)}
        </span>
      </div>
      <ul className="divide-y divide-line/70 rounded-2xl border border-line/70">
        {sortedHospitals(hospitals).map((hospital) => {
          const row = assignments.find((item) => item.hospitalId === hospital.id);
          const enabled = row?.enabled === true;
          return (
            <li key={hospital.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div>
                <p className="font-medium text-navy">{hospital.nameEn}</p>
                <p className="text-xs text-muted">{enabled ? 'Included in Hospital Formulary' : 'Not Included'}</p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-semibold">
                <span className={enabled ? 'text-emerald-800' : 'text-muted'}>{enabled ? 'ON' : 'OFF'}</span>
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  className="h-4 w-4 rounded border-line text-navy"
                  checked={enabled}
                  onChange={(event) => {
                    setAssignments((current) =>
                      current.map((item) =>
                        item.hospitalId === hospital.id ? { ...item, enabled: event.target.checked } : item,
                      ),
                    );
                  }}
                />
              </label>
            </li>
          );
        })}
      </ul>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onClose}>
          Close
        </button>
        {canEdit && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => onSave({ ...drug, hospitalAssignments: assignments })}
          >
            Save hospital assignments
          </button>
        )}
      </div>
    </div>
  );
}
