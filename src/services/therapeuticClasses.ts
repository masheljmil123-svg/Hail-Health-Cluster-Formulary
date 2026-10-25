import type { ContentState, Drug, TherapeuticClass } from '@/types';
import { publishedDrugs } from '@/services/search';

const NAME_TO_ID: Record<string, string> = {
  Analgesics: 'class-analgesics',
  Anticoagulants: 'class-anticoagulants',
  Antidiabetics: 'class-antidiabetics',
  Antihypertensives: 'class-antihypertensives',
  Antimicrobials: 'class-antimicrobials',
  Antibiotics: 'class-antibiotics',
  'Antiplatelet Agents': 'class-antiplatelet',
  'Cardiovascular Drugs': 'class-cardiovascular',
  'Endocrine Drugs': 'class-endocrine',
  'Lipid-lowering Agents': 'class-lipid-lowering',
  Gastrointestinal: 'class-gastrointestinal',
};

const DEFAULT_CLASS_META: Record<
  string,
  { description: string; subclasses: Array<{ id: string; name: string }>; order: number }
> = {
  'class-analgesics': {
    description: 'Demonstration category for pain-relief medications in the sample formulary.',
    subclasses: [{ id: 'sub-analgesic-antipyretic', name: 'Analgesic and Antipyretic' }],
    order: 1,
  },
  'class-anticoagulants': {
    description: 'Demonstration category for anticoagulant medications in the sample formulary.',
    subclasses: [
      { id: 'sub-factor-xa', name: 'Direct Factor Xa Inhibitor' },
      { id: 'sub-lmwh', name: 'Low Molecular Weight Heparin' },
      { id: 'sub-vka', name: 'Vitamin K Antagonist' },
    ],
    order: 2,
  },
  'class-antidiabetics': {
    description: 'Demonstration category for antidiabetic medications in the sample formulary.',
    subclasses: [
      { id: 'sub-long-insulin', name: 'Long-acting Insulin' },
      { id: 'sub-biguanide', name: 'Biguanide' },
      { id: 'sub-sglt2', name: 'SGLT2 Inhibitor' },
    ],
    order: 3,
  },
  'class-antihypertensives': {
    description: 'Demonstration category for antihypertensive medications in the sample formulary.',
    subclasses: [{ id: 'sub-ccb', name: 'Calcium Channel Blocker' }],
    order: 4,
  },
  'class-antimicrobials': {
    description: 'Demonstration directory category. Medication assignments are managed in Admin.',
    subclasses: [],
    order: 5,
  },
  'class-antibiotics': {
    description: 'Demonstration category for antibiotic medications in the sample formulary.',
    subclasses: [
      { id: 'sub-glycopeptide', name: 'Glycopeptide' },
      { id: 'sub-bl-bli', name: 'Beta-lactam / Beta-lactamase Inhibitor' },
    ],
    order: 6,
  },
  'class-antiplatelet': {
    description: 'Demonstration category for antiplatelet medications in the sample formulary.',
    subclasses: [
      { id: 'sub-p2y12', name: 'P2Y12 Inhibitor' },
      { id: 'sub-antiplatelet', name: 'Antiplatelet Agent' },
    ],
    order: 7,
  },
  'class-cardiovascular': {
    description: 'Demonstration directory category. Medication assignments are managed in Admin.',
    subclasses: [],
    order: 8,
  },
  'class-endocrine': {
    description: 'Demonstration directory category. Medication assignments are managed in Admin.',
    subclasses: [],
    order: 9,
  },
  'class-lipid-lowering': {
    description: 'Demonstration category for lipid-lowering medications in the sample formulary.',
    subclasses: [{ id: 'sub-statin', name: 'HMG-CoA Reductase Inhibitor' }],
    order: 10,
  },
  'class-gastrointestinal': {
    description: 'Demonstration category for gastrointestinal medications in the sample formulary.',
    subclasses: [{ id: 'sub-ppi', name: 'Proton Pump Inhibitor' }],
    order: 11,
  },
};

