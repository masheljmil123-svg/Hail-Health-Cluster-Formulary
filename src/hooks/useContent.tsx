import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createEmptyState } from '@/data/seed';
import { newId } from '@/lib/format';
import { loadAccounts } from '@/services/accounts';
import { getContentActorId, getContentActorLabel } from '@/services/auditActor';
import { dispatchWorkflowEmail } from '@/services/emailNotifications';
import { notifyAdministrators, pushNotification } from '@/services/notifications';
import { analyzeAndPurgeDemoRecords, CONTENT_STORAGE_KEY } from '@/services/storage';
import {
  clearWorkspaceState,
  loadWorkspaceState,
  loadWorkspaceStateSync,
  saveWorkspaceState,
} from '@/services/workspaceStore';
import { syncPrimaryClassName } from '@/services/therapeuticClasses';
import {
  applyWorkflowTransition,
  finalizeDocumentPublish,
  finalizeDrugPublish,
} from '@/services/workflow';
import type {
  AuditLogEntry,
  ContentKind,
  ContentState,
  DocumentKind,
  Drug,
  Hospital,
  HomepageSection,
  LibraryDocument,
  MediaRecord,
  PublicationStatus,
  ReviewAction,
  TherapeuticClass,
} from '@/types';
import { ensureHospitalAssignments, sortedHospitals } from '@/services/hospitals';

type ItemKind = 'drug' | DocumentKind;

interface ContentApi {
  state: ContentState;
  saveDrug: (drug: Drug, isNew: boolean) => void;
  saveDocument: (kind: DocumentKind, document: LibraryDocument, isNew: boolean) => void;
  setStatus: (kind: ItemKind, id: string, status: Drug['status']) => void;
  deleteItem: (kind: ItemKind, id: string) => void;
  applyReview: (
    kind: ItemKind,
    id: string,
    action: ReviewAction,
    actor: { id: string; label: string; role: string },
    note?: string,
    /** When provided, upsert this item in the same transaction (avoids stale state after save). */
    itemOverride?: Drug | LibraryDocument,
  ) => { ok: true } | { ok: false; error: string };
  saveTherapeuticClass: (item: TherapeuticClass, isNew: boolean, assignedDrugIds: string[]) => void;
  setTherapeuticClassStatus: (id: string, status: PublicationStatus) => void;
  deleteTherapeuticClass: (id: string) => void;
  moveTherapeuticClass: (id: string, direction: -1 | 1) => void;
  updateSection: (section: HomepageSection) => void;
  moveSection: (id: string, direction: -1 | 1) => void;
  addSection: (input: { title: string; description: string; linkLabel: string; linkHref: string }) => void;
  deleteSection: (id: string) => void;
  saveHospital: (hospital: Hospital, isNew: boolean) => void;
  deleteHospital: (id: string) => void;
  moveHospital: (id: string, direction: -1 | 1) => void;
  updateMedia: (record: MediaRecord) => void;
  addUpload: (input: { title: string; alt: string; src: string }) => void;
  deleteUpload: (id: string) => void;
  recordSearch: (term: string) => void;
  toggleSavedSearch: (term: string) => void;
  resetDemo: () => void;
}

const ContentContext = createContext<ContentApi | null>(null);

function makeAudit(
  partial: Omit<AuditLogEntry, 'id' | 'actorLabel' | 'timestamp'> & { actorLabel?: string; actorId?: string },
): AuditLogEntry {
  return {
    ...partial,
    id: newId('audit'),
    actorLabel: partial.actorLabel ?? getContentActorLabel(),
    actorId: partial.actorId ?? getContentActorId(),
    timestamp: new Date().toISOString(),
  };
}

function auditActionForReview(action: ReviewAction): AuditLogEntry['action'] {
  if (action === 'submit' || action === 'resubmit') return 'submitted';
  if (action === 'approve' || action === 'approve-publish') return 'approved';
  if (action === 'reject') return 'rejected';
  if (action === 'request-changes') return 'changes-requested';
  if (action === 'publish') return 'published';
  return 'updated';
}

function withAudit(state: ContentState, entry: AuditLogEntry): ContentState {
  return { ...state, audit: [entry, ...state.audit].slice(0, 300) };
}

