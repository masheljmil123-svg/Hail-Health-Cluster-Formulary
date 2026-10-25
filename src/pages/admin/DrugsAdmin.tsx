import { FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ResourceTable } from '@/components/admin/ResourceTable';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { DrugImageCarousel } from '@/components/drugs/DrugImageCarousel';
import { MedicationAlertBadge } from '@/components/ui/MedicationAlertBadge';
import {
  createDefaultMonographSections,
  DOSE_UNIT_VOCABULARY,
  DOSAGE_FORM_VOCABULARY,
  emptyRichDoc,
  ROUTE_VOCABULARY,
  SAFETY_FLAG_LABEL,
} from '@/config/monograph';
import { formularyStatusLabel } from '@/config/site';
import { useAuth } from '@/hooks/useAuth';
import { useContent } from '@/hooks/useContent';
import { newId, todayISO } from '@/lib/format';
import { putMediaFromFile, validateImageFile } from '@/services/mediaStore';
import {
  applySectionEdit,
  approveAndPublishSection,
  canPublishDrug,
  countPublishedSections,
  SECTION_STATUS_LABEL,
  submitSectionForApproval,
  unpublishSection,
} from '@/services/sectionPublication';
import { beginDrugRevision, canSubmit } from '@/services/workflow';
import type {
  DosingEntry,
  Drug,
  DrugFormulation,
  DrugImageRef,
  FormularyStatus,
  LibraryDocument,
  MedicationAlertClassification,
  MonographSection,
  PublicationStatus,
  RichDoc,
  SafetyFlag,
} from '@/types';

