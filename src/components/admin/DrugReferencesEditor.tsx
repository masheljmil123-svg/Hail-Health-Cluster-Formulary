import { FileText, Globe, Lock, Pencil, Trash2 } from 'lucide-react';
import { FormEvent, useMemo, useState, type ReactNode } from 'react';
import {
  approvePublicReference,
  canEditReference,
  createDrugReference,
  downloadPrivateReferencesBackup,
  referenceVisibilityLabel,
  rejectPublicReference,
  setReferenceVisibility,
} from '@/services/drugReferences';
import { putMediaFromFile, validateDocumentFile } from '@/services/mediaStore';
import { formatDate, newId } from '@/lib/format';
import type { Drug, DrugReference, DrugReferenceType, DrugReferenceVisibility } from '@/types';

type VisibilityFilter = 'all' | 'private' | 'public' | 'pending';

interface Props {
  drug: Drug;
  isAdmin: boolean;
  session: { userId: string; displayName: string } | null;
  onChange: (references: DrugReference[]) => void;
}

const emptyForm = {
  title: '',
  type: 'external-url' as DrugReferenceType,
  citation: '',
  url: '',
  visibility: 'private' as DrugReferenceVisibility,
  attachmentId: undefined as string | undefined,
  attachmentName: undefined as string | undefined,
  attachmentMimeType: undefined as string | undefined,
};

