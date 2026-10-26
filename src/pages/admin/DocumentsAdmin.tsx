import { FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ResourceTable } from '@/components/admin/ResourceTable';
import { useAuth } from '@/hooks/useAuth';
import { useContent } from '@/hooks/useContent';
import { newId, todayISO } from '@/lib/format';
import { isSafeUrl } from '@/lib/richtext';
import { collectionFor } from '@/services/library';
import { MEDIA_LIMITS, putMediaFromFile, validateDocumentFile } from '@/services/mediaStore';
import { beginDocumentRevision, canSubmit } from '@/services/workflow';
import type { DocumentKind, LibraryDocument, PublicationStatus, ResourceAttachment, ResourceLink } from '@/types';
import { AdminCollection } from '@/pages/admin/DrugsAdmin';

const labels: Record<DocumentKind, { title: string; singular: string; noun: string; base: string; publicBase: string }> = {
  protocol: { title: 'Manage Protocols', singular: 'protocol', noun: 'protocols', base: '/admin/protocols', publicBase: '/protocols' },
  guideline: { title: 'Manage Guidelines', singular: 'guideline', noun: 'guidelines', base: '/admin/guidelines', publicBase: '/guidelines' },
  education: {
    title: 'Manage Patient Counseling Materials',
    singular: 'counseling material',
    noun: 'counseling materials',
    base: '/admin/education',
    publicBase: '/education',
  },
  chemotherapy: {
    title: 'Manage Chemotherapy Protocols',
    singular: 'chemotherapy protocol',
    noun: 'chemotherapy protocols',
    base: '/admin/chemotherapy',
    publicBase: '/chemotherapy-protocols',
  },
};

/** All resource types use document/link management — no rich-text body required. */
const fileBasedKinds: DocumentKind[] = ['protocol', 'guideline', 'chemotherapy', 'education'];

export function DocumentsAdmin({ kind }: { kind: DocumentKind }) {
  const { state, setStatus, deleteItem } = useContent();
  const { allowed } = useAuth();
  const meta = labels[kind];
  const canEdit = allowed('content:update') || allowed('content:create');
  const rows = collectionFor(state, kind);
  return (
    <AdminCollection
      title={kind === 'protocol' || kind === 'guideline' ? 'Protocols & Guidelines' : meta.title}
      text="Upload PDF, DOCX, or image files, or add external links. Document body text is optional. Only published records appear on the public library."
      action={canEdit ? { to: `${meta.base}/new`, label: `Add ${meta.singular}` } : undefined}
    >
      {(kind === 'protocol' || kind === 'guideline') && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Link
            to="/admin/protocols"
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${kind === 'protocol' ? 'bg-navy text-white' : 'bg-white text-navy shadow-sm'}`}
          >
            Protocols
          </Link>
          <Link
            to="/admin/guidelines"
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${kind === 'guideline' ? 'bg-navy text-white' : 'bg-white text-navy shadow-sm'}`}
          >
            Guidelines
          </Link>
        </div>
      )}
      {rows.length === 0 ? (
        <div className="panel p-10 text-center">
          <p className="font-serif text-2xl text-navy">No {meta.noun} yet.</p>
          <p className="mt-2 text-sm text-muted">Approved materials will appear on the public site once published.</p>
          {canEdit && (
            <Link to={`${meta.base}/new`} className="btn-primary mt-5 inline-flex">
              Add {meta.singular}
            </Link>
          )}
        </div>
      ) : (
        <ResourceTable
          noun={meta.noun}
          canEdit={canEdit}
          rows={rows.map((item) => ({
            id: item.id,
            title: item.title,
            subtitle: `${item.category || 'Uncategorized'} · ${item.language}${item.attachments[0]?.name ? ` · ${item.attachments[0].name}` : item.externalLinks[0] ? ` · Link` : ''}`,
            status: item.status,
            updated: item.lastUpdated,
            editTo: `${meta.base}/${item.id}`,
            previewTo: `${meta.publicBase}/${item.id}?preview=1`,
          }))}
          onArchive={(id) => setStatus(kind, id, 'archived')}
          onRestore={(id) => setStatus(kind, id, 'draft')}
          onDelete={(id) => deleteItem(kind, id)}
        />
      )}
    </AdminCollection>
  );
}

