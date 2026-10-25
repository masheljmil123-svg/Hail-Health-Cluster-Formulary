import { createDefaultMonographSections, emptyRichDoc } from '@/config/monograph';
import { newId } from '@/lib/format';
import { normalizeSectionPublication } from '@/services/sectionPublication';
import type {
  ContentState,
  Drug,
  DrugFormulation,
  LibraryDocument,
  MedicationAlertClassification,
  MonographSection,
  ResourceAttachment,
  RichDoc,
  SafetyFlag,
} from '@/types';

/** Known split formulation records → keep primary id and merge the rest. */
const MERGE_GROUPS: Array<{ keepId: string; mergeIds: string[]; genericName: string }> = [
  {
    keepId: 'drug-apixaban',
    mergeIds: ['drug-apixaban-suspension'],
    genericName: 'Apixaban',
  },
];

type LegacyDrug = {
  id: string;
  genericName: string;
  brandName?: string;
  brandNames?: string[];
  pharmacologicalClass?: string;
  therapeuticClass?: string;
  therapeuticClassIds?: string[];
  formulations?: string[] | DrugFormulation[];
  routes?: string[];
  dosageForms?: string[];
  keywords?: string[];
  indicationsSummary?: string;
  formularyStatus?: Drug['formularyStatus'];
  version?: string;
  status?: Drug['status'];
  overview?: string;
  dosing?: string;
  restrictions?: string;
  safety?: string;
  monitoring?: string;
  compatibility?: string;
  references?: string;
  safetyFlags?: SafetyFlag[];
  monographSections?: MonographSection[];
  images?: Drug['images'];
  dosingEntries?: Drug['dosingEntries'];
  synonyms?: string[];
  relatedResourceIds?: string[];
  feeApplicable?: boolean | null;
  hasBoxedWarning?: boolean;
  alertClassification?: MedicationAlertClassification;
  publishedAlertClassification?: MedicationAlertClassification;
  lastReviewedAt?: string;
  lastUpdated?: string;
  mergedFromIds?: string[];
};

function asFormulations(legacy: LegacyDrug): DrugFormulation[] {
  if (Array.isArray(legacy.formulations) && legacy.formulations.length && typeof legacy.formulations[0] === 'object') {
    return legacy.formulations as DrugFormulation[];
  }
  const forms = Array.isArray(legacy.dosageForms) ? legacy.dosageForms : [];
  const routes = Array.isArray(legacy.routes) ? legacy.routes : [];
  const labels = Array.isArray(legacy.formulations) ? (legacy.formulations as string[]) : [];
  if (!forms.length && !routes.length && !labels.length) return [];
  const count = Math.max(forms.length, routes.length, labels.length, 1);
  const result: DrugFormulation[] = [];
  for (let i = 0; i < count; i += 1) {
    result.push({
      id: newId('form'),
      dosageForm: forms[i] || labels[i] || 'Other',
      route: routes[i] || routes[0] || 'Other',
      notes: labels[i] && !forms[i] ? labels[i] : undefined,
    });
  }
  return result;
}

function textToRich(text?: string): RichDoc {
  return emptyRichDoc(text?.trim() ?? '');
}

