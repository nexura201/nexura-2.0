import { v4 as uuidv4 } from 'uuid';
import type { Reel } from '../types';
import * as db from './database';
import { isDemoMode } from '../config/demoMode';
import { seedDemoData } from './demoData';

/**
 * ReelService - Maneja Reels (videos verticales cortos 9:16)
 *
 * Patrón similar a video.ts (VOD): persistencia en localStorage
 * mediante colecciones. En producción se conectará a almacenamiento
 * externo (S3 / Cloudflare R2), pero por ahora funciona 100% local
 * con datos DEMO incluidos.
 */

const REEL_KEYS = {
  reels: 'nexura_reels',
};

// ============ DEMO DATA ============

/**
 * Etapa 6 — Contenido multimedia de los Reels DEMO.
 *
 * Decisión final: NO se generan videos en runtime (Canvas+MediaRecorder era
 * frágil: dependía de codecs soportados por el navegador, creaba blob: URLs
 * que expiran al recargar y trabajo pesado innecesario). Tampoco se usan
 * URLs externas (se eliminaron las heredadas de Google gtv-videos-bucket).
 *
 * Los reels demo quedan con `videoUrl: ''` y el feed muestra un PLACEHOLDER
 * HONESTO a pantalla completa (gradiente NEXURA + etiqueta "Contenido de
 * demostración"). La reproducción real de cualquier contenido (demo o no)
 * queda disponible para cuando el comprador conecte storage/CDN propios:
 * basta con que `videoUrl` apunte a un asset local (/public) o a la URL del
 * CDN futuro; ReelCard ya renderiza <video> cuando videoUrl no está vacío.
 */
/**
 * Etapa 6 — Los Reels DEMO se siembran desde demoData.ts (única fuente de
 * verdad del universo demo, creada en Etapa 5): IDs estables `demo_reel_<i>`,
 * anclados a canales demo_* y restaurables con "Restaurar datos demo".
 * Esta capa ya NO duplica definiciones ni URLs externas (se eliminaron las
 * heredadas de Google gtv-videos-bucket; ver sección Content/Media del README).
 */

/** Red de seguridad: asegura el seed demo (idempotente) antes de leer. */
function seedDemoReels(): void {
  if (!isDemoMode()) return;
  seedDemoData();
}

// ============ REEL OPERATIONS ============

/**
 * Crear un reel (en producción: subir video a storage y procesar)
 */
export async function createReel(
  channelId: string,
  title: string,
  description: string,
  videoFile?: Blob
): Promise<Reel> {
  const reelId = uuidv4();
  const now = new Date().toISOString();

  const reel: Reel = {
    id: reelId,
    channelId,
    title,
    description,
    status: videoFile ? 'PROCESSING' : 'READY',
    videoUrl: '', // Se completará al subir a storage (fase posterior)
    thumbnailUrl: '',
    storageKey: `reels/${channelId}/${reelId}/video.mp4`,
    duration: 0,
    views: 0,
    likes: 0,
    likedBy: [],
    createdAt: now,
    updatedAt: now,
  };

  const reels = getCollection<Reel>(REEL_KEYS.reels);
  reels.push(reel);
  setCollection(REEL_KEYS.reels, reels);

  db.createAuditLog('system', 'REEL_CREATED', 'reel', reelId, `Title: ${title}`);

  return reel;
}

/**
 * Obtener un reel por ID
 */
export function getReelById(reelId: string): Reel | null {
  seedDemoReels();
  const reels = getCollection<Reel>(REEL_KEYS.reels);
  return reels.find(r => r.id === reelId) || null;
}

/**
 * Obtener todos los reels listos para mostrar (feed)
 */
