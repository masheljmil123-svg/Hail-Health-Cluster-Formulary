import { DEMO_ID_SET, isDemoRecordId } from '@/data/demoIds';
import { createEmptyState } from '@/data/seed';
import { migrateContentCollections } from '@/services/migrateDrugs';
import { migrateTherapeuticClasses } from '@/services/therapeuticClasses';
import type { ContentState, Drug, HomepageSection, LibraryDocument } from '@/types';

/**
 * Content persistence key.
 * v3 forces a second purge pass: v2 envelopes were sometimes written with
 * demoPurged:true while still containing seed IDs (HMR saved in-memory demo
 * state into the new key). Purge of known demo IDs is now idempotent on every load.
 */
export const CONTENT_STORAGE_KEY = 'kssh-formulary-content-v3';
const LEGACY_KEYS = ['kssh-formulary-content-v2', 'kssh-formulary-content-v1'] as const;
const BACKUP_KEY = 'kssh-formulary-content-backup-pre-demo-purge';
const VERSION = 3;
/** Increment when the confirmed demo ID list expands and a re-sweep is required. */
const PURGE_GENERATION = 3;

interface Envelope {
  version: number;
  state: ContentState;
  demoPurged?: boolean;
  purgeGeneration?: number;
}

const combinedFeature: HomepageSection = {
  id: 'section-protocols-guidelines',
  kind: 'feature',
  title: 'Protocols & Guidelines',
  description: 'Access therapeutic protocols, pathways, and clinical practice guidelines.',
  visible: true,
  order: 2,
  linkLabel: 'Open protocols & guidelines',
  linkHref: '/protocols-guidelines',
  accent: 'green',
  icon: 'book-check',
};

const chemotherapyFeature: HomepageSection = {
  id: 'section-chemotherapy',
  kind: 'feature',
  title: 'Chemotherapy Protocols',
  description: 'Browse published oncology chemotherapy protocol records when available.',
  visible: true,
  order: 3,
  linkLabel: 'Open chemotherapy protocols',
  linkHref: '/chemotherapy-protocols',
  accent: 'peach',
  icon: 'ribbon',
};

/** Normalize homepage feature cards for Protocols & Guidelines and Chemotherapy Protocols. */
export function migrateHomepageSections(sections: HomepageSection[]): HomepageSection[] {
  const withoutLegacy = sections.filter(
    (section) => section.id !== 'section-protocols' && section.id !== 'section-guidelines',
  );
  const hasCombined = withoutLegacy.some((section) => section.id === 'section-protocols-guidelines');
  let next = hasCombined ? withoutLegacy : [...withoutLegacy, combinedFeature];
  if (!next.some((section) => section.id === 'section-chemotherapy')) {
    next = [...next, chemotherapyFeature];
  }
  return next.map((section) => {
    if (section.id === 'section-protocols-guidelines') {
      return {
        ...section,
        title: section.title || combinedFeature.title,
        linkHref: section.linkHref || combinedFeature.linkHref,
        order: 2,
        icon: section.icon === 'file' || section.icon === 'book' ? 'book-check' : section.icon ?? 'book-check',
        accent: section.accent ?? 'green',
      };
    }
    if (section.id === 'section-chemotherapy') {
      return {
        ...section,
        title: section.title || chemotherapyFeature.title,
        linkHref: section.linkHref || chemotherapyFeature.linkHref,
        order: 3,
        icon: 'ribbon',
        accent: 'peach',
        visible: section.visible,
      };
    }
    if (section.id === 'section-education' && section.kind === 'feature') {
      return {
        ...section,
        order: 4,
        title:
          section.title === 'Patient Education' || !section.title
            ? 'Patient Counseling Materials'
            : section.title,
        description:
          section.description === 'Patient information leaflets and counseling materials.' || !section.description
            ? 'Patient counseling resources, medication-use instructions, and educational materials.'
            : section.description,
        linkLabel:
          section.linkLabel === 'Open education' ? 'Open counseling materials' : section.linkLabel || 'Open counseling materials',
      };
    }
    if (section.id === 'section-drugs' && section.kind === 'feature') {
      return { ...section, order: 1 };
    }
    if (section.id === 'section-hero' && section.kind === 'hero') {
      return {
        ...section,
        popularSearches: Array.isArray(section.popularSearches) ? section.popularSearches : [],
      };
    }
    return section;
  });
}

