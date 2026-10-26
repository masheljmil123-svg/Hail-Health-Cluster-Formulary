import { newId } from '@/lib/format';
import { approveAndPublishSection, hasMeaningfulWorkingContent } from '@/services/sectionPublication';
import type {
  Drug,
  LibraryDocument,
  PublicationStatus,
  ReviewAction,
  ReviewHistoryEntry,
} from '@/types';

export const WORKFLOW_LABELS: Record<PublicationStatus, string> = {
  draft: 'Draft',
  'pending-review': 'Pending Review',
  'changes-requested': 'Changes Requested',
  rejected: 'Changes Requested',
  approved: 'Published',
  published: 'Published',
  archived: 'Archived',
};

/** Day-to-day editorial statuses shown in the medication editor. */
export const SIMPLE_EDITORIAL_STATUSES: PublicationStatus[] = [
  'draft',
  'pending-review',
  'changes-requested',
  'published',
];

export const REVIEW_QUEUE_STATUSES: PublicationStatus[] = [
  'pending-review',
  'changes-requested',
  'published',
];

export function isPubliclyVisible(status: PublicationStatus): boolean {
  return status === 'published' || status === 'approved';
}

/** Map internal statuses to supervisor-friendly labels. */
export function simpleEditorialLabel(status: PublicationStatus): string {
  if (status === 'approved' || status === 'published') return 'Published';
  if (status === 'rejected') return 'Changes Requested';
  return WORKFLOW_LABELS[status] ?? status;
}

export function canAuthorEdit(status: PublicationStatus, role: string): boolean {
  if (role === 'administrator') return true;
  return status === 'draft' || status === 'changes-requested' || status === 'rejected';
}

export function canSubmit(status: PublicationStatus): boolean {
  return status === 'draft' || status === 'changes-requested' || status === 'rejected';
}

function appendHistory(
  history: ReviewHistoryEntry[] | undefined,
  entry: Omit<ReviewHistoryEntry, 'id'>,
): ReviewHistoryEntry[] {
  return [{ id: newId('review'), ...entry }, ...(history ?? [])];
}

export function applyWorkflowTransition<T extends { status: PublicationStatus; reviewHistory?: ReviewHistoryEntry[]; reviewNote?: string; submittedAt?: string }>(
  item: T,
  action: ReviewAction,
  actor: { id: string; label: string },
  note?: string,
): T {
  const from = item.status;
  let to: PublicationStatus = from;

  switch (action) {
    case 'submit':
    case 'resubmit':
      if (!canSubmit(from)) throw new Error('This item cannot be submitted in its current status.');
      to = 'pending-review';
      break;
    case 'request-changes':
      if (from !== 'pending-review' && from !== 'approved') throw new Error('Only pending or approved items can receive change requests.');
      to = 'changes-requested';
      break;
    case 'reject':
      if (from !== 'pending-review') throw new Error('Only pending review items can be rejected.');
      to = 'rejected';
      break;
    case 'approve':
      if (from !== 'pending-review') throw new Error('Only pending review items can be approved.');
      to = 'approved';
      break;
    case 'publish':
    case 'approve-publish':
      // Local-first Publish: mark published in this browser workspace for immediate local preview.
      // Online GitHub Pages still requires a separate export/import/deploy step.
      if (
        from !== 'pending-review' &&
        from !== 'approved' &&
        from !== 'draft' &&
        from !== 'published' &&
        from !== 'changes-requested'
      ) {
        throw new Error('Publish requires a draft, pending review, or already published item.');
      }
      to = 'published';
      break;
    default:
      throw new Error('Unknown review action.');
  }

  return {
    ...item,
    status: to,
    reviewNote: note?.trim() || (action === 'request-changes' || action === 'reject' ? item.reviewNote : undefined),
    submittedAt: action === 'submit' || action === 'resubmit' ? new Date().toISOString() : item.submittedAt,
    reviewHistory: appendHistory(item.reviewHistory, {
      action,
      actorId: actor.id,
      actorLabel: actor.label,
      note: note?.trim() || undefined,
      timestamp: new Date().toISOString(),
      fromStatus: from,
      toStatus: to,
    }),
  };
}

