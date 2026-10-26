import type { ProfessionalDesignation } from '@/types';

export const PROFESSIONAL_DESIGNATION_LABEL: Record<ProfessionalDesignation, string> = {
  pharmacist: 'Pharmacist',
  'clinical-pharmacist': 'Clinical Pharmacist',
  'pharmacy-specialist': 'Pharmacy Specialist',
  'pharmacy-consultant': 'Pharmacy Consultant',
  other: 'Other',
  unspecified: 'Not specified',
};

export const PHARMACY_PROFESSIONAL_DESIGNATIONS: ProfessionalDesignation[] = [
  'pharmacist',
  'clinical-pharmacist',
  'pharmacy-specialist',
  'pharmacy-consultant',
];

export function isPharmacyProfessional(designation?: ProfessionalDesignation): boolean {
  return Boolean(designation && PHARMACY_PROFESSIONAL_DESIGNATIONS.includes(designation));
}
