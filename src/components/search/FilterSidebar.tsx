import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import { dosageFormOptions, formularyStatusLabel, routeOptions, updatedBuckets } from '@/config/site';
import { inBucket } from '@/services/search';
import type { Drug, FormularyStatus, SearchFilters } from '@/types';

export function FilterSidebar({
  drugs,
  filters,
  onChange,
  onClear,
}: {
  drugs: Drug[];
  filters: SearchFilters;
  onChange: (next: SearchFilters) => void;
  onClear: () => void;
}) {
  const classes = unique([...drugs.map((drug) => drug.therapeuticClass), ...filters.classes]).sort((a, b) => a.localeCompare(b));
  const routes = unique([...routeOptions, ...drugs.flatMap((drug) => drug.routes), ...filters.routes]);
  const forms = unique([...dosageFormOptions, ...drugs.flatMap((drug) => drug.dosageForms), ...filters.forms]);
  const statuses: FormularyStatus[] = ['preferred', 'restricted', 'non-formulary', 'pending'];

  const classCounts = count(drugs.map((drug) => drug.therapeuticClass));
  const routeCounts = count(drugs.flatMap((drug) => drug.routes));
  const formCounts = count(drugs.flatMap((drug) => drug.dosageForms));
  const statusCounts = count(drugs.map((drug) => drug.formularyStatus));

  function toggle<T extends string>(key: 'classes' | 'formulary' | 'routes' | 'forms' | 'updated', value: T) {
    const current = filters[key] as string[];
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    onChange({ ...filters, [key]: next });
  }

  return (
    <aside className="panel h-fit p-4 sm:p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-navy">
          <SlidersHorizontal size={16} />
          Filter Results
        </h2>
        <button type="button" onClick={onClear} className="text-xs font-medium text-primary hover:underline">
          Clear all
        </button>
      </div>

      <FilterGroup title="Therapeutic Class">
        {classes.map((item) => (
          <FilterCheck
            key={item}
            label={item}
            count={classCounts[item] ?? 0}
            checked={filters.classes.includes(item)}
            onChange={() => toggle('classes', item)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Formulary Status">
        {statuses.map((item) => (
          <FilterCheck
            key={item}
            label={formularyStatusLabel[item]}
            count={statusCounts[item] ?? 0}
            checked={filters.formulary.includes(item)}
            onChange={() => toggle('formulary', item)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Route of Administration">
        {routes.map((item) => (
          <FilterCheck
            key={item}
            label={item}
            count={routeCounts[item] ?? 0}
            checked={filters.routes.includes(item)}
            onChange={() => toggle('routes', item)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Dosage Form">
        {forms.map((item) => (
          <FilterCheck
            key={item}
            label={item}
            count={formCounts[item] ?? 0}
            checked={filters.forms.includes(item)}
            onChange={() => toggle('forms', item)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Last Updated">
        {updatedBuckets.map((item) => (
          <FilterCheck
            key={item.id}
            label={item.label}
            count={drugs.filter((drug) => inBucket(drug.lastUpdated, item.id)).length}
            checked={filters.updated.includes(item.id)}
            onChange={() => toggle('updated', item.id)}
          />
        ))}
      </FilterGroup>
    </aside>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details open className="group border-t border-line py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-navy">
        {title}
        <ChevronDown size={16} className="text-muted transition group-open:rotate-180" />
      </summary>
      <div className="mt-3 space-y-2">{children}</div>
    </details>
  );
}

function FilterCheck({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count?: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-primary" />
      <span className="min-w-0 flex-1">{label}</span>
      {typeof count === 'number' && <span className="text-xs text-muted">{count}</span>}
    </label>
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function count(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((accumulator, value) => {
    accumulator[value] = (accumulator[value] ?? 0) + 1;
    return accumulator;
  }, {});
}
