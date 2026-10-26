import { createPublishedCatalogShell } from '@/data/seed';
import type { ContentState } from '@/types';

/**
 * Version-controlled published catalog — the single source of truth for what
 * every GitHub Pages visitor sees.
 *
 * Current contents: hospital shell + homepage sections only.
 * Phase 3 medication drafts (Apixaban, Adalimumab, Aspirin, Paracetamol, Metformin)
 * remain in the local admin workspace until supervisor clinical verification,
 * hospital ON assignments, export → import-catalog, then commit + deploy.
 *
 * Workflow:
 *   1. Edit drafts in the local admin workspace (IndexedDB)
 *   2. Approve / mark ready for export
 *   3. Download the export package from Settings
 *   4. Run `npm run import-catalog -- path/to/export.json`
 *   5. Commit and deploy
 *
 * Do not put unpublished drafts here. Local admin “publish” never writes this file.
 */
export const publishedCatalog: ContentState = createPublishedCatalogShell();

export const PUBLISHED_CATALOG_VERSION = 1;
