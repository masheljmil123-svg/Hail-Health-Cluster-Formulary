import type { Drug } from '@/types';

export interface DrugSubmissionPackage {
  format: 'hail-health-cluster-drug-submission';
  version: 1;
  exportedAt: string;
  note: string;
  drug: Drug;
}

export function buildDrugSubmissionPackage(drug: Drug): DrugSubmissionPackage {
  return {
    format: 'hail-health-cluster-drug-submission',
    version: 1,
    exportedAt: new Date().toISOString(),
    note:
      'Portable local submission package for transferring a medication draft or review request between browsers. This does not send email or sync to other devices automatically.',
    drug,
  };
}

export function downloadDrugSubmissionPackage(pkg: DrugSubmissionPackage): void {
  const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const safeName = (pkg.drug.genericName || pkg.drug.id).replace(/[^\w.-]+/g, '-').slice(0, 48);
  anchor.download = `drug-submission-${safeName}-${pkg.exportedAt.slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function parseDrugSubmissionPackage(raw: string): { ok: true; drug: Drug } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(raw) as DrugSubmissionPackage;
    if (parsed.format !== 'hail-health-cluster-drug-submission') {
      return { ok: false, error: 'Unrecognized submission package format.' };
    }
    if (!parsed.drug?.id || !parsed.drug?.genericName) {
      return { ok: false, error: 'Submission package is missing medication data.' };
    }
    return { ok: true, drug: parsed.drug };
  } catch {
    return { ok: false, error: 'Could not read this submission package file.' };
  }
}
