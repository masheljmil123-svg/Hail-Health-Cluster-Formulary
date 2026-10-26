import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import {
  countPendingPublicReferences,
  getPublicReferences,
} from '@/services/drugReferences';
import { ensureHospitalAssignments, sortedHospitals } from '@/services/hospitals';
import { hasMeaningfulWorkingContent } from '@/services/sectionPublication';
import type { Drug, Hospital, HospitalDrugAssignment, LibraryDocument } from '@/types';

export function ApprovePrepareDialog({
  open,
  drug,
  hospitals,
  relatedDocs = [],
  issues,
  confirmLabel = 'Confirm Publish',
  title = 'Publish Medication',
  onClose,
  onChangeHospitals,
  onConfirm,
}: {
  open: boolean;
  drug: Drug;
  hospitals: Hospital[];
  relatedDocs?: LibraryDocument[];
  issues: string[];
  confirmLabel?: string;
  title?: string;
  onClose: () => void;
  onChangeHospitals: (assignments: HospitalDrugAssignment[]) => void;
  onConfirm: () => void;
}) {
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const ordered = sortedHospitals(hospitals);
  const assignments = ensureHospitalAssignments(drug, ordered);
  const enabledHospitals = ordered.filter((hospital) =>
    assignments.some((row) => row.hospitalId === hospital.id && row.enabled),
  );
  const completedSections = (drug.monographSections ?? []).filter((section) =>
    hasMeaningfulWorkingContent(section, drug, relatedDocs),
  );
  const publicApprovedRefs = getPublicReferences(drug).length;
  const pendingPublicRefs = countPendingPublicReferences(drug);
  const privateRefs = (drug.references ?? []).filter((ref) => ref.visibility === 'private').length;
  const therapeuticLabel =
    drug.therapeuticClass?.trim() ||
    (drug.therapeuticClassIds?.length ? `${drug.therapeuticClassIds.length} class(es) selected` : 'Not set');
  const canConfirm = issues.length === 0 && !busy;

  useEffect(() => {
    if (open) {
      setBusy(false);
      setSectionsOpen(false);
    }
  }, [open]);

  function handleConfirm() {
    if (!canConfirm) return;
    setBusy(true);
    try {
      onConfirm();
    } catch {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={title}
      subtitle="Review and confirm publication"
      wide
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn-primary" disabled={!canConfirm} onClick={handleConfirm}>
            {busy ? 'Publishing…' : confirmLabel}
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-sm leading-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Medication</p>
          <p className="mt-0.5 font-serif text-xl text-navy sm:text-2xl">{drug.genericName || 'Untitled medication'}</p>
          {drug.brandNames.length > 0 && <p className="text-muted">{drug.brandNames.join(', ')}</p>}
          <p className="mt-1 text-navy">
            <span className="text-muted">Therapeutic class:</span> {therapeuticLabel}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Stat label="Completed sections" value={String(completedSections.length)} />
          <Stat label="Selected hospitals" value={String(enabledHospitals.length)} />
        </div>

        <div>
          <p className="font-semibold text-navy">Hospital selection</p>
          {enabledHospitals.length === 0 ? (
            <p className="mt-1 rounded-xl bg-amber-50 px-3 py-2 text-amber-900">
              None selected — this medication will not appear in any hospital formulary.
            </p>
          ) : (
            <p className="mt-1 text-navy">{enabledHospitals.map((hospital) => hospital.nameEn).join(' · ')}</p>
          )}
          <ul className="mt-2 max-h-40 divide-y divide-line/70 overflow-y-auto overscroll-contain rounded-2xl border border-line/70">
            {ordered.map((hospital) => {
              const row = assignments.find((item) => item.hospitalId === hospital.id);
              const enabled = row?.enabled === true;
              return (
                <li key={hospital.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0 truncate text-navy">{hospital.nameEn}</span>
                  <label className="inline-flex shrink-0 items-center gap-2 text-xs font-semibold">
                    <span className={enabled ? 'text-emerald-800' : 'text-muted'}>{enabled ? 'ON' : 'OFF'}</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-line text-navy"
                      checked={enabled}
                      disabled={busy}
                      onChange={(event) => {
                        const next = assignments.map((item) =>
                          item.hospitalId === hospital.id ? { ...item, enabled: event.target.checked } : item,
                        );
                        onChangeHospitals(next);
                      }}
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className="font-semibold text-navy">Clinical sections</p>
          <p className="mt-0.5 text-navy">
            {completedSections.length} eligible completed section{completedSections.length === 1 ? '' : 's'} will be
            published. Empty sections stay hidden.
          </p>
          {completedSections.length > 0 && (
            <div className="mt-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                onClick={() => setSectionsOpen((value) => !value)}
                aria-expanded={sectionsOpen}
              >
                {sectionsOpen ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
                {sectionsOpen ? 'Hide sections' : 'View sections'}
              </button>
              {sectionsOpen && (
                <ul className="mt-2 max-h-36 list-disc overflow-y-auto overscroll-contain pl-5 text-navy">
                  {completedSections.map((section) => (
                    <li key={section.id}>{section.title}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div>
          <p className="font-semibold text-navy">References</p>
          <p className="mt-0.5 text-navy">
            {publicApprovedRefs} approved Public reference{publicApprovedRefs === 1 ? '' : 's'} will be included.
            {privateRefs > 0
              ? ` ${privateRefs} Private reference${privateRefs === 1 ? '' : 's'} stay private and are not published.`
              : ''}
          </p>
          {pendingPublicRefs > 0 && (
            <p className="mt-1 rounded-xl bg-amber-50 px-3 py-2 text-amber-950">
              {pendingPublicRefs} Public reference{pendingPublicRefs === 1 ? '' : 's'} still pending approval will not
              appear on the public monograph until approved.
            </p>
          )}
        </div>

        <p className="rounded-xl bg-clinical px-3 py-2 text-navy">
          Publishing saves the approved medication in <span className="font-semibold">this browser</span> for the selected
          hospitals&apos; local preview. The online GitHub Pages site for other visitors still requires a separate
          deployment from Settings.
        </p>

        {issues.length > 0 && (
          <div className="rounded-xl bg-rose-50 px-3 py-2 text-rose-900" role="alert">
            <p className="font-semibold">Resolve before publishing</p>
            <ul className="mt-1 list-disc pl-5">
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-canvas px-3 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-serif text-2xl text-navy">{value}</p>
    </div>
  );
}
