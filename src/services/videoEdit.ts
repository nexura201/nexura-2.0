import { v4 as uuidv4 } from 'uuid';

/**
 * videoEdit.ts — ETAPA 7D: Editor Básico de Video (configuración local).
 *
 * Guarda la EDICIÓN como configuración (trim + texto + formato), NO como un
 * nuevo archivo de video: no hay re-render, no hay ffmpeg, no hay backend.
 * El binario del contenido sigue viviendo en IndexedDB (mediaLocal.ts) bajo la
 * `storageKey` del contenido; esta capa solo referencia esas claves existentes.
 *
 * Almacenamiento: localStorage con el MISMO patrón-proyecto de los servicios
 * base (colecciones JSON `nexura_*`, parse tolerante). Está prohibido duplicar
 * blobs acá — los blobs grandes permanecen SIEMPRE en IndexedDB.
 *
 * Clave primaria: `contentId` (uno a uno con el contenido) → volver a guardar
 * sobre el mismo contenido ACTUALIZA la edición (updatedAt avanza); no se
 * apilan borradores duplicados.
 */

export type EditContentType = 'video' | 'clip' | 'reel';
export type EditTextPosition = 'top' | 'center' | 'bottom';

export interface VideoEditConfig {
  id: string;
  contentId: string;
  contentKind: EditContentType;
  channelId: string;
  /** storageKey del blob en IndexedDB (mediaLocal) — nunca el blob en sí. */
  mediaId: string;
  startTime: number; // segundos
  endTime: number;   // segundos
  /** Formato de salida deseado ('16:9' | '9:16'). En esta etapa es metadato
   *  de editor: NO se hace conversión destructiva. */
  format: string;
  text?: string;
  textPosition?: EditTextPosition;
  createdAt: string;
  updatedAt: string;
}

const EDIT_KEYS = { edits: 'nexura_video_edits' } as const;

function getCollection<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]') as T[];
  } catch {
    return [];
  }
}

function setCollection<T>(key: string, items: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    /* cuota llena / modo privado: el llamador reporta vía saveEdit error */
  }
}

/** Edición existente para un contenido (o null). Fuente única de lectura. */
export function getEditByContent(contentId: string): VideoEditConfig | null {
  const edits = getCollection<VideoEditConfig>(EDIT_KEYS.edits);
  return edits.find(e => e.contentId === contentId) ?? null;
}

/** Todas las ediciones del canal (lista ordenada por antigüedad). */
export function getChannelEdits(channelId: string): VideoEditConfig[] {
  return getCollection<VideoEditConfig>(EDIT_KEYS.edits)
    .filter(e => e.channelId === channelId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export interface SaveEditInput {
  contentId: string;
  contentKind: EditContentType;
  channelId: string;
  mediaId: string;
  startTime: number;
  endTime: number;
  format: string;
  text?: string;
  textPosition?: EditTextPosition;
}

/**
 * Valida y persiste la edición (upsert por contentId).
 * Reglas obligatorias del editor: inicio >= 0, fin <= duración real, inicio < fin.
 * Lanza Error con mensaje legible si la validación o la escritura fallan.
 */
export function saveEdit(input: SaveEditInput, duration: number): VideoEditConfig {
  if (!Number.isFinite(input.startTime) || !Number.isFinite(input.endTime)) {
    throw new Error('Valores de recorte inválidos.');
  }
  if (input.startTime < 0) throw new Error('El inicio no puede ser negativo.');
  if (!(duration > 0)) throw new Error('La duración del video aún no se cargó; intentalo otra vez.');
  if (input.endTime > duration + 0.05) throw new Error('El fin no puede superar la duración del video.');
  if (input.startTime >= input.endTime) throw new Error('El inicio debe ser menor que el fin.');

  const nowIso = new Date().toISOString();
  const edits = getCollection<VideoEditConfig>(EDIT_KEYS.edits);
  const idx = edits.findIndex(e => e.contentId === input.contentId);
  const existing = idx >= 0 ? edits[idx] : null;

  const config: VideoEditConfig = {
    id: existing?.id ?? uuidv4(),
    contentId: input.contentId,
    contentKind: input.contentKind,
    channelId: input.channelId,
    mediaId: input.mediaId,
    startTime: Math.round(input.startTime * 100) / 100,
    endTime: Math.round(input.endTime * 100) / 100,
    format: input.format,
    text: input.text?.trim() ? input.text.trim() : undefined,
    textPosition: input.text?.trim() ? (input.textPosition ?? 'bottom') : undefined,
    createdAt: existing?.createdAt ?? nowIso,
    updatedAt: nowIso,
  };

  if (idx >= 0) edits[idx] = config;
  else edits.push(config);

  setCollection(EDIT_KEYS.edits, edits);
  // Verificación honesta post-escritura (localStorage puede fallar en silencio).
  const check = getCollection<VideoEditConfig>(EDIT_KEYS.edits).find(e => e.id === config.id);
  if (!check) throw new Error('No se pudo guardar la edición en el almacenamiento local.');
  return config;
}

/** Elimina la edición guardada de un contenido (no toca el video original). */
export function deleteEditByContent(contentId: string): boolean {
  const edits = getCollection<VideoEditConfig>(EDIT_KEYS.edits);
  const next = edits.filter(e => e.contentId !== contentId);
  if (next.length === edits.length) return false;
  setCollection(EDIT_KEYS.edits, next);
  return true;
}

// ============ UTILIDADES DE TIEMPO (compartidas por la UI del editor) ============

/** mm:ss (o h:mm:ss si supera la hora) — usado en inputs e indicadores. */
export function formatEditTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const s = Math.floor(seconds % 60);
  const m = Math.floor(seconds / 60) % 60;
  const h = Math.floor(seconds / 3600);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Convierte "mm:ss" / "h:mm:ss" / "s" a segundos; null si es inválido. */
export function parseEditTime(value: string): number | null {
  const t = value.trim();
  if (!t) return null;
  const parts = t.split(':');
  if (parts.length > 3 || parts.some(p => p === '' || !/^\d+(\.\d+)?$/.test(p))) return null;
  const nums = parts.map(Number);
  let sec = 0;
  for (const n of nums) sec = sec * 60 + n;
  return Number.isFinite(sec) && sec >= 0 ? sec : null;
}
