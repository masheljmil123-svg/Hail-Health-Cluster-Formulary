import { newId } from '@/lib/format';
import type {
  Drug,
  DrugReference,
  DrugReferenceApprovalStatus,
  DrugReferenceType,
  DrugReferenceVisibility,
} from '@/types';

const REF_TYPES: DrugReferenceType[] = ['uploaded-file', 'external-url', 'citation'];
const VISIBILITIES: DrugReferenceVisibility[] = ['private', 'public'];
const APPROVALS: DrugReferenceApprovalStatus[] = ['not-required', 'pending', 'approved', 'rejected'];

export function isPubliclyVisibleReference(ref: DrugReference): boolean {
  return ref.visibility === 'public' && ref.approvalStatus === 'approved';
}

/** Approved Public references only — used by the public monograph and catalog export. */
export function getPublicReferences(drug: Drug): DrugReference[] {
  return (drug.references ?? []).filter(isPubliclyVisibleReference);
}

export function countPendingPublicReferences(drug: Drug): number {
  return (drug.references ?? []).filter(
    (ref) => ref.visibility === 'public' && ref.approvalStatus === 'pending',
  ).length;
}

export function normalizeDrugReferences(
  raw: unknown,
  drugId: string,
): DrugReference[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => normalizeOneReference(item, drugId))
    .filter((item): item is DrugReference => Boolean(item));
}

function normalizeOneReference(raw: unknown, drugId: string): DrugReference | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Partial<DrugReference>;
  const title = String(item.title ?? '').trim();
  if (!title) return null;

  const type = REF_TYPES.includes(item.type as DrugReferenceType)
    ? (item.type as DrugReferenceType)
    : 'citation';
  // Legacy / unknown items default to private so they are never auto-exposed.
  const visibility = VISIBILITIES.includes(item.visibility as DrugReferenceVisibility)
    ? (item.visibility as DrugReferenceVisibility)
    : 'private';
  let approvalStatus = APPROVALS.includes(item.approvalStatus as DrugReferenceApprovalStatus)
    ? (item.approvalStatus as DrugReferenceApprovalStatus)
    : 'not-required';

  if (visibility === 'private') {
    approvalStatus = 'not-required';
  } else if (approvalStatus === 'not-required') {
    // Public without an established approval must not appear publicly.
    approvalStatus = 'pending';
  }

  const now = new Date().toISOString();
  return {
    id: String(item.id || newId('ref')),
    drugId: String(item.drugId || drugId),
    title,
    type,
    citation: item.citation?.trim() || undefined,
    url: item.url?.trim() || undefined,
    attachmentId: item.attachmentId || undefined,
    attachmentName: item.attachmentName || undefined,
    attachmentMimeType: item.attachmentMimeType || undefined,
    visibility,
    approvalStatus,
    createdBy: String(item.createdBy || 'unknown'),
    createdByLabel: item.createdByLabel,
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || now,
    previouslyPublishedPublic: Boolean(item.previouslyPublishedPublic),
  };
}

export function createDrugReference(input: {
  drugId: string;
  title: string;
  type: DrugReferenceType;
  citation?: string;
  url?: string;
  attachmentId?: string;
  attachmentName?: string;
  attachmentMimeType?: string;
  visibility?: DrugReferenceVisibility;
  createdBy: string;
  createdByLabel?: string;
  /** When true (administrator), Public is approved immediately. Team Public starts pending. */
  approvePublicImmediately?: boolean;
}): DrugReference {
  const now = new Date().toISOString();
  const visibility = input.visibility ?? 'private';
  let approvalStatus: DrugReferenceApprovalStatus = 'not-required';
  if (visibility === 'public') {
    approvalStatus = input.approvePublicImmediately ? 'approved' : 'pending';
  }
  return {
    id: newId('ref'),
    drugId: input.drugId,
    title: input.title.trim(),
    type: input.type,
    citation: input.citation?.trim() || undefined,
    url: input.url?.trim() || undefined,
    attachmentId: input.attachmentId,
    attachmentName: input.attachmentName,
    attachmentMimeType: input.attachmentMimeType,
    visibility,
    approvalStatus,
    createdBy: input.createdBy,
    createdByLabel: input.createdByLabel,
    createdAt: now,
    updatedAt: now,
  };
}

