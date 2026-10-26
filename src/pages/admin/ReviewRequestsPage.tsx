import { useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { PublicationBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { useContent } from '@/hooks/useContent';
import { formatDate } from '@/lib/format';
import {
  buildDrugSubmissionPackage,
  downloadDrugSubmissionPackage,
  parseDrugSubmissionPackage,
} from '@/services/submissionPackage';
import { sortedHospitals } from '@/services/hospitals';
import type { DocumentKind, Drug, LibraryDocument, PublicationStatus } from '@/types';

type ReviewKind = 'drug' | DocumentKind;
type ReviewFilter = 'pending-review' | 'changes-requested' | 'published' | 'all';

interface ReviewRow {
  kind: ReviewKind;
  id: string;
  title: string;
  submittedBy: string;
  submittedAt: string;
  status: PublicationStatus;
  hospitals: string;
  updated: string;
}

const kindLabel: Record<ReviewKind, string> = {
  drug: 'Medication',
  protocol: 'Protocol',
  guideline: 'Guideline',
  education: 'Counseling Material',
  chemotherapy: 'Chemotherapy Protocol',
};

function hospitalLabels(drug: Drug, hospitals: ReturnType<typeof sortedHospitals>): string {
  const names = hospitals
    .filter((hospital) =>
      (drug.hospitalAssignments ?? []).some((row) => row.hospitalId === hospital.id && row.enabled),
    )
    .map((hospital) => hospital.nameEn.split('—')[0].trim());
  return names.length ? names.join(', ') : 'None selected';
}

function collectRows(state: ReturnType<typeof useContent>['state']): ReviewRow[] {
  const hospitals = sortedHospitals(state.hospitals ?? []);
  const rows: ReviewRow[] = [];
  for (const drug of state.drugs) {
    if (drug.status === 'draft' || drug.status === 'archived') continue;
    rows.push({
      kind: 'drug',
      id: drug.id,
      title: drug.genericName,
      submittedBy: drug.authorLabel || 'Unknown contributor',
      submittedAt: drug.submittedAt || drug.lastUpdated,
      status: drug.status === 'approved' ? 'published' : drug.status === 'rejected' ? 'changes-requested' : drug.status,
      hospitals: hospitalLabels(drug, hospitals),
      updated: drug.lastUpdated,
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
      if (item.status === 'draft' || item.status === 'archived') continue;
      rows.push({
        kind: group.kind,
        id: item.id,
        title: item.title,
        submittedBy: item.authorLabel || 'Unknown contributor',
        submittedAt: item.submittedAt || item.lastUpdated,
        status: item.status === 'approved' ? 'published' : item.status === 'rejected' ? 'changes-requested' : item.status,
        hospitals: '—',
        updated: item.lastUpdated,
      });
    }
  }
  return rows.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

function reviewHref(kind: ReviewKind, id: string): string {
  if (kind === 'drug') return `/admin/drugs/${id}?review=1`;
  if (kind === 'education') return `/admin/education/${id}`;
  if (kind === 'chemotherapy') return `/admin/chemotherapy/${id}`;
  if (kind === 'guideline') return `/admin/guidelines/${id}`;
  return `/admin/protocols/${id}`;
}

function filterFromParam(value: string | null): ReviewFilter {
  if (value === 'changes' || value === 'changes-requested') return 'changes-requested';
  if (value === 'published' || value === 'ready' || value === 'approved' || value === 'live') return 'published';
  if (value === 'all') return 'all';
  return 'pending-review';
}

export function ReviewRequestsPage() {
  const { state, saveDrug } = useContent();
  const { allowed } = useAuth();
  const [params, setParams] = useSearchParams();
  const filter = filterFromParam(params.get('status'));
  const [importMessage, setImportMessage] = useState('');
  const rows = useMemo(() => collectRows(state), [state]);
  const pendingCount = rows.filter((r) => r.status === 'pending-review').length;
  const visible = rows.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'published') return r.status === 'published' || r.status === 'approved';
    return r.status === filter;
  });

  const filters: { id: ReviewFilter; label: string }[] = [
    { id: 'pending-review', label: 'Pending Review' },
    { id: 'changes-requested', label: 'Changes Requested' },
    { id: 'published', label: 'Published' },
    { id: 'all', label: 'All' },
  ];

  function setFilter(next: ReviewFilter) {
    if (next === 'pending-review') setParams(new URLSearchParams(), { replace: true });
    else if (next === 'changes-requested') setParams({ status: 'changes' }, { replace: true });
    else if (next === 'published') setParams({ status: 'published' }, { replace: true });
    else setParams({ status: 'all' }, { replace: true });
  }

  async function onImportFile(file: File | null) {
    setImportMessage('');
    if (!file) return;
    const text = await file.text();
    const parsed = parseDrugSubmissionPackage(text);
    if (!parsed.ok) {
      setImportMessage(parsed.error);
      return;
    }
    saveDrug(parsed.drug, !state.drugs.some((item) => item.id === parsed.drug.id));
    setImportMessage(`Imported “${parsed.drug.genericName}” into this browser workspace.`);
  }

  if (!allowed('content:review')) {
    return <p className="text-muted">Only administrators can open Review Requests.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Content workflow</p>
          <h1 className="mt-1 font-serif text-4xl text-navy">Review Requests</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Team medication submissions await your review here. Open a request to edit the full monograph, then Save Draft,
            Request Changes, or Approve &amp; Publish.
          </p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          <span className="font-semibold">{pendingCount}</span> pending review
        </div>
      </div>

      <section className="panel space-y-3 p-5 text-sm">
        <h2 className="font-serif text-xl text-navy">Portable submission package</h2>
        <p className="text-muted">
          Team members on another device can export a submission file and you can import it here. This does not send email
          or sync accounts automatically.
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <span className="btn-secondary">Import submission file</span>
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => void onImportFile(event.target.files?.[0] ?? null)}
          />
        </label>
        {importMessage && <p className="text-emerald-800">{importMessage}</p>}
      </section>

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`rounded-full px-3 py-2 text-sm ${filter === item.id ? 'bg-navy text-white' : 'bg-white text-navy shadow-sm'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-clinical/60 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Medication / content</th>
              <th className="px-4 py-3 font-semibold">Submitted by</th>
              <th className="px-4 py-3 font-semibold">Submitted</th>
              <th className="px-4 py-3 font-semibold">Hospitals</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  No review requests in this view.
                </td>
              </tr>
            )}
            {visible.map((row) => (
                <tr key={`${row.kind}-${row.id}`} className="hover:bg-clinical/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-navy">{row.title}</p>
                    <p className="text-xs text-muted">{kindLabel[row.kind]}</p>
                  </td>
                  <td className="px-4 py-3">{row.submittedBy}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(row.submittedAt.slice(0, 10))}</td>
                  <td className="px-4 py-3 text-muted">{row.hospitals}</td>
                  <td className="px-4 py-3">
                    <PublicationBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-3">
                      <Link className="font-medium text-primary hover:underline" to={reviewHref(row.kind, row.id)}>
                        Review
                      </Link>
                      {row.kind === 'drug' && (
                        <button
                          type="button"
                          className="font-medium text-muted hover:underline"
                          onClick={() => {
                            const drug = state.drugs.find((item) => item.id === row.id);
                            if (!drug) return;
                            downloadDrugSubmissionPackage(buildDrugSubmissionPackage(drug));
                          }}
                        >
                          Export
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Legacy detail route → open the full medication editor in review mode. */
export function ReviewDetailPage() {
  const { kind = 'drug', id = '' } = useParams<{ kind: ReviewKind; id: string }>();
  if (kind === 'drug' && id) {
    return <Navigate to={`/admin/drugs/${id}?review=1`} replace />;
  }
  if (kind && id) {
    return <Navigate to={reviewHref(kind as ReviewKind, id)} replace />;
  }
  return <Navigate to="/admin/review-requests" replace />;
}