export function getReelsFeed(): Reel[] {
  seedDemoReels();
  const reels = getCollection<Reel>(REEL_KEYS.reels);
  return reels
    .filter(r => r.status === 'READY')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Obtener reels de un canal (vista pública: solo READY)
 */
export function getChannelReels(channelId: string): Reel[] {
  const reels = getCollection<Reel>(REEL_KEYS.reels);
  return reels
    .filter(r => r.channelId === channelId && r.status === 'READY')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Etapa 6 — Biblioteca del creador: todos los reels propios de un canal
 * (incluye PROCESSING/PRIVATE/borradores), excluyendo los eliminados.
 * NO cambia el comportamiento del feed público (getReelsFeed/getChannelReels).
 * Misma fuente de datos (localStorage `nexura_reels`), sin segunda colección.
 *
 * [FUTURO BACKEND] Reemplazar por GET /api/reels?channelId=...&scope=owner
 */
export function getChannelReelsIncludingHidden(channelId: string): Reel[] {
  const reels = getCollection<Reel>(REEL_KEYS.reels);
  return reels
    .filter(r => r.channelId === channelId && r.status !== 'DELETED')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

/**
 * Actualizar un reel
 */
export function updateReel(reelId: string, updates: Partial<Reel>): Reel {
  const reels = getCollection<Reel>(REEL_KEYS.reels);
  const idx = reels.findIndex(r => r.id === reelId);

  if (idx === -1) {
    throw new Error('REEL_NOT_FOUND');
  }

  reels[idx] = { ...reels[idx], ...updates, updatedAt: new Date().toISOString() };
  setCollection(REEL_KEYS.reels, reels);

  return reels[idx];
}

/**
 * Eliminar un reel (soft delete)
 */
export function deleteReel(reelId: string): boolean {
  const reels = getCollection<Reel>(REEL_KEYS.reels);
  const idx = reels.findIndex(r => r.id === reelId);

  if (idx === -1) return false;

  reels[idx].status = 'DELETED';
  reels[idx].updatedAt = new Date().toISOString();
  setCollection(REEL_KEYS.reels, reels);

  db.createAuditLog('system', 'REEL_DELETED', 'reel', reelId, '');
  return true;
}

/**
 * Etapa 6 — Actualizar metadatos locales de un reel (título/descripción).
 * Persistencia local; [FUTURO BACKEND] PATCH /api/reels/:id.
 */
export function updateReelMetadata(reelId: string, updates: { title?: string; description?: string }): Reel {
  return updateReel(reelId, updates);
}

/**
 * Etapa 6 — Publicar/ocultar un reel desde la Biblioteca.
 * ReelStatus ya admite PRIVATE (mismo patrón que VideoStatus):
 * PUBLICAR ⇄ READY, OCULTAR ⇄ PRIVATE. No toca el feed público
 * (getReelsFeed solo lista READY).
 * [FUTURO BACKEND] PATCH /api/reels/:id { visibility }
 */
export function setReelPublished(reelId: string, makePublic: boolean): Reel {
  const current = getReelById(reelId);
  if (!current) throw new Error('REEL_NOT_FOUND');
  if (current.status === 'DELETED') throw new Error('REEL_DELETED');
  return updateReel(reelId, { status: makePublic ? 'READY' : 'PRIVATE' });
}

/**
 * Incrementar visualizaciones (una vez por sesión/navegador por reel)
 */
const VIEWED_KEY = 'nexura_reels_viewed';

export function incrementReelViews(reelId: string): void {
  const viewed: string[] = JSON.parse(localStorage.getItem(VIEWED_KEY) || '[]');
  if (viewed.includes(reelId)) return;

  viewed.push(reelId);
  localStorage.setItem(VIEWED_KEY, JSON.stringify(viewed));

  const reels = getCollection<Reel>(REEL_KEYS.reels);
  const idx = reels.findIndex(r => r.id === reelId);
  if (idx === -1) return;

  reels[idx].views += 1;
  setCollection(REEL_KEYS.reels, reels);
}

/**
 * Toggle de me gusta (requiere usuario autenticado)
 */
export function toggleReelLike(reelId: string, userId: string): { liked: boolean; likes: number } {
  const reels = getCollection<Reel>(REEL_KEYS.reels);
  const idx = reels.findIndex(r => r.id === reelId);

  if (idx === -1) {
    throw new Error('REEL_NOT_FOUND');
  }

  const reel = reels[idx];
  const alreadyLiked = reel.likedBy.includes(userId);

  if (alreadyLiked) {
    reel.likedBy = reel.likedBy.filter(id => id !== userId);
    reel.likes = Math.max(0, reel.likes - 1);
  } else {
    reel.likedBy.push(userId);
    reel.likes += 1;
  }

  reel.updatedAt = new Date().toISOString();
  setCollection(REEL_KEYS.reels, reels);

  return { liked: !alreadyLiked, likes: reel.likes };
}

/**
 * Verificar si un usuario le dio me gusta a un reel
 */
export function isReelLikedBy(reelId: string, userId: string): boolean {
  const reel = getReelById(reelId);
  return reel ? reel.likedBy.includes(userId) : false;
}

// ============ HELPERS (mismo patrón que video.ts) ============

function getCollection<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? (JSON.parse(data) as T[]) : [];
  } catch {
    return [];
  }
}

function setCollection<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}
