import { v4 as uuidv4 } from 'uuid';

/**
 * mediaLocal.ts — ETAPA 7A: Base multimedia LOCAL real sobre IndexedDB.
 *
 * Almacena los BLOBS de video/imagen subidos por el creador (Reel / VOD / Clip)
 * en IndexedDB, NUNCA en localStorage (los videos y blobs binarios no caben ni
 * deben codificarse en localStorage). Los METADATOS del contenido siguen viviendo
 * donde siempre: localStorage vía los servicios existentes de Etapa 6
 * (`video.ts`, `clip.ts`, `reel.ts`) — este módulo NO crea una segunda
 * arquitectura de contenido, solo es el "storage binario" detrás de la clave
 * `storageKey` que esos modelos ya poseen.
 *
 * Convención de claves (compatibles con el prefijo demo heredado):
 *   - Contenido del USUARIO: `videos/<channelId>/<id>/…`, `clips/…`, `reels/…`
 *     → este servicio guarda el Blob bajo EXACTAMENTE esa storageKey.
 *   - Contenido DEMO (prefijo `videos/demo/`, `clips/demo/`, `reels/demo/`):
 *     nunca tiene blob local (decisión honesta de Etapa 6); las funciones de
 *     limpieza ignoran SIEMPRE esas claves para no tocar datos demo.
 *
 * Errores tipados (la UI los mapea a estados visibles — ver UploadPage):
 *   - MEDIA_STORAGE_UNAVAILABLE : IndexedDB no existe/bloqueado (modo privado)
 *   - MEDIA_QUOTA_EXCEEDED      : cuota del navegador insuficiente
 *   - MEDIA_ABORTED / MEDIA_ERROR : transacción fallida / error inesperado
 *
 * Anti-blobs-huérfano:
 *   - El Blob se guarda ANTES de persistir metadatos; si la persistencia de
 *     metadatos falla, el llamador hace `deleteMedia()` (rollback).
 *   - `cleanupOrphanMedia(validKeys)` barre blobs sin metadatos (p. ej. un
 *     guardado interrumpido a mitad). Es best-effort y jamás toca claves demo.
 */

// ============ TIPOS / ERRORES ============

export type MediaKind = 'video' | 'image' | 'other';

export interface MediaRecordMeta {
  key: string;
  name: string;
  size: number;
  type: string;
  createdAt: string;
}

export interface StoredMedia extends MediaRecordMeta {
  blob: Blob;
}

export type MediaLocalErrorCode =
  | 'MEDIA_STORAGE_UNAVAILABLE'
  | 'MEDIA_QUOTA_EXCEEDED'
  | 'MEDIA_ABORTED'
  | 'MEDIA_NOT_FOUND'
  | 'MEDIA_INVALID_KEY'
  | 'MEDIA_ERROR';

export class MediaLocalError extends Error {
  code: MediaLocalErrorCode;
  cause?: unknown;

  constructor(code: MediaLocalErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'MediaLocalError';
    this.code = code;
    this.cause = cause;
  }
}

// ============ DB (IndexedDB nativo, misma familia de infraestructura
// ============ que la rama 'files' de storage.ts de Etapa 6 — versión 1) ============

const DB_NAME = 'nexura_media_local';
const DB_VERSION = 1;
const STORE_MEDIA = 'media';
const STORE_META = 'mediaMeta';

/** Prefijos que pertenecen al universo DEMO: NUNCA se escriben/borran acá. */
const DEMO_KEY_PREFIXES = ['videos/demo/', 'clips/demo/', 'reels/demo/', 'thumbnails/demo/'];

function isDemoKey(key: string): boolean {
  return DEMO_KEY_PREFIXES.some(p => key.startsWith(p));
}

function hasIDB(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDB(): Promise<IDBDatabase> {
  if (!hasIDB()) throw new MediaLocalError('MEDIA_STORAGE_UNAVAILABLE', 'IndexedDB no está disponible en este navegador.');
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      reject(new MediaLocalError('MEDIA_STORAGE_UNAVAILABLE', 'No se pudo abrir IndexedDB.', err));
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_MEDIA)) {
        db.createObjectStore(STORE_MEDIA, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        request.error?.name === 'SecurityError'
          ? new MediaLocalError('MEDIA_STORAGE_UNAVAILABLE', 'IndexedDB está bloqueado por el navegador.', request.error)
          : new MediaLocalError('MEDIA_ERROR', 'No se pudo abrir la base multimedia local.', request.error)
      );
    request.onblocked = () =>
      reject(new MediaLocalError('MEDIA_ABORTED', 'IndexedDB bloqueado por otra pestaña abierta.', undefined));
  });
}

