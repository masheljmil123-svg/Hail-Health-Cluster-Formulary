#!/usr/bin/env node
/**
 * Import a local admin export package into src/data/published/catalog.ts
 *
 * Usage:
 *   npm run import-catalog -- ./formulary-catalog-export-YYYY-MM-DD.json
 *
 * Then commit the updated catalog and deploy to GitHub Pages.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: npm run import-catalog -- <export.json>');
  process.exit(1);
}

const absolute = resolve(process.cwd(), inputPath);
let pkg;
try {
  pkg = JSON.parse(readFileSync(absolute, 'utf8'));
} catch (error) {
  console.error('Failed to read export file:', error instanceof Error ? error.message : error);
  process.exit(1);
}

if (pkg.format !== 'hail-health-cluster-formulary-catalog' || !pkg.catalog) {
  console.error('Invalid export: expected format "hail-health-cluster-formulary-catalog" with a catalog object.');
  process.exit(1);
}

const catalog = pkg.catalog;
const outPath = resolve(process.cwd(), 'src/data/published/catalog.ts');
const serialized = JSON.stringify(catalog, null, 2);

const file = `import type { ContentState } from '@/types';

/**
 * Version-controlled published catalog — the single source of truth for what
 * every GitHub Pages visitor sees.
 *
 * Imported from local admin export on ${pkg.exportedAt ?? 'unknown date'}.
 * Do not edit unpublished drafts here.
 */
export const publishedCatalog = ${serialized} as ContentState;

export const PUBLISHED_CATALOG_VERSION = ${Number(pkg.version) || 1};
`;

writeFileSync(outPath, file, 'utf8');

const counts = {
  hospitals: catalog.hospitals?.length ?? 0,
  drugs: catalog.drugs?.length ?? 0,
  protocols: catalog.protocols?.length ?? 0,
  guidelines: catalog.guidelines?.length ?? 0,
  education: catalog.education?.length ?? 0,
  chemotherapy: catalog.chemotherapy?.length ?? 0,
  therapeuticClasses: catalog.therapeuticClasses?.length ?? 0,
};

console.log('Wrote', outPath);
console.log('Counts:', counts);
console.log('Next: review the diff, commit, and deploy to GitHub Pages.');
console.log('Local admin “publish” alone does not update the live site.');
