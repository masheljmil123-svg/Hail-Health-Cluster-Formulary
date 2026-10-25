import { newId } from '@/lib/format';
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
  rejected: 'Rejected',
  approved: 'Approved',
  published: 'Published',
  archived: 'Archived',
};

export const REVIEW_QUEUE_STATUSES: PublicationStatus[] = [
  'pending-review',
  'changes-requested',
  'approved',
  'published',
  'rejected',
];

export function isPubliclyVisible(status: PublicationStatus): boolean {
  return status === 'published';
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
      if (from !== 'approved' && from !== 'published') throw new Error('Publish requires an approved item.');
      to = 'published';
      break;
    case 'approve-publish':
      if (from !== 'pending-review' && from !== 'approved') throw new Error('Approve & Publish requires a pending or approved item.');
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
  if (drug.status !== 'published') return drug;
  const snapshot = drug.publishedSnapshot ?? {
    genericName: drug.genericName,
    brandNames: [...drug.brandNames],
    indicationsSummary: drug.indicationsSummary,
    monographSections: structuredClone(drug.monographSections),
    alertClassification: drug.publishedAlertClassification,
    publishedAt: new Date().toISOString(),
    version: drug.version,
  };
  return {
    ...drug,
    status: 'draft',
    publishedSnapshot: snapshot,
    reviewHistory: appendHistory(drug.reviewHistory, {
      action: 'submit',
      actorId: actor.id,
      actorLabel: actor.label,
      note: 'Revision draft created from published version. Previous approved content remains public until the revision is published.',
      timestamp: new Date().toISOString(),
      fromStatus: 'published',
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

export function finalizeDrugPublish(drug: Drug): Drug {
  return {
    ...drug,
    status: 'published',
    publishedAlertClassification: drug.alertClassification,
    publishedSnapshot: {
      genericName: drug.genericName,
      brandNames: [...drug.brandNames],
      indicationsSummary: drug.indicationsSummary,
      monographSections: structuredClone(drug.monographSections),
      alertClassification: drug.alertClassification,
      publishedAt: new Date().toISOString(),
      version: drug.version,
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
