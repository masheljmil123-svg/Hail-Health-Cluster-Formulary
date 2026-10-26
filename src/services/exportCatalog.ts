import { sanitizeDrugReferencesForPublicExport } from '@/services/drugReferences';
import type { ContentState, Drug, LibraryDocument, TherapeuticClass } from '@/types';

export interface CatalogExportPackage {
  format: 'hail-health-cluster-formulary-catalog';
  version: 1;
  exportedAt: string;
  note: string;
  catalog: ContentState;
}

export interface ExportValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
  counts: {
    drugs: number;
    protocols: number;
    guidelines: number;
    education: number;
    chemotherapy: number;
    therapeuticClasses: number;
    hospitals: number;
  };
}

function isReadyForExport(status: string): boolean {
  return status === 'published' || status === 'approved';
}

function pickReadyDrugs(drugs: Drug[]): Drug[] {
  return drugs
    .filter((item) => isReadyForExport(item.status))
    .map((item) =>
      sanitizeDrugReferencesForPublicExport({ ...item, status: 'published' as const }),
    );
}

function pickReadyDocs(docs: LibraryDocument[]): LibraryDocument[] {
  return docs
    .filter((item) => isReadyForExport(item.status))
    .map((item) => ({ ...item, status: 'published' as const }));
}

function pickReadyClasses(items: TherapeuticClass[]): TherapeuticClass[] {
  return items
    .filter((item) => isReadyForExport(item.status))
    .map((item) => ({ ...item, status: 'published' as const }));
}

/** Build a repository-ready catalog from local workspace items marked approved/published. */
export function buildExportPackage(workspace: ContentState): CatalogExportPackage {
  const catalog: ContentState = {
    drugs: pickReadyDrugs(workspace.drugs),
    protocols: pickReadyDocs(workspace.protocols),
    guidelines: pickReadyDocs(workspace.guidelines),
    education: pickReadyDocs(workspace.education),
    chemotherapy: pickReadyDocs(workspace.chemotherapy ?? []),
    therapeuticClasses: pickReadyClasses(workspace.therapeuticClasses ?? []),
    hospitals: workspace.hospitals ?? [],
    sections: workspace.sections,
    media: workspace.media,
    audit: [],
    searchCounts: [],
    savedSearches: [],
  };

  return {
    format: 'hail-health-cluster-formulary-catalog',
    version: 1,
    exportedAt: new Date().toISOString(),
    note:
      'Import with `npm run import-catalog -- <this-file.json>`, then commit and deploy. This download alone does not update GitHub Pages. Private medication references and their IndexedDB files are excluded from this package.',
    catalog,
  };
}

export function validateExportPackage(pkg: CatalogExportPackage): ExportValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (pkg.format !== 'hail-health-cluster-formulary-catalog') {
    errors.push('Unrecognized export format.');
  }
  if (!pkg.catalog?.sections?.length) {
    errors.push('Catalog is missing homepage sections.');
  }

  const { catalog } = pkg;
  const counts = {
    drugs: catalog.drugs?.length ?? 0,
    protocols: catalog.protocols?.length ?? 0,
    guidelines: catalog.guidelines?.length ?? 0,
    education: catalog.education?.length ?? 0,
    chemotherapy: catalog.chemotherapy?.length ?? 0,
    therapeuticClasses: catalog.therapeuticClasses?.length ?? 0,
    hospitals: catalog.hospitals?.length ?? 0,
  };

  if (counts.hospitals === 0) {
    errors.push('Catalog must include at least one hospital configuration.');
  }

  const total =
    counts.drugs +
    counts.protocols +
    counts.guidelines +
    counts.education +
    counts.chemotherapy +
    counts.therapeuticClasses;

  if (total === 0) {
    warnings.push('No approved or published medications/resources were included. Export will replace the live catalog with an empty library (homepage structure only).');
  }

  for (const drug of catalog.drugs ?? []) {
    if (!drug.genericName?.trim()) errors.push(`Drug ${drug.id} is missing a generic name.`);
    if (drug.status !== 'published') errors.push(`Drug ${drug.id} must be status "published" in the export.`);
  }

  return { ok: errors.length === 0, errors, warnings, counts };
}

export function downloadExportPackage(pkg: CatalogExportPackage): void {
  const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `formulary-catalog-export-${pkg.exportedAt.slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
