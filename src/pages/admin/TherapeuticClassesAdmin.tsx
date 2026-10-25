import { ArrowDown, ArrowUp } from 'lucide-react';
import { FormEvent, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PublicationBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { useContent } from '@/hooks/useContent';
import { newId } from '@/lib/format';
import { AdminCollection } from '@/pages/admin/DrugsAdmin';
import type { PublicationStatus, TherapeuticClass, TherapeuticSubclass } from '@/types';

export function TherapeuticClassesAdmin() {
  const { state, setTherapeuticClassStatus, deleteTherapeuticClass, moveTherapeuticClass } = useContent();
  const { allowed } = useAuth();
  const canEdit = allowed('content:update');
  const sorted = useMemo(
    () => [...state.therapeuticClasses].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
    [state.therapeuticClasses],
  );

  return (
    <AdminCollection
      title="Therapeutic Classes"
      text="Organize demonstration therapeutic classes, subclasses, and medication assignments used by the Drug Index."
      action={canEdit ? { to: '/admin/therapeutic-classes/new', label: 'Add class' } : undefined}
    >
      <div className="overflow-hidden rounded-3xl bg-white shadow-card">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Class</th>
              <th className="px-4 py-3 font-semibold">Medications</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Order</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sorted.map((item, index) => {
              const count = state.drugs.filter((drug) => (drug.therapeuticClassIds ?? []).includes(item.id)).length;
              return (
                <tr key={item.id}>
                  <td className="px-4 py-4">
                    <p className="font-medium text-navy">{item.name}</p>
                    <p className="mt-1 text-xs text-muted">
                      {item.subclasses.length} {item.subclasses.length === 1 ? 'subclass' : 'subclasses'}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-muted">{count}</td>
                  <td className="px-4 py-4">
                    <PublicationBadge status={item.status} />
                  </td>
                  <td className="px-4 py-4">
                    {canEdit ? (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="rounded-lg border border-line p-1.5 text-navy disabled:opacity-30"
                          disabled={index === 0}
                          onClick={() => moveTherapeuticClass(item.id, -1)}
                          aria-label={`Move ${item.name} up`}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-line p-1.5 text-navy disabled:opacity-30"
                          disabled={index === sorted.length - 1}
                          onClick={() => moveTherapeuticClass(item.id, 1)}
                          aria-label={`Move ${item.name} down`}
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted">{item.order}</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      {canEdit && (
                        <Link to={`/admin/therapeutic-classes/${item.id}`} className="text-sm font-medium text-primary hover:underline">
                          Edit
                        </Link>
                      )}
                      {canEdit && item.status !== 'archived' && (
                        <button
                          type="button"
                          className="text-sm font-medium text-amber-700 hover:underline"
                          onClick={() => setTherapeuticClassStatus(item.id, 'archived')}
                        >
                          Archive
                        </button>
                      )}
                      {canEdit && item.status === 'archived' && (
                        <button
                          type="button"
                          className="text-sm font-medium text-emerald-700 hover:underline"
                          onClick={() => setTherapeuticClassStatus(item.id, 'published')}
                        >
                          Restore
                        </button>
                      )}
                      {canEdit && allowed('content:delete') && (
                        <button
                          type="button"
                          className="text-sm font-medium text-rose-700 hover:underline"
                          onClick={() => {
                            if (window.confirm(`Delete class “${item.name}”? Medications will not be deleted.`)) {
                              deleteTherapeuticClass(item.id);
                            }
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No therapeutic classes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminCollection>
  );
}

export function TherapeuticClassEditor() {
  const { id } = useParams();
  return <TherapeuticClassEditorForm key={id ?? 'new'} />;
}

function TherapeuticClassEditorForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, saveTherapeuticClass } = useContent();
  const existing = state.therapeuticClasses.find((item) => item.id === id);
  const [item, setItem] = useState<TherapeuticClass>(() => existing ?? emptyClass(state.therapeuticClasses.length + 1));
  const [assigned, setAssigned] = useState<string[]>(() =>
    state.drugs.filter((drug) => (drug.therapeuticClassIds ?? []).includes(item.id)).map((drug) => drug.id),
  );
  const [subclassDraft, setSubclassDraft] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [drugFilter, setDrugFilter] = useState('');

  if (id && !existing) {
    return <p className="text-muted">This therapeutic class was not found.</p>;
  }

  const filteredDrugs = state.drugs
    .filter((drug) => {
      const q = drugFilter.trim().toLowerCase();
      if (!q) return true;
      return drug.genericName.toLowerCase().includes(q) || drug.brandNames.some((name) => name.toLowerCase().includes(q));
    })
    .sort((a, b) => a.genericName.localeCompare(b.genericName));

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!item.name.trim()) next.name = 'Enter a class name.';
    setErrors(next);
    if (Object.keys(next).length) return;
    saveTherapeuticClass(
      {
        ...item,
        name: item.name.trim(),
        description: item.description.trim(),
        subclasses: item.subclasses.map((sub) => ({ ...sub, name: sub.name.trim() })).filter((sub) => sub.name),
      },
      !existing,
      assigned,
    );
    navigate('/admin/therapeutic-classes');
  }

  function addSubclass() {
    const name = subclassDraft.trim();
    if (!name) return;
    const sub: TherapeuticSubclass = { id: newId('sub'), name };
    setItem((current) => ({ ...current, subclasses: [...current.subclasses, sub] }));
    setSubclassDraft('');
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-4xl space-y-6" noValidate>
      <div>
        <Link to="/admin/therapeutic-classes" className="text-sm font-medium text-primary hover:underline">
          Back to therapeutic classes
        </Link>
        <h1 className="mt-2 font-serif text-4xl text-navy">{existing ? 'Edit therapeutic class' : 'Add therapeutic class'}</h1>
        <p className="mt-2 text-sm text-muted">
          Stable identifiers are kept when a class is renamed. Archiving hides a class from the public Drug Index without
          deleting medication records.
        </p>
      </div>

      <section className="panel space-y-4 p-6">
        <h2 className="font-serif text-2xl text-navy">Class details</h2>
        <Field label="Name" error={errors.name}>
          <input className="ui-input" value={item.name} onChange={(event) => setItem((current) => ({ ...current, name: event.target.value }))} />
        </Field>
        <Field label="Description">
          <textarea
            className="ui-input min-h-24"
            value={item.description}
            onChange={(event) => setItem((current) => ({ ...current, description: event.target.value }))}
          />
        </Field>
        <Field label="Publication status">
          <select
            className="ui-input"
            value={item.status}
            onChange={(event) => setItem((current) => ({ ...current, status: event.target.value as PublicationStatus }))}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </Field>
      </section>

      <section className="panel space-y-4 p-6">
        <h2 className="font-serif text-2xl text-navy">Subclasses</h2>
        <p className="text-sm text-muted">Optional labels shown when browsing this class. They do not create new medication records.</p>
        <ul className="space-y-2">
          {item.subclasses.map((sub) => (
            <li key={sub.id} className="flex items-center gap-2">
              <input
                className="ui-input"
                value={sub.name}
                onChange={(event) =>
                  setItem((current) => ({
                    ...current,
                    subclasses: current.subclasses.map((entry) =>
                      entry.id === sub.id ? { ...entry, name: event.target.value } : entry,
                    ),
                  }))
                }
              />
              <button
                type="button"
                className="shrink-0 text-sm font-medium text-rose-700 hover:underline"
                onClick={() => setItem((current) => ({ ...current, subclasses: current.subclasses.filter((entry) => entry.id !== sub.id) }))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <input
            className="ui-input max-w-sm"
            value={subclassDraft}
            onChange={(event) => setSubclassDraft(event.target.value)}
            placeholder="Add subclass name"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addSubclass();
              }
            }}
          />
          <button type="button" className="btn-secondary" onClick={addSubclass}>
            Add subclass
          </button>
        </div>
      </section>

      <section className="panel space-y-4 p-6">
        <h2 className="font-serif text-2xl text-navy">Assigned medications</h2>
        <p className="text-sm text-muted">A medication may belong to one or more classes. Unchecking removes only this class assignment.</p>
        <input
          className="ui-input max-w-sm"
          value={drugFilter}
          onChange={(event) => setDrugFilter(event.target.value)}
          placeholder="Filter medications…"
        />
        <div className="max-h-80 space-y-2 overflow-y-auto rounded-2xl border border-line p-3">
          {filteredDrugs.map((drug) => (
            <label key={drug.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-canvas">
              <input
                type="checkbox"
                className="accent-primary"
                checked={assigned.includes(drug.id)}
                onChange={() =>
                  setAssigned((current) =>
                    current.includes(drug.id) ? current.filter((id) => id !== drug.id) : [...current, drug.id],
                  )
                }
              />
              <span>
                <span className="block text-sm font-medium text-navy">{drug.genericName}</span>
                <span className="text-xs text-muted">{drug.status}</span>
              </span>
            </label>
          ))}
          {filteredDrugs.length === 0 && <p className="px-2 py-4 text-sm text-muted">No medications match this filter.</p>}
        </div>
      </section>

      <div className="flex gap-3">
        <button type="submit" className="btn-primary">
          Save class
        </button>
        <Link to="/admin/therapeutic-classes" className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function emptyClass(order: number): TherapeuticClass {
  return {
    id: newId('class'),
    name: '',
    description: '',
    subclasses: [],
    order,
    status: 'draft',
  };
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="ui-label">{label}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-rose-700">{error}</span>}
    </label>
  );
}
