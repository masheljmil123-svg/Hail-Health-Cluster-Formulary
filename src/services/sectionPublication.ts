import { todayISO } from '@/lib/format';
import { isRichDocEmpty, renderRichTextHtml } from '@/lib/richtext';
import type {
  Drug,
  LibraryDocument,
  MonographSection,
  MonographSectionPublishedSnapshot,
  RichDoc,
  SectionPublicationStatus,
} from '@/types';

const PLACEHOLDER_PATTERNS = [
  /^pending clinical review\.?$/i,
  /^no information available\.?$/i,
  /^not provided\.?$/i,
  /^coming soon\.?$/i,
  /^n\/?a\.?$/i,
  /^tbd\.?$/i,
  /^to be determined\.?$/i,
  /^demonstration catalog record\b/i,
];

export const SECTION_STATUS_LABEL: Record<SectionPublicationStatus, string> = {
  empty: 'Empty',
  draft: 'Draft',
  'pending-approval': 'Pending Approval',
  published: 'Published',
};

export function isPlaceholderText(value: string): boolean {
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) return true;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text));
}

export function richTextPlain(doc?: RichDoc | null): string {
  if (!doc) return '';
  const html = renderRichTextHtml(doc);
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hasMeaningfulRichText(doc?: RichDoc | null): boolean {
  if (isRichDocEmpty(doc)) return false;
  const plain = richTextPlain(doc);
  return Boolean(plain) && !isPlaceholderText(plain);
}

function hasMeaningfulTextValue(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const text = value.replace(/\s+/g, ' ').trim();
  return Boolean(text) && !isPlaceholderText(text);
}

function snapshotOf(section: MonographSection): {
  richText?: RichDoc | null;
  structured?: MonographSection['structured'];
} {
  return {
    richText: section.richText,
    structured: section.structured,
  };
}

/** Meaningful working-copy content (admin editor). */
export function hasMeaningfulWorkingContent(
  section: MonographSection,
  drug: Drug,
  relatedDocs: LibraryDocument[] = [],
): boolean {
  return contentIsMeaningful(section, snapshotOf(section), drug, relatedDocs);
}

/** Meaningful approved public snapshot. */
export function hasMeaningfulPublishedContent(
  section: MonographSection,
  drug: Drug,
  relatedDocs: LibraryDocument[] = [],
): boolean {
  if (!section.publishedContent) return false;
  return contentIsMeaningful(section, section.publishedContent, drug, relatedDocs);
}

function contentIsMeaningful(
  section: MonographSection,
  content: { richText?: RichDoc | null; structured?: MonographSection['structured'] },
  drug: Drug,
  relatedDocs: LibraryDocument[],
): boolean {
  if (hasMeaningfulRichText(content.richText)) return true;

  const structured = content.structured ?? {};

  if (section.key === 'brand-name') {
    return drug.brandNames.some((name) => hasMeaningfulTextValue(name));
  }
  if (section.key === 'synonyms') {
    return drug.synonyms.some((name) => hasMeaningfulTextValue(name));
  }
  if (section.key === 'therapeutic-class') {
    return hasMeaningfulTextValue(drug.therapeuticClass);
  }
  if (section.key === 'dosage-forms') {
    return drug.formulations.length > 0;
  }
  if (section.key === 'dosing') {
    return (
      drug.dosingEntries.some(
        (entry) =>
          hasMeaningfulTextValue(entry.indication) ||
          hasMeaningfulTextValue(entry.dose) ||
          hasMeaningfulTextValue(entry.notes),
      ) || hasMeaningfulRichText(content.richText)
    );
  }
  if (section.key === 'dosage-adjustment') {
    return ['kidney', 'liver', 'obesity'].some((key) => hasMeaningfulTextValue(structured[key]));
  }
  if (section.key === 'administration') {
    if (structured.noSpecialInstructions === true) return true;
    return hasMeaningfulTextValue(structured.specificInstructions);
  }
  if (section.key === 'fee') {
    return structured.applicable === true || structured.applicable === false || drug.feeApplicable === true || drug.feeApplicable === false;
  }
  if (section.key === 'medication-safety') {
    if (hasMeaningfulTextValue(structured.notes)) return true;
    if (drug.alertClassification === 'high-alert' || drug.alertClassification === 'low') return true;
    if (drug.safetyFlags.includes('lasa') || drug.safetyFlags.includes('hazardous') || drug.hasBoxedWarning) return true;
    if (structured.highAlert === true || structured.lasa === true || structured.hazardous === true) return true;
    // Explicit negatives are meaningful only once the administrator has published this section.
    if (section.status === 'published' && section.publishedContent) return true;
    return false;
  }
  if (section.key === 'guidelines-protocols') {
    return relatedDocs.length > 0 || hasMeaningfulRichText(content.richText);
  }

  // Generic structured: any non-empty string / true boolean / false when intentional fee-like
  for (const value of Object.values(structured)) {
    if (typeof value === 'boolean') {
      // bare false flags alone do not count for generic structured keys
      if (value === true) return true;
      continue;
    }
    if (hasMeaningfulTextValue(value)) return true;
    if (value && typeof value === 'object' && hasMeaningfulRichText(value as RichDoc)) return true;
  }

  return false;
}

/** Public monograph: published + allowed + meaningful approved content. */
export function isSectionPubliclyVisible(
  section: MonographSection,
  drug: Drug,
  relatedDocs: LibraryDocument[] = [],
): boolean {
  if (!section.isVisible) return false;
  if (section.status !== 'published') return false;
  return hasMeaningfulPublishedContent(section, drug, relatedDocs);
}

export function getPublicSections(
  drug: Drug,
  relatedDocs: LibraryDocument[] = [],
): MonographSection[] {
  return [...drug.monographSections]
    .filter((section) => isSectionPubliclyVisible(section, drug, relatedDocs))
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/** Content used when rendering a public (or preview) section body. */
export function resolveSectionRenderContent(
  section: MonographSection,
  options: { preview?: boolean },
): { richText?: RichDoc | null; structured?: MonographSection['structured'] } {
  if (options.preview) {
    return { richText: section.richText, structured: section.structured };
  }
  return {
    richText: section.publishedContent?.richText ?? null,
    structured: section.publishedContent?.structured,
  };
}

export function deriveStatusAfterEdit(
  section: MonographSection,
  drug: Drug,
  relatedDocs: LibraryDocument[] = [],
): SectionPublicationStatus {
  const meaningful = hasMeaningfulWorkingContent(section, drug, relatedDocs);
  if (section.status === 'published') {
    // Keep public snapshot; working copy becomes a revision.
    return meaningful ? 'draft' : 'draft';
  }
  if (!meaningful) {
    return section.publishedContent ? 'draft' : 'empty';
  }
  if (section.status === 'pending-approval') return 'pending-approval';
  return 'draft';
}

export function applySectionEdit(
  section: MonographSection,
  updates: Partial<MonographSection>,
  drug: Drug,
  relatedDocs: LibraryDocument[] = [],
): MonographSection {
  const next: MonographSection = { ...section, ...updates };
  // Editing a published section must not clear the public snapshot.
  if (section.status === 'published' && section.publishedContent) {
    next.publishedContent = section.publishedContent;
  }
  next.status = deriveStatusAfterEdit(next, drug, relatedDocs);
  return next;
}

export function approveAndPublishSection(section: MonographSection, drug: Drug, relatedDocs: LibraryDocument[] = []): MonographSection {
  const working = { ...section, status: 'draft' as const };
  if (!hasMeaningfulWorkingContent(working, drug, relatedDocs)) {
    return { ...section, status: section.publishedContent ? 'draft' : 'empty' };
  }
  const snapshot: MonographSectionPublishedSnapshot = {
    richText: section.richText ?? null,
    structured: section.structured ? { ...section.structured } : undefined,
    publishedAt: todayISO(),
  };
  return {
    ...section,
    status: 'published',
    isVisible: true,
    publishedContent: snapshot,
  };
}

export function submitSectionForApproval(section: MonographSection, drug: Drug, relatedDocs: LibraryDocument[] = []): MonographSection {
  if (!hasMeaningfulWorkingContent(section, drug, relatedDocs)) {
    return { ...section, status: section.publishedContent ? 'draft' : 'empty' };
  }
  return { ...section, status: 'pending-approval' };
}

export function unpublishSection(section: MonographSection, drug: Drug, relatedDocs: LibraryDocument[] = []): MonographSection {
  const meaningful = hasMeaningfulWorkingContent({ ...section, publishedContent: null }, drug, relatedDocs);
  return {
    ...section,
    status: meaningful ? 'draft' : 'empty',
    publishedContent: null,
  };
}

export function normalizeSectionPublication(section: MonographSection, drug: Drug, relatedDocs: LibraryDocument[] = []): MonographSection {
  const status = section.status;
  const known =
    status === 'empty' || status === 'draft' || status === 'pending-approval' || status === 'published';

  if (known) {
    if (status === 'published' && !section.publishedContent && hasMeaningfulWorkingContent(section, drug, relatedDocs)) {
      return {
        ...section,
        publishedContent: {
          richText: section.richText ?? null,
          structured: section.structured ? { ...section.structured } : undefined,
          publishedAt: drug.lastReviewedAt || drug.lastUpdated || todayISO(),
        },
      };
    }
    if (status === 'published' && section.publishedContent && !hasMeaningfulPublishedContent(section, drug, relatedDocs)) {
      return unpublishSection(section, drug, relatedDocs);
    }
    return section;
  }

  // Legacy records (no section workflow yet): preserve previously visible content as published.
  const meaningful = hasMeaningfulWorkingContent({ ...section, status: 'draft' }, drug, relatedDocs);
  if (section.isVisible !== false && meaningful) {
    return {
      ...section,
      status: 'published',
      isVisible: true,
      publishedContent: {
        richText: section.richText ?? null,
        structured: section.structured ? { ...section.structured } : undefined,
        publishedAt: drug.lastReviewedAt || drug.lastUpdated || todayISO(),
      },
    };
  }
  return {
    ...section,
    status: meaningful ? 'draft' : 'empty',
    publishedContent: section.publishedContent ?? null,
  };
}

export function countPublishedSections(drug: Drug, relatedDocs: LibraryDocument[] = []): number {
  return drug.monographSections.filter((section) => isSectionPubliclyVisible(section, drug, relatedDocs)).length;
}

export function canPublishDrug(drug: Drug, relatedDocs: LibraryDocument[] = []): { ok: boolean; reason?: string } {
  if (countPublishedSections(drug, relatedDocs) === 0) {
    return {
      ok: false,
      reason:
        'Publish at least one monograph section with approved clinical content (Approve & Publish) before publishing this drug.',
    };
  }
  return { ok: true };
}
