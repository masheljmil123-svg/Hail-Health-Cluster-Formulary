import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PublicationBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { useContent } from '@/hooks/useContent';
import { formatDate } from '@/lib/format';
import {
  buildExportPackage,
  downloadExportPackage,
  validateExportPackage,
  type ExportValidation,
} from '@/services/exportCatalog';
import {
  DEPLOYMENT_STATUS_LABEL,
  getDeploymentStatus,
  isReadyForDeployment,
  editorialLabel,
} from '@/services/deploymentStatus';
import type { DocumentKind, LibraryDocument, PublicationStatus } from '@/types';

type ReviewKind = 'drug' | DocumentKind;
type ReviewFilter =
  | 'pending-review'
  | 'changes-requested'
  | 'ready'
  | 'live'
  | 'rejected'
  | 'all';

interface ReviewRow {
  kind: ReviewKind;
  id: string;
  title: string;
  submittedBy: string;
  submittedAt: string;
  status: PublicationStatus;
  updated: string;
  editTo: string;
  reviewTo: string;
}

const kindLabel: Record<ReviewKind, string> = {
  drug: 'Medication',
  protocol: 'Protocol',
  guideline: 'Guideline',
  education: 'Counseling Material',
  chemotherapy: 'Chemotherapy Protocol',
};

function editPath(kind: ReviewKind, id: string): string {
  if (kind === 'drug') return `/admin/drugs/${id}`;
  if (kind === 'education') return `/admin/education/${id}`;
  if (kind === 'chemotherapy') return `/admin/chemotherapy/${id}`;
  if (kind === 'guideline') return `/admin/guidelines/${id}`;
  return `/admin/protocols/${id}`;
}