/**
 * Provenance markers unique to the original demonstration seed text
 * (not drug names alone — real hospital content may reuse the same names).
 */
function hasDemoSeedText(drug: Drug): boolean {
  const overview = JSON.stringify(drug.monographSections ?? []).toLowerCase();
  const summary = (drug.indicationsSummary ?? '').toLowerCase();
  return (
    overview.includes('demonstration catalog record') ||
    overview.includes('not an approved monograph and is not for clinical use') ||
    summary.includes('demonstration catalog summary') ||
    summary.includes('demonstration catalog card') ||
    summary.includes('draft demonstration record') ||
    summary.includes('archived demonstration record')
  );
}

function hasDemoDocumentSeedText(doc: LibraryDocument): boolean {
  const blob = `${doc.summary ?? ''} ${doc.body ?? ''}`.toLowerCase();
  return (
    blob.includes('demonstration') &&
    (blob.includes('demonstration record') ||
      blob.includes('demonstration leaflet') ||
      blob.includes('demonstration pathway') ||
      blob.includes('not for clinical use'))
  );
}

export interface PurgeReport {
  removedDrugIds: string[];
  removedProtocolIds: string[];
  removedGuidelineIds: string[];
  removedEducationIds: string[];
  removedChemotherapyIds: string[];
  removedClassIds: string[];
  removedAuditIds: string[];
  removedSearchTerms: string[];
  ambiguousPreserved: Array<{ kind: string; id: string; title: string; reason: string }>;
  totalRemoved: number;
}

export function analyzeAndPurgeDemoRecords(state: ContentState): { state: ContentState; report: PurgeReport } {
  const demoSearchTerms = new Set(
    ['apixaban', 'vancomycin', 'insulin', 'piperacillin/tazobactam', 'metformin'].map((t) => t.toLowerCase()),
  );

  const removedDrugIds: string[] = [];
  const ambiguousPreserved: PurgeReport['ambiguousPreserved'] = [];

  const drugs = state.drugs.filter((item) => {
    if (isDemoRecordId(item.id) || (item.mergedFromIds ?? []).some(isDemoRecordId)) {
      removedDrugIds.push(item.id);
      return false;
    }
    if (hasDemoSeedText(item)) {
      // Seed text provenance without a listed ID — still confirmed demo copy
      removedDrugIds.push(item.id);
      return false;
    }
    return true;
  });

  const filterDocs = (items: LibraryDocument[], bucket: string[]) =>
    items.filter((item) => {
      if (isDemoRecordId(item.id)) {
        bucket.push(item.id);
        return false;
      }
      if (hasDemoDocumentSeedText(item)) {
        bucket.push(item.id);
        return false;
      }
      return true;
    });

  const removedProtocolIds: string[] = [];
  const removedGuidelineIds: string[] = [];
  const removedEducationIds: string[] = [];
  const removedChemotherapyIds: string[] = [];
  const removedClassIds: string[] = [];
  const removedAuditIds: string[] = [];
  const removedSearchTerms: string[] = [];

  const protocols = filterDocs(state.protocols, removedProtocolIds);
  const guidelines = filterDocs(state.guidelines, removedGuidelineIds);
  const education = filterDocs(state.education, removedEducationIds);
  const chemotherapy = filterDocs(state.chemotherapy ?? [], removedChemotherapyIds);

  const therapeuticClasses = (state.therapeuticClasses ?? []).filter((item) => {
    if (isDemoRecordId(item.id)) {
      removedClassIds.push(item.id);
      return false;
    }
    return true;
  });

  const audit = state.audit.filter((item) => {
    const drop = isDemoRecordId(item.id) || isDemoRecordId(item.targetId) || DEMO_ID_SET.has(item.targetId);
    if (drop) removedAuditIds.push(item.id);
    return !drop;
  });

  const searchCounts = state.searchCounts.filter((item) => {
    const drop = demoSearchTerms.has(item.term.toLowerCase());
    if (drop) removedSearchTerms.push(item.term);
    return !drop;
  });

  // Clear fabricated hero popular searches that mirror the old seed
  const sections = (state.sections ?? []).map((section) => {
    if (section.kind !== 'hero') return section;
    const popular = (section.popularSearches ?? []).filter(
      (term) => !demoSearchTerms.has(term.toLowerCase()) && !['apixaban', 'vancomycin', 'metformin'].includes(term.toLowerCase()),
    );
    return { ...section, popularSearches: popular };
  });

  const next: ContentState = {
    ...state,
    drugs,
    protocols,
    guidelines,
    education,
    chemotherapy,
    therapeuticClasses,
    audit,
    searchCounts,
    sections,
  };

  const totalRemoved =
    removedDrugIds.length +
    removedProtocolIds.length +
    removedGuidelineIds.length +
    removedEducationIds.length +
    removedChemotherapyIds.length +
    removedClassIds.length +
    removedAuditIds.length +
    removedSearchTerms.length;

  return {
    state: next,
    report: {
      removedDrugIds,
      removedProtocolIds,
      removedGuidelineIds,
      removedEducationIds,
      removedChemotherapyIds,
      removedClassIds,
      removedAuditIds,
      removedSearchTerms,
      ambiguousPreserved,
      totalRemoved,
    },
  };
}

