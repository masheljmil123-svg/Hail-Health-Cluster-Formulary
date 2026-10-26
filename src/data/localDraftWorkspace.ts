import { cloneDefaultHospitals } from '@/config/hospitals';
import { createPhase3DraftDrugs } from '@/data/phase3DraftMonographs';
import { createPublishedCatalogShell } from '@/data/seed';
import { migrateContentCollections } from '@/services/migrateDrugs';
import type { ContentState } from '@/types';

/**
 * Local-only workspace seed with Phase 3 medication drafts for supervisor review.
 * Loaded dynamically when local admin is enabled — never imported by the public
 * GitHub Pages catalog entry path.
 */
export function createLocalDraftWorkspace(): ContentState {
  const shell = createPublishedCatalogShell();
  return migrateContentCollections({
    ...shell,
    drugs: createPhase3DraftDrugs(),
    hospitals: cloneDefaultHospitals(),
  });
}
