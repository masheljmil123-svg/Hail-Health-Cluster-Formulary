import { FormEvent, useEffect, useState } from 'react';
import { useContent } from '@/hooks/useContent';
import type { HomepageSection } from '@/types';

export function SectionsPage() {
  const { state, updateSection, moveSection, addSection, deleteSection } = useContent();
  const sections = [...state.sections].sort((a, b) => a.order - b.order);
  const [notice, setNotice] = useState('');

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl text-navy">Homepage Sections</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Rename sections, edit descriptions, hide or show them, and change their links. Colors and icons stay fixed so the approved layout does not break. The search field remains available even if the hero text is hidden.
          </p>
        </div>
        <a href="/" target="_blank" rel="noreferrer" className="btn-secondary">
          Preview homepage
        </a>
      </div>
      {notice && <p className="mt-4 rounded-xl bg-clinical px-3 py-2 text-sm text-navy">{notice}</p>}
      <div className="mt-6 space-y-4">
        {sections.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            onSave={(draft) => {
              updateSection(draft);
              setNotice(`Saved “${draft.title}”. The public homepage uses this text now.`);
            }}
            onMove={(direction) => moveSection(section.id, direction)}
            onDelete={() => deleteSection(section.id)}
          />
        ))}
      </div>
      <AddSection
        onAdd={(input) => {
          addSection(input);
          setNotice(`Added “${input.title}”.`);
        }}
      />
    </div>
  );
}

function SectionCard({
  section,
  onSave,
  onMove,
  onDelete,
}: {
  section: HomepageSection;
  onSave: (section: HomepageSection) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(section);
  useEffect(() => {
    setDraft((current) => ({ ...current, order: section.order, visible: section.visible }));
  }, [section.order, section.visible]);

  function patch(partial: Partial<HomepageSection>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  return (
    <form
      className="panel space-y-3 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(draft);
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{section.kind}</p>
        <div className="flex flex-wrap gap-2">
          {section.kind !== 'hero' && (
            <>
              <button type="button" className="btn-secondary" onClick={() => onMove(-1)}>
                Move up
              </button>
              <button type="button" className="btn-secondary" onClick={() => onMove(1)}>
                Move down
              </button>
            </>
          )}
          {section.kind === 'custom' && (
            <button type="button" className="btn text-rose-700 hover:bg-rose-50" onClick={onDelete}>
              Delete
            </button>
          )}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-navy">
        <input type="checkbox" className="accent-primary" checked={draft.visible} onChange={(event) => patch({ visible: event.target.checked })} />
        Show on the homepage
      </label>
      <label className="block">
        <span className="ui-label">Title</span>
        <input className="ui-input" value={draft.title} onChange={(event) => patch({ title: event.target.value })} />
      </label>
      <label className="block">
        <span className="ui-label">Description</span>
        <textarea className="ui-input min-h-20" value={draft.description} onChange={(event) => patch({ description: event.target.value })} />
      </label>
      {section.kind !== 'hero' && section.kind !== 'trending' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="ui-label">Link label</span>
            <input className="ui-input" value={draft.linkLabel} onChange={(event) => patch({ linkLabel: event.target.value })} />
          </label>
          <label className="block">
            <span className="ui-label">Link</span>
            <input className="ui-input" value={draft.linkHref} onChange={(event) => patch({ linkHref: event.target.value })} />
          </label>
        </div>
      )}
      {section.kind === 'hero' && (
        <>
          <label className="block">
            <span className="ui-label">Search placeholder</span>
            <input className="ui-input" value={draft.searchPlaceholder ?? ''} onChange={(event) => patch({ searchPlaceholder: event.target.value })} />
          </label>
          <label className="block">
            <span className="ui-label">Popular searches</span>
            <textarea
              className="ui-input min-h-24"
              value={(draft.popularSearches ?? []).join('\n')}
              onChange={(event) =>
                patch({
                  popularSearches: event.target.value
                    .split('\n')
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
        </>
      )}
      {section.kind === 'feature' && (
        <p className="text-xs text-muted">Accent and icon are locked to the approved card design.</p>
      )}
      <button type="submit" className="btn-primary">
        Save section
      </button>
    </form>
  );
}

function AddSection({ onAdd }: { onAdd: (input: { title: string; description: string; linkLabel: string; linkHref: string }) => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkLabel, setLinkLabel] = useState('Learn more');
  const [linkHref, setLinkHref] = useState('/resources');
  const [error, setError] = useState('');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError('Enter a section title.');
      return;
    }
    onAdd({ title, description, linkLabel, linkHref });
    setTitle('');
    setDescription('');
    setError('');
  }

  return (
    <form onSubmit={onSubmit} className="panel mt-6 space-y-3 p-5">
      <h2 className="font-serif text-2xl text-navy">Add a section</h2>
      <p className="text-sm text-muted">New sections use the same card style and appear below the existing homepage blocks.</p>
      <label className="block">
        <span className="ui-label">Title</span>
        <input className="ui-input" value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label className="block">
        <span className="ui-label">Description</span>
        <textarea className="ui-input min-h-20" value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="ui-label">Link label</span>
          <input className="ui-input" value={linkLabel} onChange={(event) => setLinkLabel(event.target.value)} />
        </label>
        <label className="block">
          <span className="ui-label">Link</span>
          <input className="ui-input" value={linkHref} onChange={(event) => setLinkHref(event.target.value)} />
        </label>
      </div>
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <button type="submit" className="btn-primary">
        Add section
      </button>
    </form>
  );
}