function collectRows(state: ReturnType<typeof useContent>['state']): ReviewRow[] {
  const rows: ReviewRow[] = [];
  for (const drug of state.drugs) {
    if (drug.status === 'draft') continue;
    rows.push({
      kind: 'drug',
      id: drug.id,
      title: drug.genericName,
      submittedBy: drug.authorLabel || 'Administrator / team',
      submittedAt: drug.submittedAt || drug.lastUpdated,
      status: drug.status,
      updated: drug.lastUpdated,
      editTo: editPath('drug', drug.id),
      reviewTo: `/admin/review-publishing/${'drug'}/${drug.id}`,
    });
  }
  const docs: Array<{ kind: DocumentKind; items: LibraryDocument[] }> = [
    { kind: 'protocol', items: state.protocols },
    { kind: 'guideline', items: state.guidelines },
    { kind: 'education', items: state.education },
    { kind: 'chemotherapy', items: state.chemotherapy },
  ];
  for (const group of docs) {
    for (const item of group.items) {
      if (item.status === 'draft') continue;
      rows.push({
        kind: group.kind,
        id: item.id,
        title: item.title,
        submittedBy: item.authorLabel || 'Administrator / team',
        submittedAt: item.submittedAt || item.lastUpdated,
        status: item.status,
        updated: item.lastUpdated,
        editTo: editPath(group.kind, item.id),
        reviewTo: `/admin/review-publishing/${group.kind}/${item.id}`,
      });
    }
  }
  return rows.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

function reviewFilterFromParam(value: string | null): ReviewFilter {
  if (value === 'pending' || value === 'pending-review') return 'pending-review';
  if (value === 'changes' || value === 'changes-requested') return 'changes-requested';
  if (value === 'ready' || value === 'approved') return 'ready';
  if (value === 'live' || value === 'published') return 'live';
  if (value === 'rejected') return 'rejected';
  if (value === 'all') return 'all';
  return 'pending-review';
}

function reviewFilterToParam(filter: ReviewFilter): string {
  if (filter === 'pending-review') return 'pending';
  if (filter === 'changes-requested') return 'changes';
  if (filter === 'ready') return 'ready';
  if (filter === 'live') return 'live';
  if (filter === 'rejected') return 'rejected';
  return 'all';
}

export function ReviewPublishingPage() {
  const { state } = useContent();
  const { allowed } = useAuth();
  const [params, setParams] = useSearchParams();
  const filter = reviewFilterFromParam(params.get('status'));
  const [exportResult, setExportResult] = useState<ExportValidation | null>(null);
  const [exportError, setExportError] = useState('');
  const rows = useMemo(() => collectRows(state), [state]);

  function setFilter(next: ReviewFilter) {
    const nextParams = new URLSearchParams(params);
    nextParams.set('status', reviewFilterToParam(next));
    setParams(nextParams, { replace: true });
  }

  const visible = rows.filter((row) => {
    if (filter === 'all') return true;
    if (filter === 'pending-review') return row.status === 'pending-review';
    if (filter === 'changes-requested') return row.status === 'changes-requested';
    if (filter === 'ready') return isReadyForDeployment(row.status);
    if (filter === 'live') return row.kind === 'drug' && getDeploymentStatus({ id: row.id, status: row.status }) === 'live-on-website';
    if (filter === 'rejected') return row.status === 'rejected' || row.status === 'archived';
    return true;
  });

  const counts = {
    pending: rows.filter((r) => r.status === 'pending-review').length,
    changes: rows.filter((r) => r.status === 'changes-requested').length,
    ready: rows.filter((r) => isReadyForDeployment(r.status)).length,
    live: rows.filter((r) => r.kind === 'drug' && getDeploymentStatus({ id: r.id, status: r.status }) === 'live-on-website').length,
    rejected: rows.filter((r) => r.status === 'rejected' || r.status === 'archived').length,
  };

  const filters: { id: ReviewFilter; label: string; count: number }[] = [
    { id: 'pending-review', label: 'Pending Review', count: counts.pending },
    { id: 'changes-requested', label: 'Changes Requested', count: counts.changes },
    { id: 'ready', label: 'Approved / Ready for Deployment', count: counts.ready },
    { id: 'live', label: 'Live on Website', count: counts.live },
    { id: 'rejected', label: 'Rejected / Archived', count: counts.rejected },
    { id: 'all', label: 'All', count: rows.length },
  ];

  function onPublishChanges() {
    setExportError('');
    setExportResult(null);
    try {
      const pkg = buildExportPackage(state);
      const validation = validateExportPackage(pkg);
      setExportResult(validation);
      if (!validation.ok) return;
      downloadExportPackage(pkg);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed.');
    }
  }

  if (!allowed('content:review')) {
    return <p className="text-muted">Only administrators can open Review &amp; Publishing.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Content workflow</p>
          <h1 className="mt-1 font-serif text-4xl text-navy">Review &amp; Publishing</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            One place to review team submissions and prepare approved content for repository deployment. Local approval is not
            the same as Live on GitHub Pages.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={onPublishChanges}>
          Publish Changes (Export)
        </button>
      </div>

      <section className="panel space-y-3 p-5 text-sm leading-6">
        <h2 className="font-serif text-2xl text-navy">Publish Changes</h2>
        <p className="text-muted">
          Collects all Approved / Ready for Deployment medications and resources into one validated catalog JSON. Then run{' '}
          <code className="rounded bg-canvas px-1.5 py-0.5 text-navy">npm run import-catalog -- ./your-export.json</code>, commit, and
          deploy GitHub Pages. This browser action alone does not update other visitors.
        </p>
        {exportError && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-rose-800" role="alert">
            {exportError}
          </p>
        )}
        {exportResult && (
          <div
            className={`rounded-xl px-3 py-2 ${exportResult.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-800'}`}
            role="status"
          >
            {exportResult.ok ? (
              <p>
                Export downloaded — drugs {exportResult.counts.drugs}, hospitals {exportResult.counts.hospitals}. Import into the
                repository to move items toward Live on Website.
              </p>
            ) : (
              <ul className="list-disc pl-4">
                {exportResult.errors.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {exportResult.warnings.map((item) => (
              <p key={item} className="mt-1">
                {item}
              </p>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`rounded-full px-3 py-2 text-sm ${filter === item.id ? 'bg-navy text-white' : 'bg-white text-navy shadow-sm'}`}
          >
            {item.label} ({item.count})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="panel p-8 text-sm text-muted">No items in this queue.</div>
      ) : (
        <div className="space-y-3">
          {visible.map((row) => {
            const deployment =
              row.kind === 'drug' ? getDeploymentStatus({ id: row.id, status: row.status }) : null;
            return (
              <article key={`${row.kind}-${row.id}`} className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{kindLabel[row.kind]}</p>
                  <h2 className="truncate font-serif text-xl text-navy">{row.title}</h2>
                  <p className="text-sm text-muted">
                    {row.submittedBy} · submitted {formatDate(row.submittedAt)} · updated {formatDate(row.updated)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <PublicationBadge status={row.status} />
                    <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold text-navy">
                      Editorial: {editorialLabel(row.status)}
                    </span>
                    {deployment && (
                      <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-900">
                        Deployment: {DEPLOYMENT_STATUS_LABEL[deployment]}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={row.reviewTo} className="btn-primary">
                    Open review
                  </Link>
                  <Link to={row.editTo} className="btn-secondary">
                    Edit
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