export function setReferenceVisibility(
  ref: DrugReference,
  visibility: DrugReferenceVisibility,
  options: { isAdmin: boolean },
): DrugReference {
  const now = new Date().toISOString();
  if (visibility === 'private') {
    const wasApprovedPublic = ref.visibility === 'public' && ref.approvalStatus === 'approved';
    return {
      ...ref,
      visibility: 'private',
      approvalStatus: 'not-required',
      updatedAt: now,
      previouslyPublishedPublic: wasApprovedPublic || ref.previouslyPublishedPublic,
    };
  }
  // Switching to Public always requires admin approval unless the actor is admin approving now.
  return {
    ...ref,
    visibility: 'public',
    approvalStatus: options.isAdmin ? 'approved' : 'pending',
    updatedAt: now,
  };
}

export function approvePublicReference(ref: DrugReference): DrugReference {
  if (ref.visibility !== 'public') return ref;
  return {
    ...ref,
    approvalStatus: 'approved',
    updatedAt: new Date().toISOString(),
  };
}

export function rejectPublicReference(ref: DrugReference): DrugReference {
  if (ref.visibility !== 'public') return ref;
  return {
    ...ref,
    approvalStatus: 'rejected',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Strip private / unapproved references for public catalog export.
 * Never copies private attachment ids into the published package.
 * Does not mutate Private references in the workspace original.
 */
export function sanitizeDrugReferencesForPublicExport(drug: Drug): Drug {
  const publicRefs = getPublicReferences(drug).map((ref) => ({
    ...ref,
    // Public export may include external URLs and citation text only;
    // IndexedDB attachment blobs are not bundled into GitHub Pages assets.
    // Keep attachment metadata for local admin preview after import only when
    // the file was already approved public — still no blob bytes in JSON.
    attachmentId: ref.attachmentId,
    previouslyPublishedPublic: undefined,
  }));

  const publishedSnapshot = drug.publishedSnapshot
    ? {
        ...drug.publishedSnapshot,
        references: getPublicReferences({
          ...drug,
          references: drug.publishedSnapshot.references ?? publicRefs,
        }),
      }
    : drug.publishedSnapshot;

  return {
    ...drug,
    references: publicRefs,
    publishedSnapshot,
  };
}

/**
 * Explicit private backup for transferring local work between trusted browsers.
 * Includes Private reference metadata only — not a secure multi-device sync.
 */
export function buildPrivateReferencesBackup(drug: Drug): {
  format: 'hail-formulary-private-references';
  version: 1;
  exportedAt: string;
  confidentialityWarning: string;
  drugId: string;
  genericName: string;
  references: DrugReference[];
} {
  return {
    format: 'hail-formulary-private-references',
    version: 1,
    exportedAt: new Date().toISOString(),
    confidentialityWarning:
      'CONFIDENTIAL — Contains Private medication references for local evaluation only. ' +
      'Not shared across browsers or devices. Do not commit to a public repository or deploy to GitHub Pages. ' +
      'Uploaded file blobs remain in IndexedDB on this browser and are not included in this JSON.',
    drugId: drug.id,
    genericName: drug.genericName,
    references: (drug.references ?? []).filter((ref) => ref.visibility === 'private'),
  };
}

export function downloadPrivateReferencesBackup(drug: Drug): void {
  const payload = buildPrivateReferencesBackup(drug);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `private-references-${drug.id}-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function referenceVisibilityLabel(ref: DrugReference): string {
  if (ref.visibility === 'private') return 'Private';
  if (ref.approvalStatus === 'pending') return 'Pending Approval';
  if (ref.approvalStatus === 'rejected') return 'Public (Rejected)';
  if (ref.approvalStatus === 'approved') return 'Public';
  return 'Public';
}

export function canEditReference(
  ref: DrugReference,
  session: { userId: string } | null,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  if (!session) return false;
  return ref.createdBy === session.userId;
}
