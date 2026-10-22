import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createSeedState } from '@/data/seed';
import { newId } from '@/lib/format';
import { CONTENT_STORAGE_KEY, clearContentState, loadContentState, saveContentState } from '@/services/storage';
import type {
  AuditLogEntry,
  ContentKind,
  ContentState,
  DocumentKind,
  Drug,
  HomepageSection,
  LibraryDocument,
  MediaRecord,
} from '@/types';

type ItemKind = 'drug' | DocumentKind;

interface ContentApi {
  state: ContentState;
  saveDrug: (drug: Drug, isNew: boolean) => void;
  saveDocument: (kind: DocumentKind, document: LibraryDocument, isNew: boolean) => void;
  setStatus: (kind: ItemKind, id: string, status: Drug['status']) => void;
  deleteItem: (kind: ItemKind, id: string) => void;
  updateSection: (section: HomepageSection) => void;
  moveSection: (id: string, direction: -1 | 1) => void;
  addSection: (input: { title: string; description: string; linkLabel: string; linkHref: string }) => void;
  deleteSection: (id: string) => void;
  updateMedia: (record: MediaRecord) => void;
  addUpload: (input: { title: string; alt: string; src: string }) => void;
  deleteUpload: (id: string) => void;
  recordSearch: (term: string) => void;
  toggleSavedSearch: (term: string) => void;
  resetDemo: () => void;
}

const ContentContext = createContext<ContentApi | null>(null);

function makeAudit(partial: Omit<AuditLogEntry, 'id' | 'actorLabel' | 'timestamp'>): AuditLogEntry {
  return {
    ...partial,
    id: newId('audit'),
    actorLabel: 'Administrator',
    timestamp: new Date().toISOString(),
  };
}

function withAudit(state: ContentState, entry: AuditLogEntry): ContentState {
  return { ...state, audit: [entry, ...state.audit].slice(0, 300) };
}

function keyFor(kind: ItemKind): 'drugs' | 'protocols' | 'guidelines' | 'education' {
  if (kind === 'drug') return 'drugs';
  if (kind === 'protocol') return 'protocols';
  if (kind === 'guideline') return 'guidelines';
  return 'education';
}

function labelOf(item: Drug | LibraryDocument): string {
  return 'genericName' in item ? item.genericName : item.title;
}