export function normalizeDrug(raw: LegacyDrug): Drug {
  const brandNames =
    raw.brandNames?.filter(Boolean) ??
    (raw.brandName?.trim() ? [raw.brandName.trim()] : []);
  const formulations = asFormulations(raw);
  const safetyFlags = Array.isArray(raw.safetyFlags) ? raw.safetyFlags : [];
  const alertClassification: MedicationAlertClassification =
    raw.alertClassification === 'high-alert' || raw.alertClassification === 'low' || raw.alertClassification === 'unspecified'
      ? raw.alertClassification
      : safetyFlags.includes('high-alert')
        ? 'high-alert'
        : 'unspecified';
  // Never infer Low from a missing High Alert flag.
  const publishedAlertClassification: MedicationAlertClassification =
    raw.publishedAlertClassification === 'high-alert' ||
    raw.publishedAlertClassification === 'low' ||
    raw.publishedAlertClassification === 'unspecified'
      ? raw.publishedAlertClassification
      : 'unspecified';
  let monographSections = Array.isArray(raw.monographSections) && raw.monographSections.length
    ? raw.monographSections
    : createDefaultMonographSections({
        brandNames,
        synonyms: raw.synonyms,
        therapeuticClass: raw.therapeuticClass,
        legacy: {
          overview: raw.overview,
          dosing: typeof raw.dosing === 'string' ? raw.dosing : '',
          restrictions: raw.restrictions,
          safety: raw.safety,
          monitoring: raw.monitoring,
          compatibility: raw.compatibility,
          references: raw.references,
        },
      });

  monographSections = ensureChecklistSections(monographSections, {
    brandNames,
    synonyms: raw.synonyms ?? [],
    therapeuticClass: raw.therapeuticClass ?? '',
  });

  const drug: Drug = {
    id: raw.id,
    genericName: raw.genericName,
    brandNames,
    synonyms: raw.synonyms ?? [],
    pharmacologicalClass: raw.pharmacologicalClass ?? '',
    therapeuticClass: raw.therapeuticClass ?? '',
    therapeuticClassIds: raw.therapeuticClassIds ?? [],
    formulations,
    dosingEntries: Array.isArray(raw.dosingEntries) ? raw.dosingEntries : [],
    keywords: raw.keywords ?? [],
    indicationsSummary: raw.indicationsSummary ?? '',
    safetyFlags: safetyFlags.filter((flag) => flag === 'lasa' || flag === 'hazardous' || flag === 'high-alert'),
    hasBoxedWarning: Boolean(raw.hasBoxedWarning),
    alertClassification,
    publishedAlertClassification,
    formularyStatus: raw.formularyStatus ?? 'pending',
    images: Array.isArray(raw.images) ? raw.images : [],
    monographSections,
    relatedResourceIds: raw.relatedResourceIds ?? [],
    feeApplicable: raw.feeApplicable ?? null,
    lastUpdated: raw.lastUpdated ?? new Date().toISOString().slice(0, 10),
    lastReviewedAt: raw.lastReviewedAt ?? raw.lastUpdated ?? new Date().toISOString().slice(0, 10),
    version: raw.version ?? '1.0',
    status: raw.status ?? 'draft',
    mergedFromIds: raw.mergedFromIds,
  };

  drug.monographSections = drug.monographSections.map((section) => normalizeSectionPublication(section, drug, []));
  return drug;
}

function ensureChecklistSections(
  sections: MonographSection[],
  meta: { brandNames: string[]; synonyms: string[]; therapeuticClass: string },
): MonographSection[] {
  const defaults = createDefaultMonographSections(meta);
  const byKey = new Map(sections.map((item) => [item.key, item]));
  const merged = defaults.map((def) => {
    const existing = byKey.get(def.key);
    if (!existing) return def;
    byKey.delete(def.key);
    return { ...def, ...existing, title: existing.title || def.title, key: def.key };
  });
  const customs = [...byKey.values()].filter((item) => item.key === 'custom' || !defaults.some((d) => d.key === item.key));
  return [...merged, ...customs].map((item, index) => {
    const knownStatus =
      item.status === 'empty' ||
      item.status === 'draft' ||
      item.status === 'pending-approval' ||
      item.status === 'published';
    return {
      ...item,
      displayOrder: item.displayOrder || index + 1,
      richText: item.richText ?? textToRich(),
      // Leave status unset for legacy records so publication migration can preserve prior public content.
      status: knownStatus ? item.status : (undefined as unknown as MonographSection['status']),
      publishedContent: item.publishedContent ?? null,
    };
  });
}

