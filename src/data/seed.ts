import { migrateContentCollections } from '@/services/migrateDrugs';
import type { ContentState, HomepageSection, MediaRecord } from '@/types';

/**
 * Structural homepage sections and branding media only.
 * No demonstration drugs, protocols, guidelines, counseling materials,
 * fabricated audit rows, or trending search counts.
 */
const sections: HomepageSection[] = [
  {
    id: 'section-hero',
    kind: 'hero',
    title: 'Hail Health Cluster Formulary',
    description: 'Search medications, protocols, guidelines, and patient counseling materials.',
    visible: true,
    order: 0,
    linkLabel: 'Search the formulary',
    linkHref: '/search',
    searchPlaceholder: 'Search medications, brands, or classes…',
    popularSearches: [],
  },
  {
    id: 'section-drugs',
    kind: 'feature',
    title: 'Drug Index',
    description: 'Browse medications alphabetically or by therapeutic class.',
    visible: true,
    order: 1,
    linkLabel: 'Open drug index',
    linkHref: '/drug-index',
    accent: 'blue',
    icon: 'pill',
  },
  {
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
  },
  {
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
  },
  {
    id: 'section-education',
    kind: 'feature',
    title: 'Patient Counseling Materials',
    description: 'Patient counseling resources, medication-use instructions, and educational materials.',
    visible: true,
    order: 4,
    linkLabel: 'Open counseling materials',
    linkHref: '/education',
    accent: 'lavender',
    icon: 'users',
  },
  {
    id: 'section-updates',
    kind: 'updates',
    title: 'Latest Updates',
    description: 'Recently added or updated content in the Hail Health Cluster Formulary.',
    visible: true,
    order: 10,
    linkLabel: 'View all updates',
    linkHref: '/updates',
  },
  {
    id: 'section-trending',
    kind: 'trending',
    title: 'Trending Searches',
    description: 'Most commonly searched topics this month.',
    visible: true,
    order: 11,
    linkLabel: '',
    linkHref: '',
  },
];

const brandingMedia: MediaRecord[] = [
  {
    id: 'media-primary',
    assetKey: 'hospitalExteriorPrimary',
    title: 'Hospital exterior — primary',
    alt: 'King Salman Specialist Hospital exterior, primary photograph',
  },
  {
    id: 'media-alternative',
    assetKey: 'hospitalExteriorAlternative',
    title: 'Hospital exterior — alternative',
    alt: 'King Salman Specialist Hospital exterior, alternative photograph',
  },
  {
    id: 'media-logo',
    assetKey: 'hailHealthClusterLogo',
    title: 'Hail Health Cluster logo',
    alt: 'Hail Health Cluster',
  },
];

/** Empty content library with required structural sections and branding media only. */
export function createEmptyState(): ContentState {
  return migrateContentCollections({
    drugs: [],
    protocols: [],
    guidelines: [],
    education: [],
    chemotherapy: [],
    therapeuticClasses: [],
    sections,
    media: brandingMedia,
    audit: [],
    searchCounts: [],
    savedSearches: [],
  });
}

/** @deprecated Use createEmptyState — demo catalog seeding has been removed. */
export function createSeedState(): ContentState {
  return createEmptyState();
}