/** Categoriza errores crudos de IndexedDB en códigos estables para la UI. */
function toMediaError(err: unknown, fallback: string): MediaLocalError {
  if (err instanceof MediaLocalError) return err;
  const anyErr = err as any;
  const name: string = anyErr?.name ?? '';
  const message: string = anyErr?.message ?? String(err);
  if (name === 'QuotaExceededError' || /quota/i.test(message)) {
    return new MediaLocalError('MEDIA_QUOTA_EXCEEDED', 'El almacenamiento local del navegador está lleno (cuota insuficiente).', err);
  }
  if (name === 'AbortError') {
    return new MediaLocalError('MEDIA_ABORTED', 'La operación de almacenamiento se canceló.', err);
  }
  return new MediaLocalError('MEDIA_ERROR', `${fallback}: ${message}`, err);
}

/** Ejecuta una tx IDB y cierra la conexión SIEMPRE (no deja conexiones colgando). */
function runTransaction<T>(
  mode: IDBTransactionMode,
  stores: string[],
  work: (tx: IDBTransaction) => Promise<T> | T
): Promise<T> {
  return openDB().then(async (db) => {
    try {
      const tx = db.transaction(stores, mode);
      const result = await work(tx);
      return await new Promise<T>((resolve, reject) => {
        // Si la tarea nunca terminó la tx, abortarla evita leaks de transacción.
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(toMediaError(tx.error, 'Transacción fallida'));
        tx.onabort = () => reject(toMediaError(tx.error ?? tx, 'Transacción abortada'));
      });
    } finally {
      db.close();
    }
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(toMediaError(req.error, 'Operación fallida'));
  });
}

function assertKey(key: string): void {
  if (!key || typeof key !== 'string') {
    throw new MediaLocalError('MEDIA_INVALID_KEY', 'Clave de medio inválida.');
  }
}

// ============ API PÚBLICA ============

/**
 * Guarda un Blob/File en IndexedDB bajo `key` (usar la storageKey del contenido).
 * Escribe atómicamente el blob + su metadato en la MISMA transacción: o se
 * guardan ambos, o nada (evita registros incompletos). Rechaza claves demo.
 */
export async function saveMedia(key: string, blob: Blob, name?: string): Promise<MediaRecordMeta> {
  assertKey(key);
  if (isDemoKey(key)) {
    throw new MediaLocalError('MEDIA_INVALID_KEY', 'No se puede sobrescribir una clave de contenido demo.');
  }
  if (!(blob instanceof Blob)) {
    throw new MediaLocalError('MEDIA_INVALID_KEY', 'Se esperaba un Blob/File válido.');
  }
  const meta: MediaRecordMeta = {
    key,
    name: name ?? (blob instanceof File ? blob.name : ''),
    size: blob.size,
    type: blob.type || 'application/octet-stream',
    createdAt: new Date().toISOString(),
  };

  await runTransaction('readwrite', [STORE_MEDIA, STORE_META], (tx) => {
    tx.objectStore(STORE_MEDIA).put({ key, blob, meta });
    tx.objectStore(STORE_META).put(meta);
  });

  return meta;
}

/** Obtiene el Blob almacenado para una clave, o null si no existe. */
export async function getMediaBlob(key: string): Promise<Blob | null> {
  assertKey(key);
  if (!hasIDB()) return null;
  const record = await runTransaction<any>('readonly', [STORE_MEDIA], async (tx) => {
    return reqToPromise(tx.objectStore(STORE_MEDIA).get(key));
  }).catch(() => null);
  return record?.blob ?? null;
}

/** Obtiene el registro completo (blob + metadato), o null si no existe. */
export async function getMedia(key: string): Promise<StoredMedia | null> {
  const blob = await getMediaBlob(key);
  if (!blob) return null;
  const meta = await getMediaMeta(key);
  return { key, blob, name: meta?.name ?? '', size: meta?.size ?? blob.size, type: meta?.type ?? blob.type, createdAt: meta?.createdAt ?? '' };
}

/** Solo el metadato (size/tipo/fecha) — útil para listas sin cargar blobs. */
export async function getMediaMeta(key: string): Promise<MediaRecordMeta | null> {
  assertKey(key);
  if (!hasIDB()) return null;
  const meta = await runTransaction<MediaRecordMeta | undefined>('readonly', [STORE_META], async (tx) => {
    return reqToPromise(tx.objectStore(STORE_META).get(key));
  }).catch(() => null);
  return meta ?? null;
}