function mergeDrugs(primary: Drug, extras: Drug[]): Drug {
  const formulations = [...primary.formulations];
  const keywords = new Set(primary.keywords);
  const brandNames = new Set(primary.brandNames);
  const synonyms = new Set(primary.synonyms);
  const classIds = new Set(primary.therapeuticClassIds);
  const mergedFromIds = new Set(primary.mergedFromIds ?? []);

  for (const extra of extras) {
    mergedFromIds.add(extra.id);
    for (const form of extra.formulations) {
      const duplicate = formulations.some(
        (item) =>
          item.dosageForm === form.dosageForm &&
          item.route === form.route &&
          item.strengthValue === form.strengthValue &&
          item.strengthUnit === form.strengthUnit,
      );
      if (!duplicate) formulations.push({ ...form, id: form.id || newId('form') });
    }
    extra.brandNames.forEach((name) => brandNames.add(name));
    extra.synonyms.forEach((name) => synonyms.add(name));
    extra.keywords.forEach((word) => keywords.add(word));
    extra.therapeuticClassIds.forEach((id) => classIds.add(id));
    if (extra.genericName !== primary.genericName) synonyms.add(extra.genericName);
  }

  return {
    ...primary,
    brandNames: [...brandNames],
    synonyms: [...synonyms],
    keywords: [...keywords],
    therapeuticClassIds: [...classIds],
    formulations,
    mergedFromIds: [...mergedFromIds],
  };
}

export function migrateDrugs(drugs: LegacyDrug[]): Drug[] {
  const normalized = drugs.map(normalizeDrug);
  const byId = new Map(normalized.map((drug) => [drug.id, drug]));
  const consumed = new Set<string>();

  for (const group of MERGE_GROUPS) {
    const keep = byId.get(group.keepId);
    if (!keep) continue;
    const extras = group.mergeIds.map((id) => byId.get(id)).filter((item): item is Drug => Boolean(item));
    if (!extras.length) continue;
    const merged = mergeDrugs(
      { ...keep, genericName: group.genericName },
      extras,
    );
    byId.set(group.keepId, merged);
    for (const id of group.mergeIds) {
      consumed.add(id);
      byId.delete(id);
    }
  }

  return [...byId.values()].filter((drug) => !consumed.has(drug.id));
}

export function normalizeDocument(raw: Partial<LibraryDocument> & { id: string; title: string }): LibraryDocument {
  const attachments: ResourceAttachment[] = Array.isArray(raw.attachments) ? [...raw.attachments] : [];
  if (!attachments.length && (raw.attachmentName || raw.attachmentDataUrl)) {
    attachments.push({
      id: newId('attach'),
      name: raw.attachmentName || 'Attachment.pdf',
      url: raw.attachmentDataUrl,
      mimeType: 'application/pdf',
    });
  }
  return {
    id: raw.id,
    title: raw.title,
    summary: raw.summary ?? '',
    category: raw.category ?? '',
    body: raw.body ?? '',
    lastUpdated: raw.lastUpdated ?? new Date().toISOString().slice(0, 10),
    version: raw.version ?? '1.0',
    status: raw.status ?? 'draft',
    language: raw.language ?? 'English',
    references: raw.references,
    attachments,
    externalLinks: Array.isArray(raw.externalLinks) ? raw.externalLinks : [],
    relatedDrugIds: Array.isArray(raw.relatedDrugIds) ? raw.relatedDrugIds : [],
    attachmentName: raw.attachmentName,
    attachmentDataUrl: raw.attachmentDataUrl,
  };
}

export function migrateContentCollections(state: ContentState): ContentState {
  return {
    ...state,
    drugs: migrateDrugs(state.drugs as unknown as LegacyDrug[]),
    protocols: state.protocols.map((item) => normalizeDocument(item)),
    guidelines: state.guidelines.map((item) => normalizeDocument(item)),
    education: state.education.map((item) => normalizeDocument(item)),
    chemotherapy: (state.chemotherapy ?? []).map((item) => normalizeDocument(item)),
  };
}

export function formatFormulationLine(form: DrugFormulation): string {
  const strength =
    form.strengthValue && form.strengthUnit
      ? `${form.strengthValue} ${form.strengthUnit}`
      : form.strengthValue || '';
  const concentration =
    form.concentrationValue && form.concentrationUnit
      ? `${form.concentrationValue} ${form.concentrationUnit}`
      : form.concentrationValue || '';
  const formLabel = form.dosageForm || '';
  const routeLabel =
    form.route && !formLabel.toLowerCase().startsWith(form.route.toLowerCase()) ? form.route : '';
  const identity = [routeLabel, formLabel].filter(Boolean).join(' ');
  const parts = [identity, strength, concentration].filter(Boolean);
  const base = parts.join(' — ');
  return form.notes ? `${base}${base ? ' · ' : ''}${form.notes}` : base || 'Formulation';
}
