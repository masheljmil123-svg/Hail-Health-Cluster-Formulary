export const site = {
  hospitalName: 'King Salman Specialist Hospital',
  platformName: 'Hail Health Cluster Formulary',
  organizationName: 'Hail Health Cluster',
  organizationNameAr: 'تجمع حائل الصحي',
  tagline:
    'Trusted, evidence-based medication and clinical information for safe and effective prescribing.',
  identityUrl: 'https://hailthy.net/identity/',
  searchPlaceholder: 'Search by drug name, class, indication, or keyword...',
} as const;

export const PENDING_REVIEW = 'Pending clinical review';

export const formularyStatusLabel = {
  preferred: 'Formulary (Preferred)',
  restricted: 'Formulary (Restricted)',
  'non-formulary': 'Non-Formulary',
  pending: 'Pending review',
} as const;

export const publicationStatusLabel = {
  draft: 'Draft',
  'pending-review': 'Pending Review',
  'changes-requested': 'Changes Requested',
  rejected: 'Changes Requested',
  approved: 'Published',
  published: 'Published',
  archived: 'Archived',
} as const;

export const routeOptions = ['Oral', 'Injection', 'Topical', 'Other'] as const;
export const dosageFormOptions = ['Tablet', 'Capsule', 'Oral Solution', 'Injection', 'Other'] as const;
export const updatedBuckets = [
  { id: '6m', label: 'Within 6 months' },
  { id: '6to12', label: '6–12 months' },
  { id: '12plus', label: 'More than 1 year' },
] as const;
