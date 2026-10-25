import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PublicationBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { useContent } from '@/hooks/useContent';
import { formatDate } from '@/lib/format';
import { WORKFLOW_LABELS } from '@/services/workflow';
import type { DocumentKind, Drug, LibraryDocument, PublicationStatus, ReviewAction } from '@/types';

type ReviewKind = 'drug' | DocumentKind;
type ReviewFilter = 'all' | 'pending-review' | 'changes-requested' | 'approved' | 'published' | 'rejected';

interface ReviewRow {
  kind: ReviewKind;
  id: string;
  title: string;
  submittedBy: string;
  submittedAt: string;
  status: PublicationStatus;
  updated: string;
}

const kindLabel: Record<ReviewKind, string> = {
  drug: 'Medication monograph',
  protocol: 'Protocol',
  guideline: 'Guideline',
  education: 'Patient Counseling Materials',
  chemotherapy: 'Chemotherapy protocol',
};

function collectRows(state: ReturnType<typeof useContent>['state']): ReviewRow[] {
  const rows: ReviewRow[] = [];
  for (const drug of state.drugs) {
    if (drug.status === 'draft' || drug.status === 'archived') continue;
    rows.push({
      kind: 'drug',
      id: drug.id,
      title: drug.genericName,
      submittedBy: drug.authorLabel || 'Unknown',
      submittedAt: drug.submittedAt || drug.lastUpdated,
      status: drug.status,
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
        submittedBy: item.authorLabel || 'Unknown',
        submittedAt: item.submittedAt || item.lastUpdated,
        status: item.status,
        updated: item.lastUpdated,
      });
    }
  }
  return rows.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export function ReviewRequestsPage() {
  const { state } = useContent();
  const [filter, setFilter] = useState<ReviewFilter>('pending-review');
  const rows = useMemo(() => collectRows(state), [state]);
  const pendingCount = rows.filter((r) => r.status === 'pending-review').length;
  const visible = rows.filter((r) => filter === 'all' || r.status === filter);

  const filters: { id: ReviewFilter; label: string }[] = [
    { id: 'pending-review', label: 'Pending Review' },
    { id: 'changes-requested', label: 'Changes Requested' },
    { id: 'approved', label: 'Approved' },
    { id: 'published', label: 'Published' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'all', label: 'All' },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Admin Dashboard</p>
          <h1 className="mt-1 font-serif text-4xl text-navy">Review Requests</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Review team submissions before anything becomes publicly visible. Approval and publication are separate actions.
          </p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          <span className="font-semibold">{pendingCount}</span> pending review
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
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

      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-clinical/60 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Submission</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Submitted by</th>
              <th className="px-4 py-3 font-semibold">Submitted</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Updated</th>
              <th className="px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  No review requests in this view.
                </td>
              </tr>
            )}
            {visible.map((row) => (
              <tr key={`${row.kind}-${row.id}`} className="hover:bg-clinical/30">
                <td className="px-4 py-3 font-medium text-navy">{row.title}</td>
                <td className="px-4 py-3 text-muted">{kindLabel[row.kind]}</td>
                <td className="px-4 py-3">{row.submittedBy}</td>
                <td className="px-4 py-3 text-muted">{formatDate(row.submittedAt.slice(0, 10))}</td>
                <td className="px-4 py-3">
                  <PublicationBadge status={row.status} />
                </td>
                <td className="px-4 py-3 text-muted">{formatDate(row.updated)}</td>
                <td className="px-4 py-3">
                  <Link className="font-medium text-primary hover:underline" to={`/admin/review-requests/${row.kind}/${row.id}`}>
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ReviewDetailPage() {
  const { kind = 'drug', id = '' } = useParams<{ kind: ReviewKind; id: string }>();
  const { state, applyReview } = useContent();
  const { session, allowed } = useAuth();
  const navigate = useNavigate();
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [confirmPublish, setConfirmPublish] = useState(false);

  const item: Drug | LibraryDocument | undefined =
    kind === 'drug'
      ? state.drugs.find((d) => d.id === id)
      : kind === 'protocol'
        ? state.protocols.find((d) => d.id === id)
        : kind === 'guideline'
          ? state.guidelines.find((d) => d.id === id)
          : kind === 'education'
            ? state.education.find((d) => d.id === id)
            : state.chemotherapy.find((d) => d.id === id);

  if (!item) {
    return <p className="text-muted">Submission not found.</p>;
  }

  const title = 'genericName' in item ? item.genericName : item.title;
  const editHref =
    kind === 'drug'
      ? `/admin/drugs/${id}`
      : kind === 'education'
        ? `/admin/education/${id}`
        : kind === 'chemotherapy'
          ? `/admin/chemotherapy/${id}`
          : kind === 'guideline'
            ? `/admin/guidelines/${id}`
            : `/admin/protocols/${id}`;

  function run(action: ReviewAction) {
    if (!session || !allowed('content:review')) {
      setMessage('Only administrators may perform review actions.');
      return;
    }
    if ((action === 'request-changes' || action === 'reject') && !note.trim()) {
      setMessage('Add review notes before requesting changes or rejecting.');
      return;
    }
    if (action === 'publish' || action === 'approve-publish') {
      if (!confirmPublish) {
        setConfirmPublish(true);
        setMessage('Confirm publication: this will make the content visible on the public website.');
        return;
      }
    }
    const result = applyReview(
      kind as ReviewKind,
      id,
      action,
      { id: session.userId, label: session.displayName, role: session.role },
      note,
    );
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setConfirmPublish(false);
    setMessage(`Action completed: ${WORKFLOW_LABELS[(action === 'approve-publish' ? 'published' : action === 'approve' ? 'approved' : action === 'publish' ? 'published' : action === 'request-changes' ? 'changes-requested' : action === 'reject' ? 'rejected' : 'pending-review') as PublicationStatus]}.`);
    if (action === 'publish' || action === 'approve-publish') {
      navigate('/admin/review-requests');
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link to="/admin/review-requests" className="text-sm font-medium text-primary hover:underline">
        ← Back to review requests
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">{kindLabel[kind as ReviewKind]}</p>
          <h1 className="mt-1 font-serif text-4xl text-navy">{title}</h1>
          <p className="mt-2 text-sm text-muted">
            Submitted by {item.authorLabel || 'Unknown'} · Status <PublicationBadge status={item.status} />
          </p>
        </div>
        <Link to={editHref} className="btn-secondary">
          Open full editor
        </Link>
      </div>

      {'summary' in item && item.summary && (
        <div className="panel p-5">
          <h2 className="font-serif text-xl text-navy">Summary</h2>
          <p className="mt-2 text-sm leading-6 text-ink">{item.summary}</p>
        </div>
      )}

      {'attachments' in item && (
        <div className="panel p-5">
          <h2 className="font-serif text-xl text-navy">Attachments</h2>
          {item.attachments.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No files attached.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {item.attachments.map((file) => (
                <li key={file.id} className="flex justify-between gap-3 border-b border-line py-2">
                  <span>{file.name}</span>
                  <span className="text-muted">{file.mimeType || 'file'}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted">
            Draft and pending-review attachments are not publicly downloadable. Open the editor to inspect stored files.
          </p>
        </div>
      )}

      <div className="panel p-5">
        <h2 className="font-serif text-xl text-navy">Review history</h2>
        <ul className="mt-3 divide-y divide-line text-sm">
          {(item.reviewHistory ?? []).length === 0 && <li className="py-3 text-muted">No review events yet.</li>}
          {(item.reviewHistory ?? []).map((entry) => (
            <li key={entry.id} className="py-3">
              <p className="font-medium text-navy">
                {entry.actorLabel} · {entry.action} · {WORKFLOW_LABELS[entry.toStatus]}
              </p>
              <p className="text-muted">{new Date(entry.timestamp).toLocaleString()}</p>
              {entry.note && <p className="mt-1 text-ink">{entry.note}</p>}
            </li>
          ))}
        </ul>
      </div>

      <div className="panel space-y-4 border-primary/20 bg-clinical/40 p-5">
        <h2 className="font-serif text-xl text-navy">Review actions</h2>
        <label className="block">
          <span className="ui-label">Review notes / feedback</span>
          <textarea className="ui-input min-h-28" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Required when requesting changes or rejecting." />
        </label>
        {message && (
          <p className="rounded-xl bg-white px-3 py-2 text-sm text-navy" role="status">
            {message}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => run('request-changes')}>
            Request Changes
          </button>
          <button type="button" className="btn border-rose-200 text-rose-800 hover:bg-rose-50" onClick={() => run('reject')}>
            Reject
          </button>
          <button type="button" className="btn-secondary" onClick={() => run('approve')}>
            Approve
          </button>
          <button type="button" className="btn-primary" onClick={() => run('approve-publish')}>
            Approve & Publish
          </button>
          {item.status === 'approved' && (
            <button type="button" className="btn-primary" onClick={() => run('publish')}>
              Publish
            </button>
          )}
        </div>
        {confirmPublish && (
          <p className="text-sm text-amber-900">
            Click <strong>Approve & Publish</strong> or <strong>Publish</strong> again to confirm making this content public.
          </p>
        )}
      </div>

    </div>
  );
}
