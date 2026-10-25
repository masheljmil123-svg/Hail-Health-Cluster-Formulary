import type { MonographSection, MonographSectionKey, RichDoc } from '@/types';
import { newId } from '@/lib/format';

export interface ChecklistDef {
  key: MonographSectionKey;
  title: string;
  contentType: MonographSection['contentType'];
  /** Default public visibility when empty. */
  defaultVisible: boolean;
  structuredKeys?: string[];
}

/** Supervisor Monograph Checklist — displayOrder follows checklist sequence. */
export const MONOGRAPH_CHECKLIST: ChecklistDef[] = [
  { key: 'brand-name', title: 'Brand Name', contentType: 'richtext', defaultVisible: true },
  { key: 'synonyms', title: 'Synonyms', contentType: 'richtext', defaultVisible: true },
  { key: 'therapeutic-class', title: 'Therapeutic Class', contentType: 'richtext', defaultVisible: true },
  { key: 'alert-boxed-warning', title: 'Alert / Boxed Warning', contentType: 'richtext', defaultVisible: true },
  { key: 'dosing', title: 'Dosing', contentType: 'richtext', defaultVisible: true },
  {
    key: 'dosage-adjustment',
    title: 'Dosage Adjustment',
    contentType: 'structured',
    defaultVisible: true,
    structuredKeys: ['kidney', 'liver', 'obesity'],
  },
  { key: 'prescribing-restrictions', title: 'Prescribing Restrictions', contentType: 'richtext', defaultVisible: true },
  { key: 'guidelines-protocols', title: 'Guidelines and Protocols', contentType: 'links', defaultVisible: true },
  { key: 'warnings-contraindications', title: 'Warnings and Contraindications', contentType: 'richtext', defaultVisible: true },
  { key: 'pregnancy-lactation', title: 'Pregnancy and Lactation', contentType: 'richtext', defaultVisible: true },
  { key: 'monitoring-parameters', title: 'Monitoring Parameters', contentType: 'richtext', defaultVisible: true },
  { key: 'adverse-drug-reactions', title: 'Adverse Drug Reactions', contentType: 'richtext', defaultVisible: true },
  {
    key: 'medication-safety',
    title: 'Medication Safety',
    contentType: 'structured',
    defaultVisible: true,
    structuredKeys: ['highAlert', 'lasa', 'hazardous', 'notes'],
  },
  { key: 'mechanism-of-action', title: 'Mechanism of Action', contentType: 'richtext', defaultVisible: true },
  { key: 'pharmacokinetics', title: 'Pharmacokinetics', contentType: 'richtext', defaultVisible: true },
  { key: 'dosage-forms', title: 'Dosage Forms', contentType: 'richtext', defaultVisible: true },
  {
    key: 'administration',
    title: 'Administration',
    contentType: 'structured',
    defaultVisible: true,
    structuredKeys: ['specificInstructions', 'noSpecialInstructions'],
  },
  { key: 'patient-counseling', title: 'Patient Counseling Points', contentType: 'richtext', defaultVisible: true },
  {
    key: 'fee',
    title: 'Fee',
    contentType: 'structured',
    defaultVisible: true,
    structuredKeys: ['applicable'],
  },
  {
    key: 'formulary-restrictions-rems',
    title: 'Formulary Restrictions / REMS',
    contentType: 'richtext',
    defaultVisible: false,
  },
];

export const ROUTE_VOCABULARY = ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Inhalation', 'Injection', 'Other'] as const;

export const DOSAGE_FORM_VOCABULARY = [
  'Tablet',
  'Capsule',
  'Oral Solution',
  'Suspension',
  'Injection',
  'Cream',
  'Ointment',
  'Other',
] as const;

export const DOSE_UNIT_VOCABULARY = [
  'mg',
  'mcg',
  'g',
  'mL',
  'units',
  'mEq',
  'mg/kg',
  'mg/kg/day',
  'mcg/kg/min',
  'mg/m²',
  'Other',
] as const;

export const SAFETY_FLAG_LABEL: Record<string, string> = {
  'high-alert': 'High Alert',
  lasa: 'LASA',
  hazardous: 'Hazardous',
};

export function emptyRichDoc(paragraph = ''): RichDoc {
  if (!paragraph.trim()) {
    return { type: 'doc', content: [{ type: 'paragraph' }] };
  }
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: paragraph }],
      },
    ],
  };
}

export function createDefaultMonographSections(overrides?: {
  brandNames?: string[];
  synonyms?: string[];
  therapeuticClass?: string;
  legacy?: Partial<Record<string, string>>;
}): MonographSection[] {
  const legacy = overrides?.legacy ?? {};
  return MONOGRAPH_CHECKLIST.map((def, index) => {
    let richText = emptyRichDoc();
    const structured: Record<string, string | boolean | null> = {};

    if (def.key === 'brand-name' && overrides?.brandNames?.length) {
      richText = emptyRichDoc(overrides.brandNames.join(', '));
    }
    if (def.key === 'synonyms' && overrides?.synonyms?.length) {
      richText = emptyRichDoc(overrides.synonyms.join(', '));
    }
    if (def.key === 'therapeutic-class' && overrides?.therapeuticClass) {
      richText = emptyRichDoc(overrides.therapeuticClass);
    }
    if (def.key === 'dosing' && legacy.dosing) richText = emptyRichDoc(legacy.dosing);
    if (def.key === 'prescribing-restrictions' && legacy.restrictions) richText = emptyRichDoc(legacy.restrictions);
    if (def.key === 'warnings-contraindications' && legacy.safety) richText = emptyRichDoc(legacy.safety);
    if (def.key === 'monitoring-parameters' && legacy.monitoring) richText = emptyRichDoc(legacy.monitoring);
    if (def.key === 'mechanism-of-action' && legacy.overview) richText = emptyRichDoc(legacy.overview);
    if (def.key === 'pharmacokinetics' && legacy.compatibility) richText = emptyRichDoc(legacy.compatibility);
    if (def.key === 'guidelines-protocols' && legacy.references) richText = emptyRichDoc(legacy.references);

    if (def.key === 'dosage-adjustment') {
      structured.kidney = '';
      structured.liver = '';
      structured.obesity = '';
    }
    if (def.key === 'medication-safety') {
      structured.highAlert = false;
      structured.lasa = false;
      structured.hazardous = false;
      structured.notes = '';
    }
    if (def.key === 'administration') {
      structured.specificInstructions = '';
      structured.noSpecialInstructions = false;
    }
    if (def.key === 'fee') {
      structured.applicable = null;
    }

    const hasSeedText =
      (def.contentType === 'richtext' || def.contentType === 'links') &&
      Boolean(richText.content?.some((node) => JSON.stringify(node).includes('"text"')));

    return {
      id: newId(`sec-${def.key}`),
      key: def.key,
      title: def.title,
      displayOrder: index + 1,
      isVisible: def.defaultVisible,
      contentType: def.contentType,
      richText: def.contentType === 'richtext' || def.contentType === 'links' ? richText : null,
      structured: def.contentType === 'structured' ? structured : undefined,
      // Seed/catalog fills stay unpublished until an administrator approves them.
      status: hasSeedText ? 'draft' : 'empty',
      publishedContent: null,
    };
  });
}
