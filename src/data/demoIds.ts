/**
 * Stable identifiers that originated from the demonstration seed catalog.
 * Used only to purge mock content while preserving genuine user-created records.
 */
export const DEMO_DRUG_IDS = [
  'drug-apixaban',
  'drug-apixaban-suspension',
  'drug-rivaroxaban',
  'drug-enoxaparin',
  'drug-warfarin',
  'drug-clopidogrel',
  'drug-vancomycin',
  'drug-pip-tazo',
  'drug-insulin-glargine',
  'drug-metformin',
  'drug-atorvastatin',
  'drug-amlodipine',
  'drug-paracetamol',
  'drug-omeprazole',
  'drug-dapagliflozin',
  'drug-aspirin',
] as const;

export const DEMO_PROTOCOL_IDS = [
  'protocol-vte',
  'protocol-insulin',
  'protocol-ams',
  'protocol-hold',
] as const;

export const DEMO_GUIDELINE_IDS = [
  'guideline-ams',
  'guideline-anticoag',
  'guideline-hypo',
  'guideline-pain',
] as const;

export const DEMO_EDUCATION_IDS = [
  'education-insulin-ar',
  'education-warfarin',
  'education-inhaler',
  'education-antibiotic',
] as const;

export const DEMO_AUDIT_IDS = ['audit-1', 'audit-2', 'audit-3', 'audit-4'] as const;

/** Demo therapeutic-class IDs from the original seed taxonomy (safe to remove; admins can recreate). */
export const DEMO_CLASS_IDS = [
  'class-analgesics',
  'class-anticoagulants',
  'class-antidiabetics',
  'class-antihypertensives',
  'class-antimicrobials',
  'class-antibiotics',
  'class-antiplatelet',
  'class-cardiovascular',
  'class-endocrine',
  'class-lipid-lowering',
  'class-gastrointestinal',
] as const;

export const DEMO_ID_SET = new Set<string>([
  ...DEMO_DRUG_IDS,
  ...DEMO_PROTOCOL_IDS,
  ...DEMO_GUIDELINE_IDS,
  ...DEMO_EDUCATION_IDS,
  ...DEMO_AUDIT_IDS,
  ...DEMO_CLASS_IDS,
]);

export function isDemoRecordId(id: string): boolean {
  if (DEMO_ID_SET.has(id)) return true;
  // Merged suspension record id may appear in mergedFromIds only; primary is listed above.
  return false;
}
