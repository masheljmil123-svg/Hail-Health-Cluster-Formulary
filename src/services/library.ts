import type { ContentKind, ContentState, DocumentKind, Drug, LibraryDocument } from '@/types';
import { monthKey } from '@/lib/format';

export interface UpdateItem {
  id: string;
  kind: 'drug' | 'protocol' | 'guideline' | 'education' | 'chemotherapy';
  title: string;
  href: string;
  lastUpdated: string;
  status: string;
}

export function collectionFor(state: ContentState, kind: DocumentKind): LibraryDocument[] {
  if (kind === 'protocol') return state.protocols;
  if (kind === 'guideline') return state.guidelines;
  if (kind === 'chemotherapy') return state.chemotherapy;
  return state.education;
}

export function publicUpdates(
  state: ContentState,
  options?: { hospitalId?: string; basePath?: string },
): UpdateItem[] {
  const prefix = options?.basePath ?? '';
  const hospitalId = options?.hospitalId;
  const drugs = hospitalId
    ? state.drugs.filter(
        (item) =>
          item.status === 'published' &&
          (item.hospitalAssignments ?? []).some((row) => row.hospitalId === hospitalId && row.enabled),
      )
    : state.drugs.filter((item) => item.status === 'published');

  const items: UpdateItem[] = [
    ...drugs.map((item) => ({
      id: item.id,
      kind: 'drug' as const,
      title: item.genericName,
      href: `${prefix}/drugs/${item.id}`,
      lastUpdated: item.lastUpdated,
      status: item.status,
    })),
    ...state.protocols
      .filter((item) => item.status === 'published')
      .map((item) => toUpdate(item, 'protocol', `${prefix}/protocols`)),
    ...state.guidelines
      .filter((item) => item.status === 'published')
      .map((item) => toUpdate(item, 'guideline', `${prefix}/guidelines`)),
    ...state.chemotherapy
      .filter((item) => item.status === 'published')
      .map((item) => toUpdate(item, 'chemotherapy', `${prefix}/chemotherapy-protocols`)),
    ...state.education
      .filter((item) => item.status === 'published')
      .map((item) => toUpdate(item, 'education', `${prefix}/education`)),
  ];
  return items.sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated));
}

function toUpdate(item: LibraryDocument, kind: UpdateItem['kind'], base: string): UpdateItem {
  return {
    id: item.id,
    kind,
    title: item.title,
    href: `${base}/${item.id}`,
    lastUpdated: item.lastUpdated,
    status: item.status,
  };
}

export function publishedCount(items: Array<{ status: string }>): number {
  return items.filter((item) => item.status === 'published').length;
}

export function updatedThisMonth(items: Array<{ status: string; lastUpdated: string }>, key = monthKey()): number {
  return items.filter((item) => item.status === 'published' && item.lastUpdated.startsWith(key)).length;
}

export function latestPublishedDate(state: ContentState): string | null {
  const dates = publicUpdates(state).map((item) => item.lastUpdated);
  if (!dates.length) return null;
  return dates.slice().sort((a, b) => b.localeCompare(a))[0];
}

export function totalRecords(state: ContentState): number {
  return (
    state.drugs.length +
    state.protocols.length +
    state.guidelines.length +
    state.education.length +
    state.chemotherapy.length +
    (state.therapeuticClasses?.length ?? 0)
  );
}

export function findDrug(drugs: Drug[], id: string): Drug | undefined {
  return drugs.find((drug) => drug.id === id);
}

export function findDocument(items: LibraryDocument[], id: string): LibraryDocument | undefined {
  return items.find((item) => item.id === id);
}

export const kindLabels: Record<UpdateItem['kind'], string> = {
  drug: 'Drug',
  protocol: 'Protocol',
  guideline: 'Guideline',
  education: 'Patient Counseling Materials',
  chemotherapy: 'Chemotherapy Protocol',
};

export function auditTargetLabel(kind: ContentKind): string {
  switch (kind) {
    case 'drug':
      return 'Drug';
    case 'protocol':
      return 'Protocol';
    case 'guideline':
      return 'Guideline';
    case 'education':
      return 'Patient counseling materials';
    case 'chemotherapy':
      return 'Chemotherapy protocol';
    case 'therapeutic-class':
      return 'Therapeutic class';
    case 'section':
      return 'Homepage section';
    case 'media':
      return 'Media';
    default:
      return 'Settings';
  }
}
