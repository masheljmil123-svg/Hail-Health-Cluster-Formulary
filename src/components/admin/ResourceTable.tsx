import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { PublicationBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/format';
import type { PublicationStatus } from '@/types';

export interface ResourceRow {
  id: string;
  title: string;
  subtitle: string;
  status: PublicationStatus;
  updated: string;
  editTo: string;
  previewTo: string;
}

export function ResourceTable({
  rows,
  noun,
  canEdit,
  onArchive,
  onRestore,
  onDelete,
}: {
  rows: ResourceRow[];
  noun: string;
  canEdit: boolean;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | PublicationStatus>('all');
  const [pendingDelete, setPendingDelete] = useState<ResourceRow | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = status === 'all' || row.status === status;
      const matchesQuery = !needle || `${row.title} ${row.subtitle}`.toLowerCase().includes(needle);
      return matchesStatus && matchesQuery;
    });
  }, [rows, query, status]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor={`${noun}-search`}>
          Search {noun}
        </label>
        <input
          id={`${noun}-search`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${noun}`}
          className="ui-input sm:max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          {(
            [
              'all',
              'draft',
              'pending-review',
              'changes-requested',
              'approved',
              'published',
              'rejected',
              'archived',
            ] as const
          ).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStatus(item)}
              className={`rounded-full px-3 py-2 text-sm ${status === item ? 'bg-navy text-white' : 'bg-white text-navy shadow-sm'}`}
            >
              {item === 'all' ? 'All' : item.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="panel p-10 text-center">
          <p className="font-serif text-2xl text-navy">No {noun} added yet.</p>
          <p className="mt-2 text-sm text-muted">Start by adding your first record. Approved content will appear on the public site once published.</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="panel p-8 text-sm text-muted">No {noun} match this view.</div>
      ) : (
        <div className="space-y-3">
          {visible.map((row) => (
            <article key={row.id} className="panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="truncate font-serif text-xl text-navy">{row.title}</h2>
                <p className="truncate text-sm text-muted">{row.subtitle}</p>
                <p className="mt-1 text-xs text-muted">Updated {formatDate(row.updated)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <PublicationBadge status={row.status} />
                {canEdit && (
                  <Link to={row.editTo} className="btn-secondary">
                    Edit
                  </Link>
                )}
                <a href={row.previewTo} target="_blank" rel="noreferrer" className="btn-secondary">
                  Preview
                </a>
                {canEdit && row.status !== 'archived' && (
                  <button type="button" className="btn-secondary" onClick={() => onArchive(row.id)}>
                    Archive
                  </button>
                )}
                {canEdit && row.status === 'archived' && (
                  <button type="button" className="btn-secondary" onClick={() => onRestore(row.id)}>
                    Restore
                  </button>
                )}
                {canEdit && (
                  <button type="button" className="btn text-rose-700 hover:bg-rose-50" onClick={() => setPendingDelete(row)}>
                    Delete
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={Boolean(pendingDelete)} title={`Delete ${noun.slice(0, -1) || noun}?`} onClose={() => setPendingDelete(null)}>
        <p>
          Delete “{pendingDelete?.title}” from this browser’s demonstration library? This cannot be undone in the prototype.
        </p>
        <div className="mt-5 flex justify-end gap-2">
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
