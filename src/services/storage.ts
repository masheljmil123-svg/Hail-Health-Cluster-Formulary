import { createSeedState } from '@/data/seed';
import type { ContentState } from '@/types';

export const CONTENT_STORAGE_KEY = 'kssh-formulary-content-v1';
const VERSION = 1;

interface Envelope {
  version: number;
  state: ContentState;
}

export function loadContentState(): ContentState {
  try {
    const raw = localStorage.getItem(CONTENT_STORAGE_KEY);
    if (!raw) return createSeedState();
    const parsed = JSON.parse(raw) as Envelope;
    if (parsed.version !== VERSION || !parsed.state?.drugs || !parsed.state.sections) {
      return createSeedState();
    }
    return parsed.state;
  } catch {
    return createSeedState();
  }
}

export function saveContentState(state: ContentState): void {
  const envelope: Envelope = { version: VERSION, state };
  localStorage.setItem(CONTENT_STORAGE_KEY, JSON.stringify(envelope));
}

export function clearContentState(): void {
  localStorage.removeItem(CONTENT_STORAGE_KEY);
}