export function DrugsAdmin() {
  const { state, setStatus, deleteItem } = useContent();
  const { allowed } = useAuth();
  const canEdit = allowed('content:update') || allowed('content:create');
  return (
    <AdminCollection
      title="Manage Drugs"
      text="Create and edit medication monographs. Team members submit drafts for administrator review. Only approved and published medications appear on the public site."
      action={canEdit ? { to: '/admin/drugs/new', label: 'Add New Drug' } : undefined}
    >
      {state.drugs.length === 0 ? (
        <div className="panel p-10 text-center">
          <p className="font-serif text-2xl text-navy">No medications added yet.</p>
          <p className="mt-2 text-sm text-muted">Start building the formulary by adding your first medication.</p>
          {canEdit && (
            <Link to="/admin/drugs/new" className="btn-primary mt-5 inline-flex">
              Add New Drug
            </Link>
          )}
        </div>
      ) : (
        <ResourceTable
          noun="drugs"
          canEdit={canEdit}
          rows={state.drugs.map((drug) => ({
            id: drug.id,
            title: drug.genericName,
            subtitle: `${drug.therapeuticClass}${drug.brandNames[0] ? ` · ${drug.brandNames.join(', ')}` : ''}`,
            status: drug.status,
            updated: drug.lastUpdated,
            editTo: `/admin/drugs/${drug.id}`,
            previewTo: `/drugs/${drug.id}?preview=1`,
          }))}
          onArchive={(id) => setStatus('drug', id, 'archived')}
          onRestore={(id) => setStatus('drug', id, 'draft')}
          onDelete={(id) => deleteItem('drug', id)}
        />
      )}
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
  const { state, saveDrug, applyReview } = useContent();
  const { session, allowed } = useAuth();
  const isAdmin = allowed('content:publish');
  const existing = state.drugs.find((drug) => drug.id === id);
  const [drug, setDrug] = useState<Drug>(() => {
    if (!existing) return emptyDrug(session);
    if (existing.status === 'published' && session && !allowed('content:publish')) {
      return beginDrugRevision(existing, { id: session.userId, label: session.displayName });
    }
    return existing;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [savedNote, setSavedNote] = useState('');
  const [imageError, setImageError] = useState('');
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  if (id && !existing) {
    return <p className="text-muted">This medication record was not found.</p>;
  }

  function patch(next: Partial<Drug> | ((current: Drug) => Drug)) {
    setDirty(true);
    setSavedNote('');
    setDrug((current) => (typeof next === 'function' ? next(current) : { ...current, ...next }));
  }

  const relatedDocs = useMemo(
    () => [...state.protocols, ...state.guidelines, ...state.chemotherapy].filter((item) => item.status === 'published'),
    [state],
  );
  const publishedSectionCount = countPublishedSections(drug, relatedDocs);

  function buildPayload(status: PublicationStatus): Drug | null {
    const next: Record<string, string> = {};
    if (!drug.genericName.trim()) next.genericName = 'Enter the generic name.';
    if (!(drug.therapeuticClassIds?.length || drug.therapeuticClass.trim())) {
      next.therapeuticClass = 'Select at least one therapeutic class.';
    }
    if (!drug.version.trim()) next.version = 'Enter a document version.';
    if (status === 'published' && isAdmin) {
      const gate = canPublishDrug(drug, relatedDocs);
      if (!gate.ok) next.publish = gate.reason ?? 'Cannot publish this drug yet.';
    }
    setErrors(next);
    if (Object.keys(next).length) return null;
    const primaryName =
      state.therapeuticClasses.find((item) => item.id === drug.therapeuticClassIds[0])?.name ?? drug.therapeuticClass.trim();
    const feeSection = drug.monographSections.find((section) => section.key === 'fee');
    const feeApplicable =
      feeSection?.structured?.applicable === true
        ? true
        : feeSection?.structured?.applicable === false
          ? false
          : drug.feeApplicable;
    const safeStatus = isAdmin ? status : status === 'published' || status === 'approved' ? 'draft' : status;
    return {
      ...drug,
      genericName: drug.genericName.trim(),
      brandNames: drug.brandNames.map((item) => item.trim()).filter(Boolean),
      synonyms: drug.synonyms.map((item) => item.trim()).filter(Boolean),
      therapeuticClass: primaryName,
      feeApplicable,
      lastUpdated: todayISO(),
      lastReviewedAt: todayISO(),
      status: safeStatus,
      authorId: drug.authorId || session?.userId,
      authorLabel: drug.authorLabel || session?.displayName,
    };
  }

  function onSubmit(event: FormEvent, status?: PublicationStatus) {
    event.preventDefault();
    const targetStatus = status ?? 'draft';
    const payload = buildPayload(targetStatus === 'published' && !isAdmin ? 'draft' : targetStatus);
    if (!payload) return;
    if (isAdmin && targetStatus === 'published') {
      const staged = {
        ...payload,
        status: (payload.status === 'approved' ? 'approved' : 'pending-review') as PublicationStatus,
      };
      const result = applyReview(
        'drug',
        payload.id,
        staged.status === 'approved' ? 'publish' : 'approve-publish',
        { id: session!.userId, label: session!.displayName, role: session!.role },
        undefined,
        staged,
      );
      if (!result.ok) {
        setSavedNote(result.error);
        return;
      }
    } else {
      saveDrug(payload, !existing);
    }
    setDirty(false);
    setSavedNote(targetStatus === 'published' && isAdmin ? 'Drug published.' : 'Saved as draft.');
    navigate(isAdmin ? '/admin/drugs' : '/workspace');
  }

  function submitForReview(event: FormEvent) {
    event.preventDefault();
    if (!session) return;
    const payload = buildPayload('draft');
    if (!payload) return;
    const result = applyReview(
      'drug',
      payload.id,
      canSubmit(existing?.status ?? 'draft') && existing?.status !== 'draft' ? 'resubmit' : 'submit',
      { id: session.userId, label: session.displayName, role: session.role },
      undefined,
      payload,
    );
    if (!result.ok) {
      setSavedNote(result.error);
      return;
    }
    setDirty(false);
    setSavedNote('Submitted for administrator review.');
    navigate('/workspace');
  }

  async function onImagesSelected(files: FileList | null) {
    setImageError('');
    if (!files?.length) return;
    const additions: DrugImageRef[] = [];
    for (const file of Array.from(files)) {
      const invalid = validateImageFile(file);
      if (invalid) {
        setImageError(invalid);
        continue;
      }
      const mediaId = newId('img');
      await putMediaFromFile(file, mediaId);
      additions.push({
        id: newId('drugimg'),
        mediaId,
        altText: `${drug.genericName || 'Medication'} image`,
        caption: '',
        displayOrder: drug.images.length + additions.length + 1,
        isPrimary: drug.images.length + additions.length === 0,
      });
    }
    if (additions.length) patch({ images: [...drug.images, ...additions] });
  }

  const classes = [...state.therapeuticClasses].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  const resources = useMemo(
    () => [...state.protocols, ...state.guidelines, ...state.chemotherapy].filter((item) => item.status !== 'archived'),
    [state],
  );

  function updateSection(next: MonographSection) {
    patch({
      monographSections: drug.monographSections.map((item) => (item.id === next.id ? next : item)),
    });
  }

  if (preview) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" onClick={() => setPreview(false)}>
            Back to editor
          </button>
          <Link to={`/drugs/${drug.id}?preview=1`} className="btn-primary" target="_blank" rel="noreferrer">
            Open public preview
          </Link>
        </div>
        <div className="panel p-6">
          <h1 className="font-serif text-4xl text-navy">{drug.genericName || 'Untitled medication'}</h1>
          <p className="mt-2 text-muted">{drug.brandNames.join(', ') || 'No brand names'}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <MedicationAlertBadge classification={drug.publishedAlertClassification} />
            <span className="text-xs text-muted">Public alert badge (after Medication Safety is approved)</span>
          </div>
          {drug.images.length > 0 && (
            <div className="mt-6">
              <DrugImageCarousel images={drug.images} />
            </div>
          )}
          <div className="mt-8 space-y-4">
            <p className="text-sm text-muted">
              Public visitors only see sections with status Published. Open the public preview link for the live page.
            </p>
            {[...drug.monographSections]
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((section) => (
                <section key={section.id} className="rounded-xl border border-line px-3 py-2">
                  <h2 className="text-base font-semibold text-navy">{section.title}</h2>
                  <p className="mt-1 text-xs text-muted">
                    {SECTION_STATUS_LABEL[section.status]}
                    {section.publishedContent ? ' · public snapshot retained' : ''}
                  </p>
                </section>
              ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => onSubmit(event)}
      className="mx-auto max-w-5xl space-y-6"
      noValidate
      onChange={() => setDirty(true)}
    >
      {dirty && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          You have unsaved changes on this page.
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/admin/drugs" className="text-sm font-medium text-primary hover:underline">
            Back to drugs
          </Link>
          <h1 className="mt-2 font-serif text-4xl text-navy">{existing ? 'Edit drug monograph' : 'Add drug'}</h1>
          <p className="mt-2 text-sm text-muted">
            Demo storage keeps images in this browser (IndexedDB). Clearing site data removes uploaded files.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => setPreview(true)}>
            Preview
          </button>
          <button type="submit" className="btn-secondary" onClick={(event) => onSubmit(event, 'draft')}>
            Save draft
          </button>
          {canSubmit(drug.status) && (
            <button type="button" className="btn-secondary" onClick={submitForReview}>
              Submit for Review
            </button>
          )}
          {isAdmin && (
            <button type="submit" className="btn-primary" onClick={(event) => onSubmit(event, 'published')}>
              Approve & Publish
            </button>
          )}
        </div>
      </div>
      {savedNote && <p className="text-sm text-emerald-700">{savedNote}</p>}
      {drug.status === 'changes-requested' && drug.reviewNote && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Administrator feedback: {drug.reviewNote}
        </p>
      )}

      <section className="panel space-y-4 p-6">
        <h2 className="font-serif text-2xl text-navy">Catalog</h2>
        <Field label="Generic name" error={errors.genericName}>
          <input className="ui-input" value={drug.genericName} onChange={(event) => patch({ genericName: event.target.value })} />
        </Field>
        <Field label="Brand names" hint="Comma-separated.">
          <input
            className="ui-input"
            value={drug.brandNames.join(', ')}
            onChange={(event) => patch({ brandNames: splitList(event.target.value) })}
          />
        </Field>
        <Field label="Synonyms" hint="Comma-separated.">
          <input
            className="ui-input"
            value={drug.synonyms.join(', ')}
            onChange={(event) => patch({ synonyms: splitList(event.target.value) })}
          />
        </Field>
        <Field label="Pharmacological class">
          <input
            className="ui-input"
            value={drug.pharmacologicalClass}
            onChange={(event) => patch({ pharmacologicalClass: event.target.value })}
          />
        </Field>
        <div>
          <span className="ui-label">Therapeutic classes</span>
          <div className="mt-2 flex flex-wrap gap-2 rounded-2xl border border-line bg-canvas p-3">
            {classes.map((item) => {
              const checked = drug.therapeuticClassIds.includes(item.id);
              return (
                <label key={item.id} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm shadow-sm">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={checked}
                    onChange={() => {
                      const nextIds = checked
                        ? drug.therapeuticClassIds.filter((classId) => classId !== item.id)
                        : [...drug.therapeuticClassIds, item.id];
                      const primary = classes.find((entry) => entry.id === nextIds[0]);
                      patch({ therapeuticClassIds: nextIds, therapeuticClass: primary?.name ?? '' });
                    }}
                  />
                  {item.name}
                </label>
              );
            })}
          </div>
          {errors.therapeuticClass && <span className="mt-1 block text-sm text-rose-700">{errors.therapeuticClass}</span>}
        </div>
        <Field label="Keywords" hint="Comma-separated search terms.">
          <input className="ui-input" value={drug.keywords.join(', ')} onChange={(event) => patch({ keywords: splitList(event.target.value) })} />
        </Field>
        <Field label="Indications summary" hint="Catalog summary only. Do not invent approved indications.">
          <textarea
            className="ui-input min-h-24"
            value={drug.indicationsSummary}
            onChange={(event) => patch({ indicationsSummary: event.target.value })}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Internal formulary status" hint="Not shown as a public Preferred badge.">
            <select
              className="ui-input"
              value={drug.formularyStatus}
              onChange={(event) => patch({ formularyStatus: event.target.value as FormularyStatus })}
            >
              {(Object.keys(formularyStatusLabel) as FormularyStatus[]).map((item) => (
                <option key={item} value={item}>
                  {formularyStatusLabel[item]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Workflow status">
            {isAdmin ? (
              <select className="ui-input" value={drug.status} onChange={(event) => patch({ status: event.target.value as PublicationStatus })}>
                <option value="draft">Draft</option>
                <option value="pending-review">Pending Review</option>
                <option value="changes-requested">Changes Requested</option>
                <option value="rejected">Rejected</option>
                <option value="approved">Approved</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            ) : (
              <input className="ui-input" value={drug.status} readOnly />
            )}
          </Field>
          <Field label="Version" error={errors.version}>
            <input className="ui-input" value={drug.version} onChange={(event) => patch({ version: event.target.value })} />
          </Field>
        </div>
      </section>

      <section className="panel space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-2xl text-navy">Formulations & routes</h2>
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              patch({
                formulations: [
                  ...drug.formulations,
                  { id: newId('form'), dosageForm: 'Tablet', route: 'Oral', strengthValue: '', strengthUnit: 'mg' },
                ],
              })
            }
          >
            Add formulation
          </button>
        </div>
        <div className="space-y-4">
          {drug.formulations.map((form, index) => (
            <FormulationEditor
              key={form.id}
              form={form}
              onChange={(next) =>
                patch({ formulations: drug.formulations.map((item) => (item.id === form.id ? next : item)) })
              }
              onRemove={() => patch({ formulations: drug.formulations.filter((item) => item.id !== form.id) })}
              label={`Formulation ${index + 1}`}
            />
          ))}
          {!drug.formulations.length && <p className="text-sm text-muted">No formulations yet.</p>}
        </div>
      </section>

      <section className="panel space-y-4 p-6">
        <h2 className="font-serif text-2xl text-navy">Medication safety</h2>
        <p className="text-sm text-muted">
          Set the alert classification explicitly. Do not treat an unset High Alert as Low. The public header badge appears
          only after you Approve &amp; Publish the Medication Safety monograph section.
        </p>
        <Field label="Medication Alert Classification">
          <select
            className="ui-input max-w-md"
            value={drug.alertClassification}
            onChange={(event) =>
              patch({ alertClassification: event.target.value as MedicationAlertClassification })
            }
          >
            <option value="unspecified">Not Specified</option>
            <option value="high-alert">High Alert</option>
            <option value="low">Low</option>
          </select>
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Working preview:</span>
          <MedicationAlertBadge classification={drug.alertClassification} />
          {!drug.alertClassification || drug.alertClassification === 'unspecified' ? (
            <span className="text-xs text-muted">No badge</span>
          ) : null}
          <span className="text-xs text-muted">· Public:</span>
          <MedicationAlertBadge classification={drug.publishedAlertClassification} />
          {drug.publishedAlertClassification === 'unspecified' && (
            <span className="text-xs text-muted">No public badge yet</span>
          )}
        </div>
        <p className="text-sm font-medium text-navy">Independent safety flags</p>
        <div className="flex flex-wrap gap-3">
          {(['lasa', 'hazardous'] as SafetyFlag[]).map((flag) => (
            <label key={flag} className="inline-flex items-center gap-2 rounded-full bg-canvas px-3 py-2 text-sm">
              <input
                type="checkbox"
                className="accent-primary"
                checked={drug.safetyFlags.includes(flag)}
                onChange={() =>
                  patch({
                    safetyFlags: drug.safetyFlags.includes(flag)
                      ? drug.safetyFlags.filter((item) => item !== flag)
                      : [...drug.safetyFlags, flag],
                  })
                }
              />
              {SAFETY_FLAG_LABEL[flag]}
            </label>
          ))}
          <label className="inline-flex items-center gap-2 rounded-full bg-canvas px-3 py-2 text-sm">
            <input
              type="checkbox"
              className="accent-primary"
              checked={drug.hasBoxedWarning}
              onChange={(event) => patch({ hasBoxedWarning: event.target.checked })}
            />
            Boxed Warning content applies
          </label>
        </div>
      </section>

      <section className="panel space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-2xl text-navy">Indication-specific dosing</h2>
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              patch({
                dosingEntries: [
                  ...drug.dosingEntries,
                  { id: newId('dose'), indication: '', dose: '', doseUnit: 'mg', route: 'Oral', frequency: '' },
                ],
              })
            }
          >
            Add dosing entry
          </button>
        </div>
        <div className="space-y-4">
          {drug.dosingEntries.map((entry, index) => (
            <DosingEditor
              key={entry.id}
              entry={entry}
              label={`Dosing entry ${index + 1}`}
              onChange={(next) =>
                patch({ dosingEntries: drug.dosingEntries.map((item) => (item.id === entry.id ? next : item)) })
              }
              onRemove={() => patch({ dosingEntries: drug.dosingEntries.filter((item) => item.id !== entry.id) })}
            />
          ))}
          {!drug.dosingEntries.length && (
            <p className="text-sm text-muted">No structured dosing entries. You may still use the Dosing monograph section.</p>
          )}
        </div>
      </section>

      <section className="panel space-y-4 p-6">
        <h2 className="font-serif text-2xl text-navy">Medication images</h2>
        <p className="text-sm text-muted">
          Upload multiple images. Stored in this browser only (IndexedDB demo storage). Not a hospital production document system.
        </p>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={(event) => void onImagesSelected(event.target.files)} />
        {imageError && <p className="text-sm text-rose-700">{imageError}</p>}
        <ul className="space-y-3">
          {drug.images.map((image) => (
            <li key={image.id} className="rounded-2xl border border-line p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Alt text">
                  <input
                    className="ui-input"
                    value={image.altText}
                    onChange={(event) =>
                      patch({
                        images: drug.images.map((item) => (item.id === image.id ? { ...item, altText: event.target.value } : item)),
                      })
                    }
                  />
                </Field>
                <Field label="Caption">
                  <input
                    className="ui-input"
                    value={image.caption ?? ''}
                    onChange={(event) =>
                      patch({
                        images: drug.images.map((item) => (item.id === image.id ? { ...item, caption: event.target.value } : item)),
                      })
                    }
                  />
                </Field>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    patch({
                      images: drug.images.map((item) => ({ ...item, isPrimary: item.id === image.id })),
                    })
                  }
                >
                  {image.isPrimary ? 'Primary image' : 'Set primary'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => moveImage(drug, image.id, -1, patch)}
                >
                  Move up
                </button>
                <button type="button" className="btn-secondary" onClick={() => moveImage(drug, image.id, 1, patch)}>
                  Move down
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => patch({ images: drug.images.filter((item) => item.id !== image.id) })}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
        {drug.images.length > 0 && <DrugImageCarousel images={drug.images} />}
      </section>

      <section className="panel space-y-4 p-6">
        <h2 className="font-serif text-2xl text-navy">Related protocols & guidelines</h2>
        <div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-line p-3">
          {resources.map((resource) => (
            <label key={resource.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-canvas">
              <input
                type="checkbox"
                className="accent-primary"
                checked={drug.relatedResourceIds.includes(resource.id)}
                onChange={() =>
                  patch({
                    relatedResourceIds: drug.relatedResourceIds.includes(resource.id)
                      ? drug.relatedResourceIds.filter((item) => item !== resource.id)
                      : [...drug.relatedResourceIds, resource.id],
                  })
                }
              />
              <span className="text-sm">
                <span className="font-medium text-navy">{resource.title}</span>
                <span className="text-muted"> · {resource.category}</span>
              </span>
            </label>
          ))}
          {!resources.length && <p className="text-sm text-muted">No resources available.</p>}
        </div>
      </section>

      <section className="panel space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl text-navy">Monograph checklist</h2>
            <p className="mt-1 text-sm text-muted">
              All checklist sections stay visible here. Public pages show a section only after{' '}
              <span className="font-semibold">Approve &amp; Publish</span>. Entering text alone does not publish.
              Demo permissions simulate administrator approval — not production hospital authorization.
            </p>
            <p className="mt-1 text-sm text-navy">
              Approved public sections: <span className="font-semibold">{publishedSectionCount}</span>
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              patch({
                monographSections: [
                  ...drug.monographSections,
                  {
                    id: newId('sec-custom'),
                    key: 'custom',
                    title: 'Custom section',
                    displayOrder: drug.monographSections.length + 1,
                    isVisible: true,
                    contentType: 'richtext',
                    richText: emptyRichDoc(),
                    status: 'empty',
                    publishedContent: null,
                  },
                ],
              })
            }
          >
            Add custom section
          </button>
        </div>
        {errors.publish && (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{errors.publish}</p>
        )}
        <div className="space-y-4">
          {[...drug.monographSections]
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((section, index, list) => (
              <SectionEditor
                key={section.id}
                section={section}
                drug={drug}
                relatedDocs={relatedDocs}
                onChange={updateSection}
                onPublishSafety={() =>
                  patch({
                    publishedAlertClassification: drug.alertClassification,
                  })
                }
                onUnpublishSafety={() => patch({ publishedAlertClassification: 'unspecified' })}
                onMove={(direction) => {
                  const ordered = [...list];
                  const target = index + direction;
                  if (target < 0 || target >= ordered.length) return;
                  const copy = [...ordered];
                  const [moved] = copy.splice(index, 1);
                  copy.splice(target, 0, moved);
                  patch({
                    monographSections: copy.map((item, itemIndex) => ({ ...item, displayOrder: itemIndex + 1 })),
                  });
                }}
                onRemove={
                  section.key === 'custom'
                    ? () => patch({ monographSections: drug.monographSections.filter((item) => item.id !== section.id) })
                    : undefined
                }
              />
            ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-3 pb-10">
        <button type="submit" className="btn-primary" onClick={(event) => onSubmit(event, drug.status)}>
          Save drug
        </button>
        <Link to="/admin/drugs" className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function FormulationEditor({
  form,
  onChange,
  onRemove,
  label,
}: {
  form: DrugFormulation;
  onChange: (next: DrugFormulation) => void;
  onRemove: () => void;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-navy">{label}</h3>
        <button type="button" className="text-sm font-medium text-rose-700" onClick={onRemove}>
          Remove
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Dosage form">
          <input
            className="ui-input"
            list="dosage-forms"
            value={form.dosageForm}
            onChange={(event) => onChange({ ...form, dosageForm: event.target.value })}
          />
          <datalist id="dosage-forms">
            {DOSAGE_FORM_VOCABULARY.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </Field>
        <Field label="Route">
          <input
            className="ui-input"
            list="routes"
            value={form.route}
            onChange={(event) => onChange({ ...form, route: event.target.value })}
          />
          <datalist id="routes">
            {ROUTE_VOCABULARY.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </Field>
        <Field label="Strength">
          <input className="ui-input" value={form.strengthValue ?? ''} onChange={(event) => onChange({ ...form, strengthValue: event.target.value })} />
        </Field>
        <Field label="Strength unit">
          <input
            className="ui-input"
            list="dose-units"
            value={form.strengthUnit ?? ''}
            onChange={(event) => onChange({ ...form, strengthUnit: event.target.value })}
          />
        </Field>
        <Field label="Concentration">
          <input
            className="ui-input"
            value={form.concentrationValue ?? ''}
            onChange={(event) => onChange({ ...form, concentrationValue: event.target.value })}
          />
        </Field>
        <Field label="Concentration unit">
          <input
            className="ui-input"
            value={form.concentrationUnit ?? ''}
            onChange={(event) => onChange({ ...form, concentrationUnit: event.target.value })}
          />
        </Field>
      </div>
      <Field label="Notes">
        <input className="ui-input" value={form.notes ?? ''} onChange={(event) => onChange({ ...form, notes: event.target.value })} />
      </Field>
      <datalist id="dose-units">
        {DOSE_UNIT_VOCABULARY.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
    </div>
  );
}

function DosingEditor({
  entry,
  onChange,
  onRemove,
  label,
}: {
  entry: DosingEntry;
  onChange: (next: DosingEntry) => void;
  onRemove: () => void;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-navy">{label}</h3>
        <button type="button" className="text-sm font-medium text-rose-700" onClick={onRemove}>
          Remove
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Indication">
          <input className="ui-input" value={entry.indication} onChange={(event) => onChange({ ...entry, indication: event.target.value })} />
        </Field>
        <Field label="Population">
          <input className="ui-input" value={entry.population ?? ''} onChange={(event) => onChange({ ...entry, population: event.target.value })} />
        </Field>
        <Field label="Dose">
          <input className="ui-input" value={entry.dose ?? ''} onChange={(event) => onChange({ ...entry, dose: event.target.value })} />
        </Field>
        <Field label="Dose unit">
          <input
            className="ui-input"
            list="dose-units"
            value={entry.doseUnit ?? ''}
            onChange={(event) => onChange({ ...entry, doseUnit: event.target.value })}
          />
        </Field>
        <Field label="Route">
          <input className="ui-input" list="routes" value={entry.route ?? ''} onChange={(event) => onChange({ ...entry, route: event.target.value })} />
        </Field>
        <Field label="Frequency">
          <input className="ui-input" value={entry.frequency ?? ''} onChange={(event) => onChange({ ...entry, frequency: event.target.value })} />
        </Field>
        <Field label="Duration">
          <input className="ui-input" value={entry.duration ?? ''} onChange={(event) => onChange({ ...entry, duration: event.target.value })} />
        </Field>
        <Field label="Maximum dose">
          <input className="ui-input" value={entry.maximumDose ?? ''} onChange={(event) => onChange({ ...entry, maximumDose: event.target.value })} />
        </Field>
      </div>
      <Field label="Additional instructions">
        <textarea className="ui-input min-h-20" value={entry.notes ?? ''} onChange={(event) => onChange({ ...entry, notes: event.target.value })} />
      </Field>
      <Field label="References">
        <input className="ui-input" value={entry.references ?? ''} onChange={(event) => onChange({ ...entry, references: event.target.value })} />
      </Field>
    </div>
  );
}

function SectionEditor({
  section,
  drug,
  relatedDocs,
  onChange,
  onPublishSafety,
  onUnpublishSafety,
  onMove,
  onRemove,
}: {
  section: MonographSection;
  drug: Drug;
  relatedDocs: LibraryDocument[];
  onChange: (next: MonographSection) => void;
  onPublishSafety?: () => void;
  onUnpublishSafety?: () => void;
  onMove: (direction: -1 | 1) => void;
  onRemove?: () => void;
}) {
  function edit(updates: Partial<MonographSection>) {
    onChange(applySectionEdit(section, updates, drug, relatedDocs));
  }

  const statusStyles: Record<string, string> = {
    empty: 'bg-slate-100 text-slate-600',
    draft: 'bg-amber-50 text-amber-800',
    'pending-approval': 'bg-sky-50 text-sky-800',
    published: 'bg-emerald-50 text-emerald-800',
  };

  return (
    <details className="rounded-2xl border border-line p-4" open={section.key === 'alert-boxed-warning' || section.key === 'dosing'}>
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-navy">{section.title}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusStyles[section.status] ?? statusStyles.empty}`}>
            {SECTION_STATUS_LABEL[section.status] ?? section.status}
          </span>
          {section.publishedContent && section.status !== 'published' && (
            <span className="text-[11px] font-medium text-emerald-700">Public revision retained</span>
          )}
        </span>
        <span className="flex flex-wrap gap-2">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-muted" onClick={(event) => event.stopPropagation()}>
            <input
              type="checkbox"
              className="accent-primary"
              checked={section.isVisible}
              onChange={(event) => edit({ isVisible: event.target.checked })}
            />
            Allow public when published
          </label>
          <button type="button" className="text-xs font-medium text-primary" onClick={(event) => (event.preventDefault(), onMove(-1))}>
            Up
          </button>
          <button type="button" className="text-xs font-medium text-primary" onClick={(event) => (event.preventDefault(), onMove(1))}>
            Down
          </button>
          {onRemove && (
            <button type="button" className="text-xs font-medium text-rose-700" onClick={(event) => (event.preventDefault(), onRemove())}>
              Remove
            </button>
          )}
        </span>
      </summary>
      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap gap-2" onClick={(event) => event.preventDefault()}>
          <button
            type="button"
            className="btn-secondary py-1.5 text-xs"
            onClick={() => onChange(submitSectionForApproval(section, drug, relatedDocs))}
          >
            Submit for approval
          </button>
          <button
            type="button"
            className="btn-primary py-1.5 text-xs"
            onClick={() => {
              onChange(approveAndPublishSection(section, drug, relatedDocs));
              if (section.key === 'medication-safety') onPublishSafety?.();
            }}
          >
            Approve &amp; Publish
          </button>
          <button
            type="button"
            className="btn-secondary py-1.5 text-xs"
            onClick={() => {
              onChange(unpublishSection(section, drug, relatedDocs));
              if (section.key === 'medication-safety') onUnpublishSafety?.();
            }}
            disabled={!section.publishedContent && section.status !== 'published'}
          >
            Unpublish
          </button>
        </div>
        {section.publishedContent && section.status !== 'published' && (
          <p className="rounded-xl bg-clinical px-3 py-2 text-xs leading-5 text-navy">
            A published version remains visible on the public monograph until you Approve &amp; Publish this revision.
            Published at {section.publishedContent.publishedAt}.
          </p>
        )}
        {section.key === 'custom' && (
          <Field label="Section title">
            <input className="ui-input" value={section.title} onChange={(event) => edit({ title: event.target.value })} />
          </Field>
        )}
        {section.contentType === 'structured' && section.key === 'dosage-adjustment' && (
          <>
            {(['kidney', 'liver', 'obesity'] as const).map((key) => (
              <Field key={key} label={key === 'kidney' ? 'Kidney impairment' : key === 'liver' ? 'Liver impairment' : 'Obesity'}>
                <textarea
                  className="ui-input min-h-20"
                  value={String(section.structured?.[key] ?? '')}
                  onChange={(event) =>
                    edit({
                      structured: { ...section.structured, [key]: event.target.value },
                    })
                  }
                />
              </Field>
            ))}
          </>
        )}
        {section.contentType === 'structured' && section.key === 'administration' && (
          <>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-primary"
                checked={Boolean(section.structured?.noSpecialInstructions)}
                onChange={(event) =>
                  edit({
                    structured: { ...section.structured, noSpecialInstructions: event.target.checked },
                  })
                }
              />
              No special instructions
            </label>
            <Field label="Specific instructions">
              <textarea
                className="ui-input min-h-24"
                value={String(section.structured?.specificInstructions ?? '')}
                onChange={(event) =>
                  edit({
                    structured: { ...section.structured, specificInstructions: event.target.value },
                  })
                }
              />
            </Field>
          </>
        )}
        {section.contentType === 'structured' && section.key === 'fee' && (
          <Field label="Fee applicable">
            <select
              className="ui-input"
              value={
                section.structured?.applicable === true ? 'yes' : section.structured?.applicable === false ? 'no' : ''
              }
              onChange={(event) =>
                edit({
                  structured: {
                    ...section.structured,
                    applicable: event.target.value === 'yes' ? true : event.target.value === 'no' ? false : null,
                  },
                })
              }
            >
              <option value="">Not set</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </Field>
        )}
        {(section.contentType === 'richtext' ||
          section.contentType === 'links' ||
          section.key === 'medication-safety' ||
          section.key === 'alert-boxed-warning') && (
          <RichTextEditor
            value={section.richText}
            onChange={(richText: RichDoc) => edit({ richText })}
            placeholder={`Enter ${section.title.toLowerCase()} content…`}
          />
        )}
        <button type="button" className="text-sm font-medium text-muted hover:text-rose-700" onClick={() => edit({ richText: emptyRichDoc() })}>
          Clear rich text
        </button>
      </div>
    </details>
  );
}

function moveImage(drug: Drug, id: string, direction: -1 | 1, patch: (next: Partial<Drug>) => void) {
  const ordered = [...drug.images].sort((a, b) => a.displayOrder - b.displayOrder);
  const index = ordered.findIndex((item) => item.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ordered.length) return;
  const copy = [...ordered];
  const [moved] = copy.splice(index, 1);
  copy.splice(target, 0, moved);
  patch({ images: copy.map((item, itemIndex) => ({ ...item, displayOrder: itemIndex + 1 })) });
}

function emptyDrug(session: { userId: string; displayName: string } | null): Drug {
  return {
    id: newId('drug'),
    genericName: '',
    brandNames: [],
    synonyms: [],
    pharmacologicalClass: '',
    therapeuticClass: '',
    therapeuticClassIds: [],
    formulations: [],
    dosingEntries: [],
    keywords: [],
    indicationsSummary: '',
    safetyFlags: [],
    hasBoxedWarning: false,
    alertClassification: 'unspecified',
    publishedAlertClassification: 'unspecified',
    formularyStatus: 'pending',
    images: [],
    monographSections: createDefaultMonographSections(),
    relatedResourceIds: [],
    feeApplicable: null,
    lastUpdated: todayISO(),
    lastReviewedAt: todayISO(),
    version: '1.0',
    status: 'draft',
    authorId: session?.userId,
    authorLabel: session?.displayName,
    reviewHistory: [],
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