/** ¿Existe un blob local para esta clave? */
export async function hasMedia(key: string): Promise<boolean> {
  assertKey(key);
  if (!hasIDB()) return false;
  const found = await runTransaction<boolean>('readonly', [STORE_META], async (tx) => {
    const count = await reqToPromise(tx.objectStore(STORE_META).count(key));
    return count > 0;
  }).catch(() => false);
  return found;
}

/** Lista TODOS los metadatos (sin traer los blobs a memoria). */
export async function listMediaMeta(): Promise<MediaRecordMeta[]> {
  if (!hasIDB()) return [];
  const items = await runTransaction<MediaRecordMeta[]>('readonly', [STORE_META], async (tx) => {
    return reqToPromise(tx.objectStore(STORE_META).getAll());
  }).catch(() => [] as MediaRecordMeta[]);
  return items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

/**
 * Elimina el blob + metadato de una clave. Devuelve true si había algo.
 * Nunca toca claves demo (sería un no-op defensivo: ellas no tienen blob).
 */
export async function deleteMedia(key: string): Promise<boolean> {
  assertKey(key);
  if (isDemoKey(key)) return false;
  if (!hasIDB()) return false;
  const existed = await hasMedia(key);
  await runTransaction('readwrite', [STORE_MEDIA, STORE_META], (tx) => {
    tx.objectStore(STORE_MEDIA).delete(key);
    tx.objectStore(STORE_META).delete(key);
  });
  return existed;
}

/**
 * Limpieza SEGURA de blobs huérfanos: elimina todo blob cuya clave NO está en
 * `validKeys` (conjunto de storageKeys de contenido vivo calculado por el
 * llamador desde los servicios existentes). Best-effort: nunca lanza errores
 * fatales; devuelve las claves eliminadas. Las claves demo se conservan SIEMPRE.
 */
export async function cleanupOrphanMedia(validKeys: Iterable<string>): Promise<string[]> {
  if (!hasIDB()) return [];
  const valid = new Set(Array.from(validKeys));
  const all = await listMediaMeta();
  const orphans = all.filter(m => !valid.has(m.key) && !isDemoKey(m.key)).map(m => m.key);
  const removed: string[] = [];
  for (const key of orphans) {
    try {
      await deleteMedia(key);
      removed.push(key);
    } catch {
      /* seguir intentando el resto: limpieza parcial es mejor que ninguna */
    }
  }
  return removed;
}

/** Estimación de uso/cuota del origen (navigator.storage.estimate). */
export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
    const est = await navigator.storage.estimate();
    return { usage: est.usage ?? 0, quota: est.quota ?? 0 };
  } catch {
    return null;
  }
}

/** Pide cuota persistente al navegador (best-effort; puede denegarse). */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persisted) return false;
    if (await navigator.storage.persisted?.()) return true;
    return await (navigator.storage.persist?.() ?? Promise.resolve(false));
  } catch {
    return false;
  }
}

/** Genera una storageKey canónica para contenido NUEVO del usuario (mismo patrón Etapa 6). */
export function buildMediaKey(kind: MediaKind | 'video' | 'clip' | 'reel', channelId: string, contentId: string, fileName?: string): string {
  const ext = fileName && /\.[a-z0-9]+$/i.test(fileName) ? fileName.split('.').pop()!.toLowerCase() : 'mp4';
  const folder = kind === 'reel' ? 'reels' : kind === 'clip' ? 'clips' : 'videos';
  return `${folder}/${channelId}/${contentId}/media.${ext}`;
}

/** Utilidad exportada para la UI: formatea bytes (1.2 MB / 340 KB). */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(2)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/** Traduce cualquier error (incluido MediaLocalError) a un mensaje claro para la UI. */
export function describeMediaError(err: unknown): { code: MediaLocalErrorCode; message: string } {
  if (err instanceof MediaLocalError) return { code: err.code, message: err.message };
  const message = (err as any)?.message ?? String(err);
  if (/quota/i.test(message)) return { code: 'MEDIA_QUOTA_EXCEEDED', message: 'Cuota de almacenamiento insuficiente.' };
  if (/indexeddb/i.test(message)) return { code: 'MEDIA_STORAGE_UNAVAILABLE', message: 'El almacenamiento local no está disponible.' };
  return { code: 'MEDIA_ERROR', message: `Error inesperado al guardar: ${message}` };
}

/** Identificador único para keys de borrador/subida (uuid ya usado en el proyecto). */
export function newMediaId(): string {
  return uuidv4();
}