/** When editing a published drug, keep public snapshot and move working copy to draft. */
export function beginDrugRevision(drug: Drug, actor: { id: string; label: string }): Drug {
  if (drug.status !== 'published' && drug.status !== 'approved') return drug;
  const fromStatus = drug.status;
  const snapshot = drug.publishedSnapshot ?? {
    genericName: drug.genericName,
    brandNames: [...drug.brandNames],
    indicationsSummary: drug.indicationsSummary,
    monographSections: structuredClone(drug.monographSections),
    alertClassification: drug.publishedAlertClassification,
    publishedAt: new Date().toISOString(),
    version: drug.version,
    references: structuredClone(
      (drug.references ?? []).filter((ref) => ref.visibility === 'public' && ref.approvalStatus === 'approved'),
    ),
  };
  return {
    ...drug,
    status: 'draft',
    publishedSnapshot: snapshot,
    reviewHistory: appendHistory(drug.reviewHistory, {
      action: 'submit',
      actorId: actor.id,
      actorLabel: actor.label,
      note: 'Revision draft created. Previous approved content remains available for export until this revision is prepared again.',
      timestamp: new Date().toISOString(),
      fromStatus,
      toStatus: 'draft',
    }),
  };
}

export function beginDocumentRevision(
  doc: LibraryDocument,
  actor: { id: string; label: string },
): LibraryDocument {
  if (doc.status !== 'published') return doc;
  const snapshot = doc.publishedSnapshot ?? {
    title: doc.title,
    summary: doc.summary,
    attachments: structuredClone(doc.attachments),
    externalLinks: structuredClone(doc.externalLinks),
    version: doc.version,
    publishedAt: new Date().toISOString(),
  };
  return {
    ...doc,
    status: 'draft',
    publishedSnapshot: snapshot,
    reviewHistory: appendHistory(doc.reviewHistory, {
      action: 'submit',
      actorId: actor.id,
      actorLabel: actor.label,
      note: 'Revision draft created. Previous approved files remain public until the revision is published.',
      timestamp: new Date().toISOString(),
      fromStatus: 'published',
      toStatus: 'draft',
    }),
  };
}

/**
 * Local Publish: approve eligible completed sections and mark the medication Published
 * in this browser workspace so hospital views can preview it immediately.
 * Does NOT deploy to GitHub Pages for other visitors.
 */
export function finalizeDrugPublish(drug: Drug): Drug {
  return finalizeDrugReadyForDeployment(drug);
}

export function finalizeDrugReadyForDeployment(drug: Drug): Drug {
  const monographSections = (drug.monographSections ?? []).map((section) => {
    if (section.status === 'published' && section.publishedContent) return section;
    if (!hasMeaningfulWorkingContent(section, drug, [])) return section;
    return approveAndPublishSection(section, drug, []);
  });

  // Publishing the medication never changes Private references or auto-approves pending Public ones.
  const publicApprovedReferences = (drug.references ?? []).filter(
    (ref) => ref.visibility === 'public' && ref.approvalStatus === 'approved',
  );

  return {
    ...drug,
    status: 'published',
    monographSections,
    // Keep full references[] (including Private) in the workspace drug record.
    references: drug.references ?? [],
    publishedAlertClassification: drug.alertClassification,
    publishedSnapshot: {
      genericName: drug.genericName,
      brandNames: [...drug.brandNames],
      indicationsSummary: drug.indicationsSummary,
      monographSections: structuredClone(monographSections),
      alertClassification: drug.alertClassification,
      publishedAt: new Date().toISOString(),
      version: drug.version,
      references: structuredClone(publicApprovedReferences),
    },
  };
}

export function finalizeDocumentPublish(doc: LibraryDocument): LibraryDocument {
  return {
    ...doc,
    status: 'published',
    publishedSnapshot: {
      title: doc.title,
      summary: doc.summary,
      attachments: structuredClone(doc.attachments),
      externalLinks: structuredClone(doc.externalLinks),
      version: doc.version,
      publishedAt: new Date().toISOString(),
    },
  };
}

export type ContentRef =
  | { kind: 'drug'; item: Drug }
  | { kind: 'protocol' | 'guideline' | 'education' | 'chemotherapy'; item: LibraryDocument };

export function contentTitle(ref: ContentRef): string {
  return ref.kind === 'drug' ? ref.item.genericName : ref.item.title;
}