function keyFor(kind: ItemKind): 'drugs' | 'protocols' | 'guidelines' | 'education' | 'chemotherapy' {
  if (kind === 'drug') return 'drugs';
  if (kind === 'protocol') return 'protocols';
  if (kind === 'guideline') return 'guidelines';
  if (kind === 'chemotherapy') return 'chemotherapy';
  return 'education';
}

function labelOf(item: Drug | LibraryDocument): string {
  return 'genericName' in item ? item.genericName : item.title;
}

export function ContentProvider({ children }: { children: ReactNode }) {
  /** Local admin workspace only — never the GitHub Pages published catalog. */
  const [state, setState] = useState<ContentState>(() => loadWorkspaceStateSync());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadWorkspaceState().then((next) => {
      if (!cancelled) {
        setState(next);
        setHydrated(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const { state: purged, report } = analyzeAndPurgeDemoRecords(state);
    if (report.totalRemoved > 0) {
      setState(purged);
      void saveWorkspaceState(purged);
      return;
    }
    void saveWorkspaceState(state);
  }, [state, hydrated]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (
        event.key === CONTENT_STORAGE_KEY ||
        event.key === 'kssh-formulary-content-v2' ||
        event.key === 'kssh-formulary-content-v1'
      ) {
        void loadWorkspaceState().then(setState);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const api = useMemo<ContentApi>(() => {
    return {
      state,
      saveDrug(drug, isNew) {
        setState((current) => {
          const normalized = syncPrimaryClassName(
            {
              ...drug,
              therapeuticClassIds: Array.isArray(drug.therapeuticClassIds) ? drug.therapeuticClassIds : [],
              hospitalAssignments: ensureHospitalAssignments(drug, current.hospitals),
            },
            current.therapeuticClasses,
          );
          const drugs = isNew
            ? [normalized, ...current.drugs.filter((item) => item.id !== normalized.id)]
            : current.drugs.map((item) => (item.id === normalized.id ? normalized : item));
          return withAudit(
            { ...current, drugs },
            makeAudit({
              action: isNew ? 'created' : 'updated',
              targetType: 'drug',
              targetId: normalized.id,
              targetLabel: normalized.genericName,
            }),
          );
        });
      },
      saveTherapeuticClass(item, isNew, assignedDrugIds) {
        setState((current) => {
          const previous = current.therapeuticClasses.find((entry) => entry.id === item.id);
          const therapeuticClasses = isNew
            ? [...current.therapeuticClasses, item]
            : current.therapeuticClasses.map((entry) => (entry.id === item.id ? item : entry));
          const assigned = new Set(assignedDrugIds);
          const drugs = current.drugs.map((drug) => {
            const without = (drug.therapeuticClassIds ?? []).filter((id) => id !== item.id);
            const nextIds = assigned.has(drug.id) ? [...without, item.id] : without;
            return syncPrimaryClassName({ ...drug, therapeuticClassIds: nextIds }, therapeuticClasses);
          });
          return withAudit(
            { ...current, therapeuticClasses, drugs },
            makeAudit({
              action: isNew ? 'created' : previous?.name !== item.name ? 'updated' : 'updated',
              targetType: 'therapeutic-class',
              targetId: item.id,
              targetLabel: item.name,
            }),
          );
        });
      },
      setTherapeuticClassStatus(id, status) {
        setState((current) => {
          const existing = current.therapeuticClasses.find((item) => item.id === id);
          if (!existing) return current;
          const therapeuticClasses = current.therapeuticClasses.map((item) =>
            item.id === id ? { ...item, status } : item,
          );
          const action = status === 'archived' ? 'archived' : status === 'published' ? 'published' : 'restored';
          return withAudit(
            { ...current, therapeuticClasses },
            makeAudit({
              action,
              targetType: 'therapeutic-class',
              targetId: id,
              targetLabel: existing.name,
            }),
          );
        });
      },
      deleteTherapeuticClass(id) {
        setState((current) => {
          const existing = current.therapeuticClasses.find((item) => item.id === id);
          if (!existing) return current;
          const therapeuticClasses = current.therapeuticClasses.filter((item) => item.id !== id);
          const drugs = current.drugs.map((drug) =>
            syncPrimaryClassName(
              {
                ...drug,
                therapeuticClassIds: (drug.therapeuticClassIds ?? []).filter((classId) => classId !== id),
              },
              therapeuticClasses,
            ),
          );
          return withAudit(
            { ...current, therapeuticClasses, drugs },
            makeAudit({
              action: 'deleted',
              targetType: 'therapeutic-class',
              targetId: id,
              targetLabel: existing.name,
            }),
          );
        });
      },
      moveTherapeuticClass(id, direction) {
        setState((current) => {
          const sorted = [...current.therapeuticClasses].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
          const index = sorted.findIndex((item) => item.id === id);
          const target = index + direction;
          if (index < 0 || target < 0 || target >= sorted.length) return current;
          const reordered = [...sorted];
          const [moved] = reordered.splice(index, 1);
          reordered.splice(target, 0, moved);
          const therapeuticClasses = reordered.map((item, itemIndex) => ({ ...item, order: itemIndex + 1 }));
          return { ...current, therapeuticClasses };
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
          // Team members must not publish via direct status mutation — only through applyReview.
          if (status === 'published' || status === 'approved') {
            return current;
          }
          const next = items.map((item) => (item.id === id ? { ...item, status } : item));
          const action = status === 'archived' ? 'archived' : 'restored';
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
      applyReview(kind, id, action, actor, note, itemOverride) {
        if ((action === 'approve' || action === 'publish' || action === 'approve-publish' || action === 'reject' || action === 'request-changes') && actor.role !== 'administrator') {
          return { ok: false, error: 'Only the administrator may approve, publish, reject, or request changes.' };
        }
        if ((action === 'submit' || action === 'resubmit') && actor.role !== 'administrator' && actor.role !== 'team_member') {
          return { ok: false, error: 'Not authorized to submit content.' };
        }

        let error: string | null = null;
        setState((current) => {
          const key = keyFor(kind);
          const items = current[key] as Array<Drug | LibraryDocument>;
          const existing = itemOverride ?? items.find((item) => item.id === id);
          if (!existing) {
            error = 'Record not found.';
            return current;
          }
          try {
            let updated = applyWorkflowTransition(existing, action, { id: actor.id, label: actor.label }, note);
            if (action === 'publish' || action === 'approve-publish') {
              updated =
                kind === 'drug'
                  ? finalizeDrugPublish(updated as Drug)
                  : finalizeDocumentPublish(updated as LibraryDocument);
            }
            const found = items.some((item) => item.id === id);
            const next = found
              ? items.map((item) => (item.id === id ? updated : item))
              : [updated, ...items];
            const title = labelOf(updated);
            const href =
              kind === 'drug'
                ? `/admin/drugs/${id}`
                : kind === 'education'
                  ? `/admin/education/${id}`
                  : kind === 'chemotherapy'
                    ? `/admin/chemotherapy/${id}`
                    : kind === 'guideline'
                      ? `/admin/guidelines/${id}`
                      : `/admin/protocols/${id}`;
            const reviewHref = kind === 'drug' ? `/admin/drugs/${id}?review=1` : `/admin/review-requests/${kind}/${id}`;

            if (action === 'submit' || action === 'resubmit') {
              notifyAdministrators(loadAccounts(), {
                title: `New Review Request: ${title}`,
                message: `${title} submitted by ${actor.label}.`,
                relatedType: kind === 'drug' ? 'drug' : kind,
                relatedId: id,
                href: reviewHref,
              });
              void dispatchWorkflowEmail({
                event: 'submitted',
                subject: `Local review request: ${title}`,
                body: `${title} was submitted in the local workspace.`,
              });
            } else if (existing.authorId) {
              const authorMessages: Partial<
                Record<ReviewAction, { title: string; message: string; event: 'changes-requested' | 'rejected' | 'approved' | 'published' }>
              > = {
                'request-changes': {
                  title: 'Changes requested',
                  message: `The administrator requested changes on “${title}”.${note ? ` Feedback: ${note}` : ''}`,
                  event: 'changes-requested',
                },
                reject: {
                  title: 'Submission rejected',
                  message: `“${title}” was rejected.${note ? ` Reason: ${note}` : ''}`,
                  event: 'rejected',
                },
                approve: {
                  title: 'Submission published',
                  message: `“${title}” was published in the local workspace preview. Online visitors still need a deployment from Settings.`,
                  event: 'approved',
                },
                publish: {
                  title: 'Published locally',
                  message: `“${title}” is published in this browser’s hospital preview. Settings → export is still required before GitHub Pages updates for other visitors.`,
                  event: 'published',
                },
                'approve-publish': {
                  title: 'Approved & published locally',
                  message: `“${title}” is published in this browser only. Other online visitors will not see it until Settings export/import/deploy is completed.`,
                  event: 'published',
                },
              };
              const msg = authorMessages[action];
              if (msg) {
                pushNotification({
                  userId: existing.authorId,
                  title: msg.title,
                  message: msg.message,
                  relatedType: kind === 'drug' ? 'drug' : kind,
                  relatedId: id,
                  href: actor.role === 'administrator' ? href : `/workspace`,
                });
                void dispatchWorkflowEmail({
                  event: msg.event,
                  toUserIds: [existing.authorId],
                  subject: msg.title,
                  body: msg.message,
                });
              }
            }

            return withAudit(
              { ...current, [key]: next },
              makeAudit({
                action: auditActionForReview(action),
                targetType: kind as ContentKind,
                targetId: id,
                targetLabel: title,
                actorLabel: actor.label,
                note,
              }),
            );
          } catch (err) {
            error = err instanceof Error ? err.message : 'Review action failed.';
            return current;
          }
        });
        return error ? { ok: false, error } : { ok: true };
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
      saveHospital(hospital, isNew) {
        setState((current) => {
          const hospitals = isNew
            ? [...current.hospitals, hospital]
            : current.hospitals.map((item) => (item.id === hospital.id ? hospital : item));
          const drugs = current.drugs.map((drug) => ({
            ...drug,
            hospitalAssignments: ensureHospitalAssignments(drug, hospitals),
          }));
          return withAudit(
            { ...current, hospitals, drugs },
            makeAudit({
              action: isNew ? 'created' : 'updated',
              targetType: 'hospital',
              targetId: hospital.id,
              targetLabel: hospital.nameEn,
            }),
          );
        });
      },
      deleteHospital(id) {
        setState((current) => {
          if (current.hospitals.length <= 1) return current;
          const hospital = current.hospitals.find((item) => item.id === id);
          if (!hospital) return current;
          const hospitals = current.hospitals.filter((item) => item.id !== id);
          const drugs = current.drugs.map((drug) => ({
            ...drug,
            hospitalAssignments: (drug.hospitalAssignments ?? []).filter((row) => row.hospitalId !== id),
          }));
          return withAudit(
            { ...current, hospitals, drugs },
            makeAudit({
              action: 'deleted',
              targetType: 'hospital',
              targetId: id,
              targetLabel: hospital.nameEn,
            }),
          );
        });
      },
      moveHospital(id, direction) {
        setState((current) => {
          const ordered = sortedHospitals(current.hospitals);
          const index = ordered.findIndex((item) => item.id === id);
          const target = index + direction;
          if (index < 0 || target < 0 || target >= ordered.length) return current;
          const copy = [...ordered];
          const [moved] = copy.splice(index, 1);
          copy.splice(target, 0, moved);
          const hospitals = copy.map((item, itemIndex) => ({ ...item, displayOrder: itemIndex + 1 }));
          return withAudit(
            { ...current, hospitals },
            makeAudit({
              action: 'updated',
              targetType: 'hospital',
              targetId: id,
              targetLabel: moved.nameEn,
              note: direction < 0 ? 'Moved up' : 'Moved down',
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
        void clearWorkspaceState();
        const next = createEmptyState();
        next.audit = [
          makeAudit({
            action: 'reset',
            targetType: 'settings',
            targetId: 'library-reset',
            targetLabel: 'Local workspace reset to empty',
          }),
        ];
        setState(next);
        void saveWorkspaceState(next);
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