export function DrugReferencesEditor({ drug, isAdmin, session, onChange }: Props) {
  const references = drug.references ?? [];
  const [filter, setFilter] = useState<VisibilityFilter>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [uploadError, setUploadError] = useState('');
  const [uploadNote, setUploadNote] = useState('');
  const [formError, setFormError] = useState('');

  const filtered = useMemo(() => {
    return references.filter((ref) => {
      if (filter === 'all') return true;
      if (filter === 'private') return ref.visibility === 'private';
      if (filter === 'pending') return ref.visibility === 'public' && ref.approvalStatus === 'pending';
      return ref.visibility === 'public';
    });
  }, [references, filter]);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setUploadError('');
    setUploadNote('');
    setFormOpen(true);
  }

  function openEdit(ref: DrugReference) {
    if (!canEditReference(ref, session, isAdmin)) return;
    setEditingId(ref.id);
    setForm({
      title: ref.title,
      type: ref.type,
      citation: ref.citation ?? '',
      url: ref.url ?? '',
      visibility: ref.visibility,
      attachmentId: ref.attachmentId,
      attachmentName: ref.attachmentName,
      attachmentMimeType: ref.attachmentMimeType,
    });
    setFormError('');
    setUploadError('');
    setUploadNote('');
    setFormOpen(true);
  }

  async function onFileSelected(file: File | undefined) {
    setUploadError('');
    setUploadNote('');
    if (!file) return;
    const invalid = validateDocumentFile(file);
    if (invalid) {
      setUploadError(invalid);
      return;
    }
    const mediaId = newId('ref-file');
    await putMediaFromFile(file, mediaId);
    setForm((current) => ({
      ...current,
      type: 'uploaded-file',
      attachmentId: mediaId,
      attachmentName: file.name,
      attachmentMimeType: file.type || 'application/octet-stream',
    }));
    setUploadNote(
      form.visibility === 'private'
        ? `Stored privately in this browser (IndexedDB): ${file.name}`
        : `Uploaded for public approval workflow: ${file.name}`,
    );
  }

  function saveForm(event: FormEvent) {
    event.preventDefault();
    if (!session) {
      setFormError('Sign in to add references.');
      return;
    }
    const title = form.title.trim();
    if (!title) {
      setFormError('Enter a reference title.');
      return;
    }
    if (form.type === 'external-url' && !isSafeHttpUrl(form.url.trim())) {
      setFormError('Enter a valid http(s) URL.');
      return;
    }
    if (form.type === 'uploaded-file' && !form.attachmentId && !editingId) {
      setFormError('Upload a PDF or document, or change the reference type.');
      return;
    }
    if (form.type === 'citation' && !form.citation.trim()) {
      setFormError('Enter citation information.');
      return;
    }

    if (editingId) {
      const existing = references.find((item) => item.id === editingId);
      if (!existing || !canEditReference(existing, session, isAdmin)) return;
      let next: DrugReference = {
        ...existing,
        title,
        type: form.type,
        citation: form.citation.trim() || undefined,
        url: form.url.trim() || undefined,
        attachmentId: form.attachmentId,
        attachmentName: form.attachmentName,
        attachmentMimeType: form.attachmentMimeType,
        updatedAt: new Date().toISOString(),
      };
      if (form.visibility !== existing.visibility) {
        next = setReferenceVisibility(next, form.visibility, { isAdmin });
      }
      onChange(references.map((item) => (item.id === editingId ? next : item)));
    } else {
      const created = createDrugReference({
        drugId: drug.id,
        title,
        type: form.type,
        citation: form.citation,
        url: form.url,
        attachmentId: form.attachmentId,
        attachmentName: form.attachmentName,
        attachmentMimeType: form.attachmentMimeType,
        visibility: form.visibility,
        createdBy: session.userId,
        createdByLabel: session.displayName,
        approvePublicImmediately: isAdmin,
      });
      onChange([...references, created]);
    }
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function removeReference(ref: DrugReference) {
    if (!canEditReference(ref, session, isAdmin)) return;
    if (!window.confirm(`Remove reference “${ref.title}”?`)) return;
    onChange(references.filter((item) => item.id !== ref.id));
  }

  function changeVisibility(ref: DrugReference, visibility: DrugReferenceVisibility) {
    if (!canEditReference(ref, session, isAdmin)) return;
    if (visibility === 'private' && ref.visibility === 'public' && ref.approvalStatus === 'approved') {
      window.alert(
        'This reference will be removed from future public exports. Earlier downloads or GitHub Pages deployments cannot be recalled.',
      );
    }
    const next = setReferenceVisibility(ref, visibility, { isAdmin });
    onChange(references.map((item) => (item.id === ref.id ? next : item)));
  }

  function approve(ref: DrugReference) {
    if (!isAdmin) return;
    onChange(references.map((item) => (item.id === ref.id ? approvePublicReference(item) : item)));
  }

  function reject(ref: DrugReference) {
    if (!isAdmin) return;
    onChange(references.map((item) => (item.id === ref.id ? rejectPublicReference(item) : item)));
  }

  const privateCount = references.filter((ref) => ref.visibility === 'private').length;

  return (
    <section className="panel space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-navy">References</h2>
          <p className="mt-1 text-sm text-muted">
            Each reference has its own Private or Public setting. New references default to Private.
            Private files stay in this browser’s IndexedDB and are never included in public catalog exports.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {privateCount > 0 && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                if (
                  !window.confirm(
                    'Download a confidential Private references backup JSON for this medication?\n\n' +
                      'This does not include file blobs. Separate browsers do not share Private references securely.',
                  )
                ) {
                  return;
                }
                downloadPrivateReferencesBackup(drug);
              }}
            >
              Private backup
            </button>
          )}
          <button type="button" className="btn-primary" onClick={openAdd}>
            Add reference
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter references">
        {(
          [
            ['all', 'All'],
            ['private', 'Private'],
            ['public', 'Public'],
            ['pending', 'Pending Approval'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={filter === value ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {formOpen && (
        <form onSubmit={saveForm} className="space-y-4 rounded-2xl border border-line bg-canvas p-4">
          <h3 className="font-semibold text-navy">{editingId ? 'Edit reference' : 'Add reference'}</h3>

          <label className="block">
            <span className="ui-label">Title</span>
            <input
              className="ui-input"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="e.g. SmPC — Eliquis 5 mg"
            />
          </label>

          <label className="block">
            <span className="ui-label">Type</span>
            <select
              className="ui-input"
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({ ...current, type: event.target.value as DrugReferenceType }))
              }
            >
              <option value="uploaded-file">Uploaded File</option>
              <option value="external-url">External URL</option>
              <option value="citation">Citation</option>
            </select>
          </label>

          {form.type === 'uploaded-file' && (
            <div>
              <span className="ui-label">PDF / document</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf"
                className="mt-1 block w-full text-sm"
                onChange={(event) => void onFileSelected(event.target.files?.[0])}
              />
              {form.attachmentName && (
                <p className="mt-1 text-sm text-navy">
                  <FileText className="mr-1 inline" size={14} />
                  {form.attachmentName}
                </p>
              )}
              {uploadNote && <p className="mt-1 text-xs text-muted">{uploadNote}</p>}
              {uploadError && <p className="mt-1 text-sm text-rose-700">{uploadError}</p>}
            </div>
          )}

          {form.type === 'external-url' && (
            <label className="block">
              <span className="ui-label">URL</span>
              <input
                className="ui-input"
                value={form.url}
                onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
                placeholder="https://"
              />
            </label>
          )}

          {(form.type === 'citation' || form.type === 'external-url' || form.type === 'uploaded-file') && (
            <label className="block">
              <span className="ui-label">Citation (optional)</span>
              <textarea
                className="ui-input min-h-[72px]"
                value={form.citation}
                onChange={(event) => setForm((current) => ({ ...current, citation: event.target.value }))}
                placeholder="Optional citation details"
              />
            </label>
          )}

          <fieldset>
            <legend className="ui-label">Visibility</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <VisibilityOption
                selected={form.visibility === 'private'}
                icon={<Lock size={16} />}
                title="Private"
                subtitle="Admin & Team Only"
                onSelect={() => setForm((current) => ({ ...current, visibility: 'private' }))}
              />
              <VisibilityOption
                selected={form.visibility === 'public'}
                icon={<Globe size={16} />}
                title="Public"
                subtitle="Visible to authorized visitors after publication"
                onSelect={() => setForm((current) => ({ ...current, visibility: 'public' }))}
              />
            </div>
            {form.visibility === 'public' && !isAdmin && (
              <p className="mt-2 text-xs text-amber-900">
                Public visibility requests administrator approval before the reference can appear on the public
                monograph.
              </p>
            )}
            {form.visibility === 'private' && (
              <p className="mt-2 text-xs text-muted">
                Private is the default. Publishing the medication will not expose this reference.
              </p>
            )}
          </fieldset>

          {formError && <p className="text-sm text-rose-700">{formError}</p>}

          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary">
              {editingId ? 'Save reference' : 'Add reference'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setFormOpen(false);
                setEditingId(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="divide-y divide-line rounded-2xl border border-line">
        {filtered.map((ref) => {
          const editable = canEditReference(ref, session, isAdmin);
          const badge = referenceVisibilityLabel(ref);
          return (
            <li key={ref.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-navy">{ref.title}</p>
                  <VisibilityBadge label={badge} visibility={ref.visibility} pending={ref.approvalStatus === 'pending'} />
                </div>
                <p className="mt-1 text-xs text-muted">
                  {typeLabel(ref.type)}
                  {ref.createdByLabel ? ` · Added by ${ref.createdByLabel}` : ''}
                  {ref.createdAt ? ` · ${formatDate(ref.createdAt)}` : ''}
                </p>
                {ref.url && <p className="mt-1 truncate text-sm text-primary">{ref.url}</p>}
                {ref.attachmentName && (
                  <p className="mt-1 text-sm text-muted">
                    <FileText className="mr-1 inline" size={14} />
                    {ref.attachmentName}
                    {ref.visibility === 'private' ? ' (private local file)' : ''}
                  </p>
                )}
                {ref.citation && <p className="mt-1 text-sm text-muted">{ref.citation}</p>}
                {ref.previouslyPublishedPublic && ref.visibility === 'private' && (
                  <p className="mt-1 text-xs text-amber-900">
                    Previously public — removed from future exports; earlier deployments cannot be recalled.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {isAdmin && ref.visibility === 'public' && ref.approvalStatus === 'pending' && (
                  <>
                    <button type="button" className="btn-primary" onClick={() => approve(ref)}>
                      Approve public
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => reject(ref)}>
                      Reject
                    </button>
                  </>
                )}
                {editable && (
                  <>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => changeVisibility(ref, ref.visibility === 'private' ? 'public' : 'private')}
                    >
                      {ref.visibility === 'private' ? 'Make public' : 'Make private'}
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => openEdit(ref)} aria-label="Edit">
                      <Pencil size={14} />
                    </button>
                    <button type="button" className="btn-danger" onClick={() => removeReference(ref)} aria-label="Remove">
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
        {!filtered.length && (
          <li className="px-4 py-6 text-sm text-muted">
            {references.length === 0 ? 'No references added yet.' : 'No references match this filter.'}
          </li>
        )}
      </ul>
    </section>
  );
}

function VisibilityOption({
  selected,
  icon,
  title,
  subtitle,
  onSelect,
}: {
  selected: boolean;
  icon: ReactNode;
  title: string;
  subtitle: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
        selected ? 'border-primary bg-white shadow-sm' : 'border-line bg-white/60 hover:border-primary/40'
      }`}
      aria-pressed={selected}
    >
      <span className={`mt-0.5 ${selected ? 'text-primary' : 'text-muted'}`}>{icon}</span>
      <span>
        <span className="block font-semibold text-navy">{title}</span>
        <span className="block text-xs text-muted">{subtitle}</span>
      </span>
    </button>
  );
}

function VisibilityBadge({
  label,
  visibility,
  pending,
}: {
  label: string;
  visibility: DrugReferenceVisibility;
  pending: boolean;
}) {
  const tone = pending
    ? 'border-amber-200 bg-amber-50 text-amber-950'
    : visibility === 'private'
      ? 'border-slate-200 bg-slate-50 text-slate-800'
      : 'border-emerald-200 bg-emerald-50 text-emerald-950';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}>
      {visibility === 'private' ? <Lock size={12} /> : <Globe size={12} />}
      {label}
    </span>
  );
}

function typeLabel(type: DrugReferenceType): string {
  if (type === 'uploaded-file') return 'Uploaded file';
  if (type === 'external-url') return 'External URL';
  return 'Citation';
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
