/**
 * Local admin workspace persistence via IndexedDB.
 * Migrates once from legacy localStorage content keys so genuine local data is kept.
 * Never written to the published repository catalog.
 */

import { isLocalAdminEnabled } from '@/config/runtime';
import { createEmptyState } from '@/data/seed';
import {
  analyzeAndPurgeDemoRecords,
  CONTENT_STORAGE_KEY,
  migrateHomepageSections,
} from '@/services/storage';
import { migrateContentCollections } from '@/services/migrateDrugs';
import { migrateTherapeuticClasses } from '@/services/therapeuticClasses';
import type { ContentState } from '@/types';

const DB_NAME = 'kssh-formulary-workspace-v1';
const STORE = 'workspace';
const STATE_KEY = 'content';
const DB_VERSION = 1;
const LEGACY_KEYS = ['kssh-formulary-content-v3', 'kssh-formulary-content-v2', 'kssh-formulary-content-v1'] as const;

interface Envelope {
  version: number;
  state: ContentState;
  demoPurged?: boolean;
  purgeGeneration?: number;
}

const MEMORY_VERSION = 4;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Workspace IndexedDB open failed'));
  });
}

function normalizeState(state: ContentState): ContentState {
  return migrateContentCollections(
    migrateTherapeuticClasses({
      ...state,
      chemotherapy: state.chemotherapy ?? [],
      therapeuticClasses: state.therapeuticClasses ?? [],
      sections: migrateHomepageSections(state.sections),
    }),
  );
}

async function withLocalDrafts(state: ContentState): Promise<ContentState> {
  // Use compile-time env checks so production Pages builds drop the draft chunk.
  if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_LOCAL_ADMIN === 'true') {
    if (!isLocalAdminEnabled()) return state;
    const { ensurePhase3DraftDrugs } = await import('@/data/phase3DraftMonographs');
    return ensurePhase3DraftDrugs(state);
  }
  return state;
}

function readLegacyLocalStorage(): ContentState | null {
  for (const key of LEGACY_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Envelope;
      if (parsed?.state?.sections) {
        const { state: purged } = analyzeAndPurgeDemoRecords(parsed.state);
        return normalizeState(purged);
      }
    } catch {
      // try next key
    }
  }
  return null;
}

export async function loadWorkspaceState(): Promise<ContentState> {
  try {
    const db = await openDb();
    const existing = await new Promise<Envelope | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(STATE_KEY);
      req.onsuccess = () => resolve(req.result as Envelope | undefined);
      req.onerror = () => reject(req.error ?? new Error('Workspace read failed'));
    });

    if (existing?.state?.sections) {
      const { state: purged } = analyzeAndPurgeDemoRecords(existing.state);
      return withLocalDrafts(normalizeState(purged));
    }

    const legacy = readLegacyLocalStorage();
    if (legacy) {
      const next = await withLocalDrafts(legacy);
      await saveWorkspaceState(next);
      return next;
    }

    return withLocalDrafts(createEmptyState());
  } catch {
    const legacy = readLegacyLocalStorage();
    return withLocalDrafts(legacy ?? createEmptyState());
  }
}

/** Synchronous bootstrap for first React render — prefers localStorage legacy, else empty. */
export function loadWorkspaceStateSync(): ContentState {
  const legacy = readLegacyLocalStorage();
  if (legacy) return legacy;
  return createEmptyState();
}

export async function saveWorkspaceState(state: ContentState): Promise<void> {
  const { state: cleaned } = analyzeAndPurgeDemoRecords(state);
  const envelope: Envelope = {
    version: MEMORY_VERSION,
    state: cleaned,
    demoPurged: true,
    purgeGeneration: 3,
  };

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(envelope, STATE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Workspace write failed'));
    tx.onabort = () => reject(tx.error ?? new Error('Workspace write aborted'));
  });

  // Keep a localStorage mirror so older tools / tabs still see content during migration.
  try {
    localStorage.setItem(CONTENT_STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // quota — IndexedDB is authoritative
  }
}

export async function clearWorkspaceState(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(STATE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Workspace clear failed'));
    });
  } catch {
    // ignore
  }
  for (const key of LEGACY_KEYS) {
    localStorage.removeItem(key);
  }
}