/** @deprecated use analyzeAndPurgeDemoRecords */
export function purgeDemoRecords(state: ContentState): ContentState {
  return analyzeAndPurgeDemoRecords(state).state;
}

function normalizeState(state: ContentState): ContentState {
  return migrateContentCollections(
    migrateTherapeuticClasses({
      ...state,
      chemotherapy: state.chemotherapy ?? [],
      therapeuticClasses: state.therapeuticClasses ?? [],
      sections: migrateHomepageSections(state.sections),
    }),
  );
}

function readEnvelope(raw: string): Envelope | null {
  try {
    return JSON.parse(raw) as Envelope;
  } catch {
    return null;
  }
}

function backupOnce(raw: string): void {
  try {
    if (!localStorage.getItem(BACKUP_KEY)) {
      localStorage.setItem(BACKUP_KEY, raw);
    }
  } catch {
    // ignore quota errors — cleanup must still proceed
  }
}

function readAnyStoredEnvelope(): { raw: string; parsed: Envelope } | null {
  const primary = localStorage.getItem(CONTENT_STORAGE_KEY);
  if (primary) {
    const parsed = readEnvelope(primary);
    if (parsed?.state?.sections) return { raw: primary, parsed };
  }
  for (const key of LEGACY_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    const parsed = readEnvelope(raw);
    if (parsed?.state?.sections) return { raw, parsed };
  }
  return null;
}

function clearLegacyKeys(): void {
  for (const key of LEGACY_KEYS) {
    localStorage.removeItem(key);
  }
}

export function countConfirmedDemoRecords(state: ContentState): number {
  return analyzeAndPurgeDemoRecords(state).report.totalRemoved;
}

export function loadContentState(): ContentState {
  try {
    const stored = readAnyStoredEnvelope();
    if (!stored) {
      return createEmptyState();
    }

    const { raw, parsed } = stored;
    if (!parsed.state?.drugs || !parsed.state.sections) {
      return createEmptyState();
    }

    backupOnce(raw);

    // ALWAYS strip known demo IDs / seed provenance — never skip because of a stale demoPurged flag.
    const { state: purged } = analyzeAndPurgeDemoRecords(parsed.state);
    const normalized = normalizeState(purged);

    // Re-purge after migrations in case merge logic touched seed IDs
    const { state: finalState, report } = analyzeAndPurgeDemoRecords(normalized);
    const ready = normalizeState(finalState);

    saveContentState(ready);
    clearLegacyKeys();

    if (typeof window !== 'undefined' && report.totalRemoved > 0) {
      console.info(
        `[formulary] Removed ${report.totalRemoved} confirmed demonstration record(s) from persisted library.`,
        report,
      );
    }

    return ready;
  } catch {
    return createEmptyState();
  }
}

export function saveContentState(state: ContentState): void {
  // Never persist known demo IDs even if a caller passes them (HMR / stale React state).
  const { state: cleaned } = analyzeAndPurgeDemoRecords(state);
  const envelope: Envelope = {
    version: VERSION,
    state: cleaned,
    demoPurged: true,
    purgeGeneration: PURGE_GENERATION,
  };
  localStorage.setItem(CONTENT_STORAGE_KEY, JSON.stringify(envelope));
  clearLegacyKeys();
}

export function clearContentState(): void {
  localStorage.removeItem(CONTENT_STORAGE_KEY);
  clearLegacyKeys();
}
