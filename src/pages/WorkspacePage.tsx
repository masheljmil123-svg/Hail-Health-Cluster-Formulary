import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicationBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { useContent } from '@/hooks/useContent';
import { formatDate } from '@/lib/format';
import { markAllRead, markNotificationRead, notificationsForUser, unreadCount } from '@/services/notifications';
import type { DocumentKind, PublicationStatus } from '@/types';

type Filter = 'all' | PublicationStatus;

interface WorkItem {
  kind: 'drug' | DocumentKind;
  id: string;
  title: string;
  status: PublicationStatus;
  updated: string;
  reviewNote?: string;
  editTo: string;
}

export function WorkspacePage() {
  const { session, allowed } = useAuth();
  const { state, applyReview } = useContent();
  const [filter, setFilter] = useState<Filter>('all');
  const [notifTick, setNotifTick] = useState(0);
  const userId = session?.userId ?? '';

  const items = useMemo(() => {
    if (!session) return [] as WorkItem[];
    const mine = (authorId?: string) => session.role === 'administrator' || authorId === session.userId;
    const list: WorkItem[] = [];
    for (const drug of state.drugs) {
      if (!mine(drug.authorId)) continue;
      list.push({
        kind: 'drug',
        id: drug.id,
        title: drug.genericName,
        status: drug.status,
        updated: drug.lastUpdated,
        reviewNote: drug.reviewNote,
        editTo: `/admin/drugs/${drug.id}`,
      });
    }
    const docs: Array<{ kind: DocumentKind; path: string; rows: typeof state.protocols }> = [
      { kind: 'protocol', path: '/admin/protocols', rows: state.protocols },
      { kind: 'guideline', path: '/admin/guidelines', rows: state.guidelines },
      { kind: 'education', path: '/admin/education', rows: state.education },
      { kind: 'chemotherapy', path: '/admin/chemotherapy', rows: state.chemotherapy },
    ];
    for (const group of docs) {
      for (const row of group.rows) {
        if (!mine(row.authorId)) continue;
        list.push({
          kind: group.kind,
          id: row.id,
          title: row.title,
          status: row.status,
          updated: row.lastUpdated,
          reviewNote: row.reviewNote,
          editTo: `${group.path}/${row.id}`,
        });
      }
    }
    return list.sort((a, b) => b.updated.localeCompare(a.updated));
  }, [state, session]);

  const visible = items.filter((item) => filter === 'all' || item.status === filter);
  const notifications = userId ? notificationsForUser(userId) : [];
  void notifTick;

  const counts = {
    draft: items.filter((i) => i.status === 'draft').length,
    'pending-review': items.filter((i) => i.status === 'pending-review').length,
    'changes-requested': items.filter((i) => i.status === 'changes-requested').length,
    approved: items.filter((i) => i.status === 'approved').length,
    published: items.filter((i) => i.status === 'published').length,
  };

  function resubmit(item: WorkItem) {
    if (!session) return;
    applyReview(item.kind, item.id, 'resubmit', {
      id: session.userId,
      label: session.displayName,
      role: session.role,
    });
  }

  if (!session) return null;

  return (
    <div className="mx-auto max-w-page space-y-8 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Team workspace</p>
          <h1 className="mt-1 font-serif text-4xl text-navy">Hello, {session.displayName}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Prepare drafts, upload documents, and track review status. Only the administrator can approve and publish content.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {allowed('content:create') && (
            <>
              <Link to="/admin/drugs/new" className="btn-primary">
                Add Drug
              </Link>
              <Link to="/admin/education/new" className="btn-secondary">
                Add Counseling Material
              </Link>
              <Link to="/admin/protocols/new" className="btn-secondary">
                Add Protocol
              </Link>
            </>
          )}
          {allowed('content:review') && (
            <Link to="/admin/review-requests" className="btn-secondary">
              Review Requests
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(
          [
            ['draft', 'My Drafts'],
            ['pending-review', 'Pending Review'],
            ['changes-requested', 'Changes Requested'],
            ['approved', 'Approved'],
            ['published', 'Published'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-2xl border px-4 py-4 text-left ${filter === key ? 'border-primary bg-clinical' : 'border-line bg-white'}`}
          >
            <p className="text-2xl font-semibold text-navy">{counts[key]}</p>
            <p className="text-sm text-muted">{label}</p>
          </button>
        ))}
      </div>

      <section className="panel p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-2xl text-navy">My Submissions</h2>
          <button type="button" className="text-sm text-primary hover:underline" onClick={() => setFilter('all')}>
            Show all
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {visible.length === 0 && <p className="py-6 text-sm text-muted">No submissions in this view yet.</p>}
          {visible.map((item) => (
            <article key={`${item.kind}-${item.id}`} className="rounded-2xl border border-line bg-canvas/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-serif text-xl text-navy">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted">
                    {item.kind} · Updated {formatDate(item.updated)}
                  </p>
                  <div className="mt-2">
                    <PublicationBadge status={item.status} />
                  </div>
                  {item.status === 'changes-requested' && item.reviewNote && (
                    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                      Administrator feedback: {item.reviewNote}
                    </p>
                  )}
                  {item.status === 'rejected' && item.reviewNote && (
                    <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                      Rejection reason: {item.reviewNote}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={item.editTo} className="btn-secondary">
                    Edit
                  </Link>
                  {(item.status === 'draft' || item.status === 'changes-requested' || item.status === 'rejected') && (
                    <button type="button" className="btn-primary" onClick={() => resubmit(item)}>
                      {item.status === 'draft' ? 'Submit for Review' : 'Edit & Resubmit'}
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-2xl text-navy">
            Notifications {unreadCount(userId) > 0 && <span className="text-base text-primary">({unreadCount(userId)} unread)</span>}
          </h2>
          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={() => {
              markAllRead(userId);
              setNotifTick((n) => n + 1);
            }}
          >
            Mark all read
          </button>
        </div>
        <ul className="mt-4 divide-y divide-line">
          {notifications.length === 0 && <li className="py-6 text-sm text-muted">No notifications yet.</li>}
          {notifications.slice(0, 20).map((n) => (
            <li key={n.id} className={`py-3 ${n.read ? '' : 'bg-clinical/40'}`}>
              <Link
                to={n.href}
                className="block"
                onClick={() => {
                  markNotificationRead(n.id);
                  setNotifTick((x) => x + 1);
                }}
              >
                <p className="font-medium text-navy">{n.title}</p>
                <p className="text-sm text-muted">{n.message}</p>
                <p className="mt-1 text-xs text-muted">{new Date(n.createdAt).toLocaleString()}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