/** Ensure every drug has therapeuticClassIds; map legacy string names when needed. */
export function normalizeDrugClassIds(drug: Drug, classes: TherapeuticClass[]): Drug {
  const ids = Array.isArray(drug.therapeuticClassIds) ? [...drug.therapeuticClassIds] : [];
  if (!ids.length && drug.therapeuticClass) {
    const byName = classes.find((item) => item.name === drug.therapeuticClass);
    const mapped = byName?.id ?? NAME_TO_ID[drug.therapeuticClass];
    if (mapped) ids.push(mapped);
  }
  const valid = ids.filter((id) => classes.some((item) => item.id === id));
  const primary = classes.find((item) => item.id === valid[0]);
  return {
    ...drug,
    therapeuticClassIds: valid,
    therapeuticClass: primary?.name ?? drug.therapeuticClass ?? '',
  };
}

export function migrateTherapeuticClasses(state: ContentState): ContentState {
  const existing = Array.isArray(state.therapeuticClasses) ? state.therapeuticClasses : [];
  let classes = [...existing];

  // Preserve any classes already stored; fill gaps from legacy drug string names.
  const knownNames = new Set(classes.map((item) => item.name));
  const knownIds = new Set(classes.map((item) => item.id));
  const fromDrugs = [...new Set(state.drugs.map((drug) => drug.therapeuticClass).filter(Boolean))];
  let order = classes.reduce((max, item) => Math.max(max, item.order ?? 0), 0);
  for (const name of fromDrugs) {
    if (knownNames.has(name)) continue;
    const id = NAME_TO_ID[name] ?? `class-${slugify(name)}`;
    if (knownIds.has(id)) continue;
    const meta = DEFAULT_CLASS_META[id];
    order = meta?.order ?? order + 1;
    classes.push({
      id,
      name,
      description: meta?.description ?? 'Demonstration category derived from existing medication records.',
      subclasses: meta?.subclasses ?? [],
      order,
      status: 'published',
    });
    knownNames.add(name);
    knownIds.add(id);
  }

  // Do not auto-create empty demonstration therapeutic classes.
  // Admins manage the class directory; classes are derived only from existing drug assignments above.

  classes = classes
    .map((item, index) => {
      const meta = DEFAULT_CLASS_META[item.id];
      const subclasses = Array.isArray(item.subclasses) ? item.subclasses : [];
      const description =
        item.description && !item.description.includes('derived from existing')
          ? item.description
          : meta?.description ?? item.description ?? '';
      return {
        ...item,
        subclasses: subclasses.length ? subclasses : meta?.subclasses ?? [],
        order: typeof item.order === 'number' ? item.order : meta?.order ?? index + 1,
        status: item.status ?? 'published',
        description,
      };
    })
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

  const drugs = state.drugs.map((drug) => normalizeDrugClassIds(drug, classes));
  return { ...state, therapeuticClasses: classes, drugs };
}

export function publishedTherapeuticClasses(classes: TherapeuticClass[]): TherapeuticClass[] {
  return classes.filter((item) => item.status === 'published').sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

export function findTherapeuticClass(classes: TherapeuticClass[], id: string): TherapeuticClass | undefined {
  return classes.find((item) => item.id === id);
}

export function drugBelongsToClass(drug: Drug, classId: string, classes: TherapeuticClass[]): boolean {
  if (drug.therapeuticClassIds?.includes(classId)) return true;
  const match = classes.find((item) => item.id === classId);
  return Boolean(match && drug.therapeuticClass === match.name);
}

export function drugsForClass(state: ContentState, classId: string): Drug[] {
  return publishedDrugs(state.drugs)
    .filter((drug) => drugBelongsToClass(drug, classId, state.therapeuticClasses))
    .sort((a, b) => a.genericName.localeCompare(b.genericName));
}

export function classNamesForDrug(drug: Drug, classes: TherapeuticClass[]): string[] {
  const fromIds = (drug.therapeuticClassIds ?? [])
    .map((id) => classes.find((item) => item.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  if (fromIds.length) return fromIds;
  return drug.therapeuticClass ? [drug.therapeuticClass] : [];
}

export function syncPrimaryClassName(drug: Drug, classes: TherapeuticClass[]): Drug {
  const primary = classes.find((item) => item.id === drug.therapeuticClassIds[0]);
  return {
    ...drug,
    therapeuticClass: primary?.name ?? drug.therapeuticClass,
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'class';
}
