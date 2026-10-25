import { updatedBuckets } from '@/config/site';
import { formatFormulationLine } from '@/services/migrateDrugs';
import { classNamesForDrug } from '@/services/therapeuticClasses';
import type { Drug, FormularyStatus, SafetyFlag, SearchFilters, SortKey, TherapeuticClass } from '@/types';

export const emptyFilters = (): SearchFilters => ({
  classes: [],
  formulary: [],
  routes: [],
  forms: [],
  updated: [],
  sort: 'best',
  safety: [],
});

export function readFilters(params: URLSearchParams): SearchFilters {
  const sort = params.get('sort');
  const allowed: SortKey[] = ['best', 'updated', 'name', 'name-desc'];
  return {
    classes: splitParam(params.get('class')),
    formulary: splitParam(params.get('status')).filter(isFormularyStatus),
    routes: splitParam(params.get('route')),
    forms: splitParam(params.get('form')),
    updated: splitParam(params.get('updated')).filter((id) => updatedBuckets.some((bucket) => bucket.id === id)),
    sort: allowed.includes(sort as SortKey) ? (sort as SortKey) : 'best',
    safety: splitParam(params.get('safety')).filter(isSafetyFlag),
  };
}

export function writeSearchParams(query: string, filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim());
  if (filters.sort !== 'best') params.set('sort', filters.sort);
  if (filters.classes.length) params.set('class', filters.classes.join(','));
  if (filters.formulary.length) params.set('status', filters.formulary.join(','));
  if (filters.routes.length) params.set('route', filters.routes.join(','));
  if (filters.forms.length) params.set('form', filters.forms.join(','));
  if (filters.updated.length) params.set('updated', filters.updated.join(','));
  if (filters.safety.length) params.set('safety', filters.safety.join(','));
  return params;
}

export function publishedDrugs(drugs: Drug[]): Drug[] {
  return drugs.filter((drug) => drug.status === 'published');
}

export function matchDrugs(drugs: Drug[], query: string): Array<{ drug: Drug; score: number }> {
  const q = query.trim().toLowerCase();
  return publishedDrugs(drugs)
    .map((drug) => ({ drug, score: scoreDrug(drug, q) }))
    .filter((item) => item.score > 0);
}

export function applyFilters(
  matched: Array<{ drug: Drug; score: number }>,
  filters: SearchFilters,
  now = new Date(),
  classes: TherapeuticClass[] = [],
): Array<{ drug: Drug; score: number }> {
  return matched.filter(({ drug }) => {
    if (filters.classes.length) {
      const names = classNamesForDrug(drug, classes);
      if (!filters.classes.some((name) => names.includes(name) || drug.therapeuticClass === name)) return false;
    }
    if (filters.formulary.length && !filters.formulary.includes(drug.formularyStatus)) return false;
    if (filters.routes.length && !drug.formulations.some((form) => filters.routes.includes(form.route))) return false;
    if (filters.forms.length && !drug.formulations.some((form) => filters.forms.includes(form.dosageForm))) return false;
    if (filters.safety.length && !filters.safety.every((flag) => drug.safetyFlags.includes(flag))) return false;
    if (filters.updated.length && !filters.updated.some((bucket) => inBucket(drug.lastUpdated, bucket, now))) {
      return false;
    }
    return true;
  });
}

export function sortResults(
  items: Array<{ drug: Drug; score: number }>,
  sort: SortKey,
  hasQuery: boolean,
): Drug[] {
  const copy = [...items];
  copy.sort((a, b) => {
    if (sort === 'name') return a.drug.genericName.localeCompare(b.drug.genericName);
    if (sort === 'name-desc') return b.drug.genericName.localeCompare(a.drug.genericName);
    if (sort === 'updated') return b.drug.lastUpdated.localeCompare(a.drug.lastUpdated);
    if (hasQuery && b.score !== a.score) return b.score - a.score;
    if (!hasQuery) return b.drug.lastUpdated.localeCompare(a.drug.lastUpdated);
    return a.drug.genericName.localeCompare(b.drug.genericName);
  });
  return copy.map((item) => item.drug);
}

export function inBucket(isoDate: string, bucket: string, now = new Date()): boolean {
  const time = new Date(`${isoDate.slice(0, 10)}T00:00:00`).getTime();
  if (Number.isNaN(time)) return false;
  const six = new Date(now);
  six.setMonth(six.getMonth() - 6);
  const twelve = new Date(now);
  twelve.setMonth(twelve.getMonth() - 12);
  if (bucket === '6m') return time >= startOfDay(six);
  if (bucket === '6to12') return time < startOfDay(six) && time >= startOfDay(twelve);
  if (bucket === '12plus') return time < startOfDay(twelve);
  return false;
}

export function formulationSummary(drug: Drug): string[] {
  return drug.formulations.map(formatFormulationLine);
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function scoreDrug(drug: Drug, query: string): number {
  if (!query) return 1;
  const tokens = query.split(/\s+/).filter(Boolean);
  let total = 0;
  for (const token of tokens) {
    const tokenScore = scoreToken(drug, token);
    if (tokenScore === 0) return 0;
    total += tokenScore;
  }
  if (drug.genericName.toLowerCase() === query) total += 40;
  return total;
}

function scoreToken(drug: Drug, token: string): number {
  const generic = drug.genericName.toLowerCase();
  const brands = (drug.brandNames ?? []).map((item) => item.toLowerCase());
  const synonyms = (drug.synonyms ?? []).map((item) => item.toLowerCase());
  if (generic === token) return 100;
  if (generic.startsWith(token)) return 80;
  if (generic.includes(token)) return 60;
  if (brands.some((brand) => brand === token || brand.includes(token))) return 50;
  if (synonyms.some((synonym) => synonym === token || synonym.includes(token))) return 45;
  if (drug.pharmacologicalClass.toLowerCase().includes(token)) return 35;
  if (drug.therapeuticClass.toLowerCase().includes(token)) return 35;
  if ((drug.therapeuticClassIds ?? []).some((id) => id.toLowerCase().includes(token))) return 30;
  if (drug.keywords.some((keyword) => keyword.toLowerCase().includes(token))) return 30;
  if (drug.indicationsSummary.toLowerCase().includes(token)) return 20;
  if (drug.formulations.some((form) => formatFormulationLine(form).toLowerCase().includes(token))) return 15;
  if (drug.formulations.some((form) => form.route.toLowerCase().includes(token))) return 12;
  if (drug.formulations.some((form) => form.dosageForm.toLowerCase().includes(token))) return 12;
  return 0;
}

function splitParam(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isFormularyStatus(value: string): value is FormularyStatus {
  return value === 'preferred' || value === 'restricted' || value === 'non-formulary' || value === 'pending';
}

function isSafetyFlag(value: string): value is SafetyFlag {
  return value === 'high-alert' || value === 'lasa' || value === 'hazardous';
}

export function countBy<T extends string>(items: T[], universe: readonly T[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const key of universe) counts[key] = 0;
  for (const item of items) counts[item] = (counts[item] ?? 0) + 1;
  return counts;
}