export function DocumentEditor({ kind }: { kind: DocumentKind }) {
  const { id } = useParams();
  return <DocumentEditorForm key={`${kind}-${id ?? 'new'}`} kind={kind} id={id} />;
}

function DocumentEditorForm({ kind, id }: { kind: DocumentKind; id?: string }) {
  const navigate = useNavigate();
  const { state, saveDocument, applyReview } = useContent();
  const { session, allowed } = useAuth();
  const meta = labels[kind];
  const existing = id ? collectionFor(state, kind).find((item) => item.id === id) : undefined;
  const [document, setDocument] = useState<LibraryDocument>(() => {
    const base = existing ?? emptyDocument(kind, session);
    if (existing?.status === 'published' && session && !allowed('content:publish')) {
      return beginDocumentRevision(base, { id: session.userId, label: session.displayName });
    }
    return base;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadError, setUploadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [linkDraft, setLinkDraft] = useState({ label: '', url: '' });
  const [feedback, setFeedback] = useState('');

  if (id && !existing) return <p className="text-muted">This record was not found.</p>;

  const isAdmin = allowed('content:publish');
  const canEdit =
    isAdmin ||
    !existing ||
    existing.authorId === session?.userId ||
    document.status === 'draft' ||
    document.status === 'changes-requested' ||
    document.status === 'rejected';

  function update<K extends keyof LibraryDocument>(key: K, value: LibraryDocument[K]) {
    setDocument((current) => ({ ...current, [key]: value }));
  }

  function persist(next: LibraryDocument, isNew: boolean) {
    const withAuthor: LibraryDocument = {
      ...next,
      title: next.title.trim(),
      lastUpdated: todayISO(),
      body: '',
      authorId: next.authorId || session?.userId,
      authorLabel: next.authorLabel || session?.displayName,
      status: isAdmin ? next.status : next.status === 'published' || next.status === 'approved' ? 'draft' : next.status,
    };
    saveDocument(kind, withAuthor, isNew);
    return withAuthor;
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canEdit) {
      setErrors({ form: 'You cannot edit this record.' });
      return;
    }
    const next: Record<string, string> = {};
    if (!document.title.trim()) next.title = 'Enter a title.';
    if (!document.version.trim()) next.version = 'Enter a version.';
    setErrors(next);
    if (Object.keys(next).length) return;
    persist(document, !existing);
    navigate(meta.base);
  }

  async function onFileSelected(file: File | undefined) {
    setUploadError('');
    setUploadProgress('');
    if (!file) return;
    if (document.attachments.length >= MEDIA_LIMITS.maxAttachmentsPerItem) {
      setUploadError(`Limit of ${MEDIA_LIMITS.maxAttachmentsPerItem} attachments per material.`);
      return;
    }
    const invalid = validateDocumentFile(file);
    if (invalid) {
      setUploadError(invalid);
      return;
    }
    setUploadProgress(`Uploading ${file.name}…`);
    const mediaId = newId('file');
    await putMediaFromFile(file, mediaId);
    const attachment: ResourceAttachment = {
      id: newId('attach'),
      name: file.name,
      mediaId,
      mimeType: file.type || guessMime(file.name),
    };
    update('attachments', [...document.attachments, attachment]);
    setUploadProgress(`Uploaded ${file.name}`);
  }

  async function replaceAttachment(attachId: string, file: File | undefined) {
    if (!file) return;
    const invalid = validateDocumentFile(file);
    if (invalid) {
      setUploadError(invalid);
      return;
    }
    setUploadProgress(`Replacing with ${file.name}…`);
    const mediaId = newId('file');
    await putMediaFromFile(file, mediaId);
    update(
      'attachments',
      document.attachments.map((item) =>
        item.id === attachId
          ? { ...item, name: file.name, mediaId, mimeType: file.type || guessMime(file.name), url: undefined }
          : item,
      ),
    );
    setUploadProgress(`Replaced attachment with ${file.name}`);
  }

  function addLink() {
    if (!linkDraft.url.trim() || !isSafeUrl(linkDraft.url.trim())) {
      setUploadError('Enter a valid http(s) URL.');
      return;
    }
    const link: ResourceLink = {
      id: newId('link'),
      label: linkDraft.label.trim() || linkDraft.url.trim(),
      url: linkDraft.url.trim(),
    };
    update('externalLinks', [...document.externalLinks, link]);
    setLinkDraft({ label: '', url: '' });
    setUploadError('');
  }

  function submitForReview() {
    if (!session) return;
    const saved: LibraryDocument = {
      ...document,
      title: document.title.trim(),
      lastUpdated: todayISO(),
      body: '',
      status: 'draft',
      authorId: document.authorId || session.userId,
      authorLabel: document.authorLabel || session.displayName,
    };
    if (!saved.title.trim()) {
      setErrors({ title: 'Enter a title.' });
      return;
    }
    const result = applyReview(
      kind,
      saved.id,
      existing && canSubmit(existing.status) && existing.status !== 'draft' ? 'resubmit' : 'submit',
      { id: session.userId, label: session.displayName, role: session.role },
      undefined,
      saved,
    );
    if (!result.ok) {
      setFeedback(result.error);
      return;
    }
    setFeedback('Submitted for administrator review. It will not appear publicly until approved and published.');
    navigate('/workspace');
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-5" noValidate>
      <Link to={meta.base} className="text-sm font-medium text-primary hover:underline">
        Back to {meta.noun}
      </Link>
      <h1 className="font-serif text-4xl text-navy">{existing ? `Edit ${meta.singular}` : `Add ${meta.singular}`}</h1>
      <p className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-950">
        Upload the approved document files. Staff do not need to rewrite the document contents in this editor. Draft and
        pending-review files are not publicly accessible.
      </p>
      {document.status === 'changes-requested' && document.reviewNote && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Changes requested: {document.reviewNote}
        </p>
      )}
      <label className="block">
        <span className="ui-label">Material title</span>
        <input className="ui-input" value={document.title} onChange={(event) => update('title', event.target.value)} disabled={!canEdit} />
        {errors.title && <span className="mt-1 block text-sm text-rose-700">{errors.title}</span>}
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="ui-label">Language</span>
          <select className="ui-input" value={document.language} onChange={(event) => update('language', event.target.value)} disabled={!canEdit}>
            <option value="Arabic">Arabic</option>
            <option value="English">English</option>
            <option value="Other">Other</option>
          </select>
        </label>
        <label className="block">
          <span className="ui-label">Category (optional)</span>
          <input className="ui-input" value={document.category} onChange={(event) => update('category', event.target.value)} disabled={!canEdit} />
        </label>
      </div>
      <label className="block">
        <span className="ui-label">Short description (optional)</span>
        <textarea className="ui-input min-h-24" value={document.summary} onChange={(event) => update('summary', event.target.value)} disabled={!canEdit} />
      </label>

      {fileBasedKinds.includes(kind) && (
        <div className="space-y-3 rounded-2xl border border-line p-4">
          <h2 className="font-serif text-xl text-navy">Uploaded documents</h2>
          <input
            type="file"
            accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="block w-full text-sm"
            disabled={!canEdit}
            onChange={(event) => void onFileSelected(event.target.files?.[0])}
          />
          {uploadProgress && <p className="text-sm text-primary">{uploadProgress}</p>}
          <ul className="space-y-3">
            {document.attachments.map((item) => (
              <li key={item.id} className="rounded-xl border border-line bg-canvas/60 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-navy">{item.name}</span>
                  <div className="flex flex-wrap gap-2">
                    <label className="cursor-pointer text-primary hover:underline">
                      Replace
                      <input
                        type="file"
                        className="hidden"
                        disabled={!canEdit}
                        onChange={(event) => void replaceAttachment(item.id, event.target.files?.[0])}
                      />
                    </label>
                    <button
                      type="button"
                      className="text-rose-700 hover:underline"
                      disabled={!canEdit}
                      onClick={() => update('attachments', document.attachments.filter((entry) => entry.id !== item.id))}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted">{item.mimeType || 'attachment'}</p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">Use the file control above to add another attachment (up to {MEDIA_LIMITS.maxAttachmentsPerItem}).</p>

          <h2 className="pt-2 font-serif text-xl text-navy">External URLs (optional)</h2>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              className="ui-input"
              placeholder="Label"
              value={linkDraft.label}
              disabled={!canEdit}
              onChange={(event) => setLinkDraft((current) => ({ ...current, label: event.target.value }))}
            />
            <input
              className="ui-input"
              placeholder="https://…"
              value={linkDraft.url}
              disabled={!canEdit}
              onChange={(event) => setLinkDraft((current) => ({ ...current, url: event.target.value }))}
            />
            <button type="button" className="btn-secondary" disabled={!canEdit} onClick={addLink}>
              Add link
            </button>
          </div>
          <ul className="space-y-2">
            {document.externalLinks.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <a href={item.url} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                  {item.label}
                </a>
                <button
                  type="button"
                  className="text-rose-700 hover:underline"
                  disabled={!canEdit}
                  onClick={() => update('externalLinks', document.externalLinks.filter((entry) => entry.id !== item.id))}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          {uploadError && <p className="text-sm text-rose-700">{uploadError}</p>}
        </div>
      )}

      <div className="space-y-2 rounded-2xl border border-line p-4">
        <h2 className="font-serif text-xl text-navy">Associated medication (optional)</h2>
        <div className="max-h-48 space-y-2 overflow-y-auto">
          {state.drugs.length === 0 && <p className="text-sm text-muted">No medications available yet.</p>}
          {state.drugs.map((drug) => (
            <label key={drug.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-primary"
                disabled={!canEdit}
                checked={document.relatedDrugIds.includes(drug.id)}
                onChange={() =>
                  update(
                    'relatedDrugIds',
                    document.relatedDrugIds.includes(drug.id)
                      ? document.relatedDrugIds.filter((item) => item !== drug.id)
                      : [...document.relatedDrugIds, drug.id],
                  )
                }
              />
              {drug.genericName}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="ui-label">Version</span>
          <input className="ui-input" value={document.version} onChange={(event) => update('version', event.target.value)} disabled={!canEdit} />
          {errors.version && <span className="mt-1 block text-sm text-rose-700">{errors.version}</span>}
        </label>
        <label className="block">
          <span className="ui-label">Last review date</span>
          <input
            className="ui-input"
            type="date"
            value={document.lastReviewedAt || ''}
            onChange={(event) => update('lastReviewedAt', event.target.value)}
            disabled={!canEdit}
          />
        </label>
        <label className="block">
          <span className="ui-label">Author</span>
          <input className="ui-input" value={document.authorLabel || session?.displayName || ''} readOnly />
        </label>
        <label className="block">
          <span className="ui-label">{isAdmin ? 'Workflow status' : 'Approval / publication status'}</span>
          {isAdmin ? (
            <select
              className="ui-input"
              value={document.status}
              onChange={(event) => update('status', event.target.value as PublicationStatus)}
            >
              <option value="draft">Draft</option>
              <option value="pending-review">Pending Review</option>
              <option value="changes-requested">Changes Requested</option>
              <option value="rejected">Rejected</option>
              <option value="approved">Approved</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          ) : (
            <input className="ui-input" value={document.status} readOnly />
          )}
        </label>
      </div>
      {errors.form && <p className="text-sm text-rose-700">{errors.form}</p>}
      {feedback && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{feedback}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn-primary" disabled={!canEdit}>
          Save as Draft
        </button>
        {canEdit && canSubmit(document.status) && (
          <button type="button" className="btn-secondary" onClick={submitForReview}>
            Submit for Review
          </button>
        )}
        <Link to={meta.base} className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function guessMime(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

function emptyDocument(kind: DocumentKind, session: { userId: string; displayName: string } | null): LibraryDocument {
  return {
    id: newId(kind),
    title: '',
    summary: '',
    category: '',
    body: '',
    lastUpdated: todayISO(),
    lastReviewedAt: '',
    version: '1.0',
    status: 'draft',
    language: 'English',
    references: '',
    attachments: [],
    externalLinks: [],
    relatedDrugIds: [],
    authorId: session?.userId,
    authorLabel: session?.displayName,
    reviewHistory: [],
  };
}