export function ContentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ContentState>(() => loadContentState());

  useEffect(() => {
    saveContentState(state);
  }, [state]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === CONTENT_STORAGE_KEY) setState(loadContentState());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const api = useMemo<ContentApi>(() => {
    return {
      state,
      saveDrug(drug, isNew) {
        setState((current) => {
          const drugs = isNew
            ? [drug, ...current.drugs.filter((item) => item.id !== drug.id)]
            : current.drugs.map((item) => (item.id === drug.id ? drug : item));
          return withAudit(
            { ...current, drugs },
            makeAudit({
              action: isNew ? 'created' : 'updated',
              targetType: 'drug',
              targetId: drug.id,
              targetLabel: drug.genericName,
            }),
          );
        });
      },
      saveDocument(kind, document, isNew) {
        setState((current) => {
          const key = keyFor(kind);
          const items = current[key] as LibraryDocument[];
          const next = isNew
            ? [document, ...items.filter((item) => item.id !== document.id)]
            : items.map((item) => (item.id === document.id ? document : item));
          return withAudit(
            { ...current, [key]: next },
            makeAudit({
              action: isNew ? 'created' : 'updated',
              targetType: kind,
              targetId: document.id,
              targetLabel: document.title,
            }),
          );
        });
      },
      setStatus(kind, id, status) {
        setState((current) => {
          const key = keyFor(kind);
          const items = current[key] as Array<Drug | LibraryDocument>;
          const existing = items.find((item) => item.id === id);
          if (!existing) return current;
          const next = items.map((item) => (item.id === id ? { ...item, status } : item));
          const action = status === 'archived' ? 'archived' : status === 'published' ? 'published' : 'restored';
          return withAudit(
            { ...current, [key]: next },
            makeAudit({
              action,
              targetType: kind as ContentKind,
              targetId: id,
              targetLabel: labelOf(existing),
            }),
          );
        });
      },
      deleteItem(kind, id) {
        setState((current) => {
          const key = keyFor(kind);
          const items = current[key] as Array<Drug | LibraryDocument>;
          const existing = items.find((item) => item.id === id);
          if (!existing) return current;
          return withAudit(
            { ...current, [key]: items.filter((item) => item.id !== id) },
            makeAudit({
              action: 'deleted',
              targetType: kind as ContentKind,
              targetId: id,
              targetLabel: labelOf(existing),
            }),
          );
        });
      },
      updateSection(section) {
        setState((current) =>
          withAudit(
            {
              ...current,
              sections: current.sections.map((item) => (item.id === section.id ? section : item)),
            },
            makeAudit({
              action: 'updated',
              targetType: 'section',
              targetId: section.id,
              targetLabel: section.title,
            }),
          ),
        );
      },
      moveSection(id, direction) {
        setState((current) => {
          const section = current.sections.find((item) => item.id === id);
          if (!section || section.kind === 'hero') return current;
          const groupOf = (item: HomepageSection) => (item.kind === 'feature' ? 'feature' : 'lower');
          const siblings = current.sections
            .filter((item) => groupOf(item) === groupOf(section))
            .sort((a, b) => a.order - b.order);
          const index = siblings.findIndex((item) => item.id === id);
          const target = index + direction;
          if (index < 0 || target < 0 || target >= siblings.length) return current;
          const reordered = [...siblings];
          const [moved] = reordered.splice(index, 1);
          reordered.splice(target, 0, moved);
          const base = groupOf(section) === 'feature' ? 1 : 10;
          const orders = new Map(reordered.map((item, itemIndex) => [item.id, base + itemIndex]));
          return {
            ...current,
            sections: current.sections.map((item) =>
              orders.has(item.id) ? { ...item, order: orders.get(item.id) ?? item.order } : item,
            ),
          };
        });
      },
      addSection(input) {
        setState((current) => {
          const order = Math.max(10, ...current.sections.map((item) => item.order)) + 1;
          const section: HomepageSection = {
            id: newId('section'),
            kind: 'custom',
            title: input.title.trim() || 'New section',
            description: input.description.trim(),
            visible: true,
            order,
            linkLabel: input.linkLabel.trim() || 'Learn more',
            linkHref: input.linkHref.trim() || '/resources',
          };
          return withAudit(
            { ...current, sections: [...current.sections, section] },
            makeAudit({
              action: 'created',
              targetType: 'section',
              targetId: section.id,
              targetLabel: section.title,
            }),
          );
        });
      },
      deleteSection(id) {
        setState((current) => {
          const section = current.sections.find((item) => item.id === id);
          if (!section || section.kind !== 'custom') return current;
          return withAudit(
            { ...current, sections: current.sections.filter((item) => item.id !== id) },
            makeAudit({
              action: 'deleted',
              targetType: 'section',
              targetId: id,
              targetLabel: section.title,
            }),
          );
        });
      },
      updateMedia(record) {
        setState((current) => ({
          ...current,
          media: current.media.map((item) => (item.id === record.id ? record : item)),
          audit: [
            makeAudit({
              action: 'updated',
              targetType: 'media',
              targetId: record.id,
              targetLabel: record.title,
            }),
            ...current.audit,
          ].slice(0, 300),
        }));
      },
      addUpload(input) {
        setState((current) => {
          const record: MediaRecord = {
            id: newId('media'),
            assetKey: 'upload',
            title: input.title.trim() || 'Uploaded image',
            alt: input.alt.trim() || 'Uploaded demonstration image',
            src: input.src,
          };
          return withAudit(
            { ...current, media: [...current.media, record] },
            makeAudit({
              action: 'created',
              targetType: 'media',
              targetId: record.id,
              targetLabel: record.title,
            }),
          );
        });
      },
      deleteUpload(id) {
        setState((current) => {
          const record = current.media.find((item) => item.id === id);
          if (!record || record.assetKey !== 'upload') return current;
          return withAudit(
            { ...current, media: current.media.filter((item) => item.id !== id) },
            makeAudit({
              action: 'deleted',
              targetType: 'media',
              targetId: id,
              targetLabel: record.title,
            }),
          );
        });
      },
      recordSearch(term) {
        const clean = term.trim();
        if (!clean) return;
        setState((current) => {
          const match = current.searchCounts.find((item) => item.term.toLowerCase() === clean.toLowerCase());
          const searchCounts = match
            ? current.searchCounts.map((item) => (item === match ? { ...item, count: item.count + 1 } : item))
            : [...current.searchCounts, { term: clean, count: 1 }];
          return { ...current, searchCounts };
        });
      },
      toggleSavedSearch(term) {
        const clean = term.trim();
        if (!clean) return;
        setState((current) => {
          const exists = current.savedSearches.some((item) => item.toLowerCase() === clean.toLowerCase());
          return {
            ...current,
            savedSearches: exists
              ? current.savedSearches.filter((item) => item.toLowerCase() !== clean.toLowerCase())
              : [clean, ...current.savedSearches],
          };
        });
      },
      resetDemo() {
        clearContentState();
        const next = createSeedState();
        next.audit = [
          makeAudit({
            action: 'reset',
            targetType: 'settings',
            targetId: 'demo-data',
            targetLabel: 'Demonstration library',
          }),
          ...next.audit,
        ];
        setState(next);
      },
    };
  }, [state]);

  return <ContentContext.Provider value={api}>{children}</ContentContext.Provider>;
}

export function useContent(): ContentApi {
  const context = useContext(ContentContext);
  if (!context) throw new Error('useContent must be used within ContentProvider');
  return context;
}
