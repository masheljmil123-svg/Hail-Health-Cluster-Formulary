/**
 * Demo-only blob storage via IndexedDB.
 * Files do not sync across devices and are lost if site data is cleared.
 * Replace this layer with hospital-approved object storage for production.
 */

const DB_NAME = 'kssh-formulary-media-v1';
const STORE = 'blobs';
const DB_VERSION = 1;

export const MEDIA_LIMITS = {
  maxImageBytes: 4 * 1024 * 1024,
  maxPdfBytes: 12 * 1024 * 1024,
  maxDocBytes: 12 * 1024 * 1024,
  maxAttachmentsPerItem: 10,
  imageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  pdfTypes: ['application/pdf'],
  docTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/jpeg',
    'image/png',
  ],
} as const;

export interface StoredMediaMeta {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  kind: 'image' | 'pdf' | 'other';
}

interface StoredMediaRecord extends StoredMediaMeta {
  blob: Blob;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

export async function putMediaBlob(input: {
  id: string;
  filename: string;
  mimeType: string;
  blob: Blob;
  kind?: StoredMediaMeta['kind'];
}): Promise<StoredMediaMeta> {
  const db = await openDb();
  const record: StoredMediaRecord = {
    id: input.id,
    filename: input.filename,
    mimeType: input.mimeType,
    size: input.blob.size,
    createdAt: new Date().toISOString(),
    kind: input.kind ?? (input.mimeType.startsWith('image/') ? 'image' : input.mimeType === 'application/pdf' ? 'pdf' : 'other'),
    blob: input.blob,
  };
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put(record);
  await txDone(tx);
  db.close();
  return {
    id: record.id,
    filename: record.filename,
    mimeType: record.mimeType,
    size: record.size,
    createdAt: record.createdAt,
    kind: record.kind,
  };
}

export async function getMediaBlob(id: string): Promise<StoredMediaRecord | null> {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readonly');
  const request = tx.objectStore(STORE).get(id);
  const result = await new Promise<StoredMediaRecord | undefined>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as StoredMediaRecord | undefined);
    request.onerror = () => reject(request.error);
  });
  await txDone(tx);
  db.close();
  return result ?? null;
}

export async function deleteMediaBlob(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).delete(id);
  await txDone(tx);
  db.close();
}

/** Create an object URL for a stored blob. Caller must revoke when done. */
export async function createMediaObjectUrl(id: string): Promise<string | null> {
  const record = await getMediaBlob(id);
  if (!record) return null;
  return URL.createObjectURL(record.blob);
}

export async function putMediaFromFile(file: File, id: string): Promise<StoredMediaMeta> {
  return putMediaBlob({
    id,
    filename: file.name,
    mimeType: file.type || 'application/octet-stream',
    blob: file,
  });
}

export async function putMediaFromDataUrl(dataUrl: string, id: string, filename: string): Promise<StoredMediaMeta | null> {
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return putMediaBlob({
      id,
      filename,
      mimeType: blob.type || 'application/octet-stream',
      blob,
    });
  } catch {
    return null;
  }
}

export function validateImageFile(file: File): string | null {
  if (!MEDIA_LIMITS.imageTypes.includes(file.type as (typeof MEDIA_LIMITS.imageTypes)[number])) {
    return 'Use JPEG, PNG, WebP, or GIF images.';
  }
  if (file.size > MEDIA_LIMITS.maxImageBytes) {
    return `Each image must be under ${Math.round(MEDIA_LIMITS.maxImageBytes / (1024 * 1024))} MB.`;
  }
  return null;
}

export function validatePdfFile(file: File): string | null {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return 'Choose a PDF file.';
  }
  if (file.size > MEDIA_LIMITS.maxPdfBytes) {
    return `Each PDF must be under ${Math.round(MEDIA_LIMITS.maxPdfBytes / (1024 * 1024))} MB.`;
  }
  return null;
}

/** PDF, DOCX, or PNG/JPG for counseling materials and protocol uploads. */
export function validateDocumentFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const okType =
    MEDIA_LIMITS.docTypes.includes(file.type as (typeof MEDIA_LIMITS.docTypes)[number]) ||
    name.endsWith('.pdf') ||
    name.endsWith('.docx') ||
    name.endsWith('.doc') ||
    name.endsWith('.png') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg');
  if (!okType) {
    return 'Upload PDF, DOCX, PNG, or JPG files.';
  }
  if (file.size > MEDIA_LIMITS.maxDocBytes) {
    return `Each file must be under ${Math.round(MEDIA_LIMITS.maxDocBytes / (1024 * 1024))} MB.`;
  }
  return null;
}
