import { FormEvent, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ResourceTable } from '@/components/admin/ResourceTable';
import { dosageFormOptions, formularyStatusLabel, routeOptions } from '@/config/site';
import { useAuth } from '@/hooks/useAuth';
import { useContent } from '@/hooks/useContent';
import { newId, todayISO } from '@/lib/format';
import type { Drug, FormularyStatus, PublicationStatus } from '@/types';

export function DrugsAdmin() {
  const { state, setStatus, deleteItem } = useContent();
  const { allowed } = useAuth();
  const canEdit = allowed('content:update');
  return (
    <AdminCollection
      title="Manage Drugs"
      text="Create, edit, publish, archive, or delete demonstration medication records. Published records appear in public search immediately."
      action={canEdit ? { to: '/admin/drugs/new', label: 'Add drug' } : undefined}
    >
      <ResourceTable
        noun="drugs"
        canEdit={canEdit}
        rows={state.drugs.map((drug) => ({
          id: drug.id,
          title: drug.genericName,
          subtitle: `${drug.therapeuticClass}${drug.brandName ? ` · ${drug.brandName}` : ''}`,
          status: drug.status,
          updated: drug.lastUpdated,
          editTo: `/admin/drugs/${drug.id}`,
          previewTo: `/drugs/${drug.id}?preview=1`,
        }))}
        onArchive={(id) => setStatus('drug', id, 'archived')}
        onRestore={(id) => setStatus('drug', id, 'draft')}
        onDelete={(id) => deleteItem('drug', id)}
      />
    </AdminCollection>
  );
}

export function DrugEditor() {
  const { id } = useParams();
  return <DrugEditorForm key={id ?? 'new'} />;
}

function DrugEditorForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, saveDrug } = useContent();
  const existing = state.drugs.find((drug) => drug.id === id);
  const [drug, setDrug] = useState<Drug>(() => existing ?? emptyDrug());
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (id && !existing) {
    return <p className="text-muted">This medication record was not found.</p>;
  }

  function update<K extends keyof Drug>(key: K, value: Drug[K]) {
    setDrug((current) => ({ ...current, [key]: value }));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!drug.genericName.trim()) next.genericName = 'Enter the generic name.';
    if (!drug.pharmacologicalClass.trim()) next.pharmacologicalClass = 'Enter the pharmacological class.';
    if (!drug.therapeuticClass.trim()) next.therapeuticClass = 'Enter the therapeutic class.';
    if (!drug.version.trim()) next.version = 'Enter a document version.';
    setErrors(next);
    if (Object.keys(next).length) return;
    saveDrug({ ...drug, genericName: drug.genericName.trim(), lastUpdated: todayISO() }, !existing);
    navigate('/admin/drugs');
  }

  const classes = [...new Set(state.drugs.map((item) => item.therapeuticClass))].sort();

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-4xl space-y-6" noValidate>
      <div>
        <Link to="/admin/drugs" className="text-sm font-medium text-primary hover:underline">
          Back to drugs
        </Link>
        <h1 className="mt-2 font-serif text-4xl text-navy">{existing ? 'Edit drug' : 'Add drug'}</h1>
        <p className="mt-2 text-sm text-muted">Leave clinical monograph fields empty when the text is not available. The public page will show “Pending clinical review”.</p>
      </div>

      <section className="panel space-y-4 p-6">
        <h2 className="font-serif text-2xl text-navy">Catalog</h2>
        <Field label="Generic name" error={errors.genericName}>
          <input className="ui-input" value={drug.genericName} onChange={(event) => update('genericName', event.target.value)} />
        </Field>
        <Field label="Brand name">
          <input className="ui-input" value={drug.brandName} onChange={(event) => update('brandName', event.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pharmacological class" error={errors.pharmacologicalClass}>
            <input className="ui-input" value={drug.pharmacologicalClass} onChange={(event) => update('pharmacologicalClass', event.target.value)} />
          </Field>
          <Field label="Therapeutic class" error={errors.therapeuticClass}>
            <input className="ui-input" list="therapeutic-classes" value={drug.therapeuticClass} onChange={(event) => update('therapeuticClass', event.target.value)} />
            <datalist id="therapeutic-classes">
              {classes.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </Field>
        </div>
        <Field label="Keywords" hint="Comma-separated search terms.">
          <input className="ui-input" value={drug.keywords.join(', ')} onChange={(event) => update('keywords', splitList(event.target.value))} />
        </Field>
        <Field label="Available formulations" hint="Comma-separated. Do not enter dosing instructions here.">
          <input className="ui-input" value={drug.formulations.join(', ')} onChange={(event) => update('formulations', splitList(event.target.value))} />
        </Field>
        <Field label="Indications summary" hint="Catalog summary only. Do not invent an approved indication list.">
          <textarea className="ui-input min-h-24" value={drug.indicationsSummary} onChange={(event) => update('indicationsSummary', event.target.value)} />
        </Field>
        <CheckGroup
          label="Route of administration"
          options={routeOptions}
          selected={drug.routes}
          onChange={(routes) => update('routes', routes)}
        />
        <CheckGroup
          label="Dosage form"
          options={dosageFormOptions}
          selected={drug.dosageForms}
          onChange={(forms) => update('dosageForms', forms)}
        />
      </section>

      <section className="panel space-y-4 p-6">
        <h2 className="font-serif text-2xl text-navy">Publication</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Formulary status">
            <select className="ui-input" value={drug.formularyStatus} onChange={(event) => update('formularyStatus', event.target.value as FormularyStatus)}>
              {(Object.keys(formularyStatusLabel) as FormularyStatus[]).map((item) => (
                <option key={item} value={item}>
                  {formularyStatusLabel[item]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Publication status">
            <select className="ui-input" value={drug.status} onChange={(event) => update('status', event.target.value as PublicationStatus)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
          <Field label="Version" error={errors.version}>
            <input className="ui-input" value={drug.version} onChange={(event) => update('version', event.target.value)} />
          </Field>
        </div>
      </section>

      <section className="panel space-y-4 p-6">
        <h2 className="font-serif text-2xl text-navy">Monograph sections</h2>
        {(['overview', 'dosing', 'restrictions', 'safety', 'monitoring', 'compatibility', 'references'] as const).map((field) => (
          <Field key={field} label={field[0].toUpperCase() + field.slice(1)}>
            <textarea className="ui-input min-h-24" value={drug[field]} onChange={(event) => update(field, event.target.value)} />
          </Field>
        ))}
      </section>

      <div className="flex gap-3">
        <button type="submit" className="btn-primary">
          Save drug
        </button>
        <Link to="/admin/drugs" className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function emptyDrug(): Drug {
  return {
    id: newId('drug'),
    genericName: '',
    brandName: '',
    pharmacologicalClass: '',
    therapeuticClass: '',
    formulations: [],
    routes: [],
    dosageForms: [],
    keywords: [],
    indicationsSummary: '',
    formularyStatus: 'pending',
    lastUpdated: todayISO(),
    version: '1.0',
    status: 'draft',
    overview: '',
    dosing: '',
    restrictions: '',
    safety: '',
    monitoring: '',
    compatibility: '',
    references: '',
  };
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function AdminCollection({
  title,
  text,
  action,
  children,
}: {
  title: string;
  text: string;
  action?: { to: string; label: string };
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl text-navy">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{text}</p>
        </div>
        {action && (
          <Link to={action.to} className="btn-primary">
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="ui-label">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-sm text-rose-700">{error}</span>}
    </label>
  );
}

function CheckGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className="ui-label">{label}</legend>
      <div className="flex flex-wrap gap-3">
        {options.map((option) => (
          <label key={option} className="inline-flex items-center gap-2 rounded-full bg-canvas px-3 py-2 text-sm">
            <input
              type="checkbox"
              className="accent-primary"
              checked={selected.includes(option)}
              onChange={() => onChange(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option])}
            />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
