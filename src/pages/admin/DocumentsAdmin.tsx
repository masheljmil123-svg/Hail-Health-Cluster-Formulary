import { FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ResourceTable } from '@/components/admin/ResourceTable';
import { useAuth } from '@/hooks/useAuth';
import { useContent } from '@/hooks/useContent';
import { newId, todayISO } from '@/lib/format';
import { collectionFor } from '@/services/library';
import type { DocumentKind, LibraryDocument, PublicationStatus } from '@/types';
import { AdminCollection } from '@/pages/admin/DrugsAdmin';

const labels: Record<DocumentKind, { title: string; singular: string; noun: string; base: string; publicBase: string }> = {
  protocol: { title: 'Manage Protocols', singular: 'protocol', noun: 'protocols', base: '/admin/protocols', publicBase: '/protocols' },
  guideline: { title: 'Manage Guidelines', singular: 'guideline', noun: 'guidelines', base: '/admin/guidelines', publicBase: '/guidelines' },
  education: { title: 'Manage Patient Education', singular: 'education resource', noun: 'education resources', base: '/admin/education', publicBase: '/education' },
};

export function DocumentsAdmin({ kind }: { kind: DocumentKind }) {
  const { state, setStatus, deleteItem } = useContent();
  const { allowed } = useAuth();
  const meta = labels[kind];
  const canEdit = allowed('content:update');
  return (
    <AdminCollection
      title={meta.title}
      text="Published records appear on the public site immediately. Empty document text is shown as pending clinical review."
      action={canEdit ? { to: `${meta.base}/new`, label: `Add ${meta.singular}` } : undefined}
    >
      <ResourceTable
        noun={meta.noun}
        canEdit={canEdit}
        rows={collectionFor(state, kind).map((item) => ({
          id: item.id,
          title: item.title,
          subtitle: `${item.category} · ${item.language}`,
          status: item.status,
          updated: item.lastUpdated,
          editTo: `${meta.base}/${item.id}`,
          previewTo: `${meta.publicBase}/${item.id}?preview=1`,
        }))}
        onArchive={(id) => setStatus(kind, id, 'archived')}
        onRestore={(id) => setStatus(kind, id, 'draft')}
        onDelete={(id) => deleteItem(kind, id)}
      />
    </AdminCollection>
  );
}

export function DocumentEditor({ kind }: { kind: DocumentKind }) {
  const { id } = useParams();
  return <DocumentEditorForm key={`${kind}-${id ?? 'new'}`} kind={kind} id={id} />;
}

function DocumentEditorForm({ kind, id }: { kind: DocumentKind; id?: string }) {
  const navigate = useNavigate();
  const { state, saveDocument } = useContent();
  const meta = labels[kind];
  const existing = id ? collectionFor(state, kind).find((item) => item.id === id) : undefined;
  const [document, setDocument] = useState<LibraryDocument>(() => existing ?? emptyDocument(kind));
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (id && !existing) return <p className="text-muted">This record was not found.</p>;

  function update<K extends keyof LibraryDocument>(key: K, value: LibraryDocument[K]) {
    setDocument((current) => ({ ...current, [key]: value }));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!document.title.trim()) next.title = 'Enter a title.';
    if (!document.category.trim()) next.category = 'Enter a category.';
    if (!document.version.trim()) next.version = 'Enter a version.';
    setErrors(next);
    if (Object.keys(next).length) return;
    saveDocument(kind, { ...document, title: document.title.trim(), lastUpdated: todayISO() }, !existing);
    navigate(meta.base);
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-5" noValidate>
      <Link to={meta.base} className="text-sm font-medium text-primary hover:underline">
        Back to {meta.noun}
      </Link>
      <h1 className="font-serif text-4xl text-navy">{existing ? `Edit ${meta.singular}` : `Add ${meta.singular}`}</h1>
      <label className="block">
        <span className="ui-label">Title</span>
        <input className="ui-input" value={document.title} onChange={(event) => update('title', event.target.value)} />
        {errors.title && <span className="mt-1 block text-sm text-rose-700">{errors.title}</span>}
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="ui-label">Category</span>
          <input className="ui-input" value={document.category} onChange={(event) => update('category', event.target.value)} />
          {errors.category && <span className="mt-1 block text-sm text-rose-700">{errors.category}</span>}
        </label>
        <label className="block">
          <span className="ui-label">Language</span>
          <input className="ui-input" value={document.language} onChange={(event) => update('language', event.target.value)} />
        </label>
      </div>
      <label className="block">
        <span className="ui-label">Summary</span>
        <textarea className="ui-input min-h-24" value={document.summary} onChange={(event) => update('summary', event.target.value)} />
      </label>
      <label className="block">
        <span className="ui-label">Document text</span>
        <textarea className="ui-input min-h-40" value={document.body} onChange={(event) => update('body', event.target.value)} placeholder="Leave blank if the approved text is not available." />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="ui-label">Version</span>
          <input className="ui-input" value={document.version} onChange={(event) => update('version', event.target.value)} />
          {errors.version && <span className="mt-1 block text-sm text-rose-700">{errors.version}</span>}
        </label>
        <label className="block">
          <span className="ui-label">Publication status</span>
          <select className="ui-input" value={document.status} onChange={(event) => update('status', event.target.value as PublicationStatus)}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>
      <div className="flex gap-3">
        <button type="submit" className="btn-primary">
          Save
        </button>
        <Link to={meta.base} className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function emptyDocument(kind: DocumentKind): LibraryDocument {
  return {
    id: newId(kind),
    title: '',
    summary: '',
    category: '',
    body: '',
    lastUpdated: todayISO(),
    version: '1.0',
    status: 'draft',
    language: 'English',
  };
}
