import { v4 as uuidv4 } from 'uuid';
import type { Reel } from '../types';
import * as db from './database';

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
 * Seeds de Reels demo (vids públicos de muestra en formato vertical).
 * Se insertan una sola vez si la colección está vacía.
 */
function seedDemoReels(): void {
  if (getCollection<Reel>(REEL_KEYS.reels).length > 0) return;

  const channels = db.getAllChannels();
  if (channels.length === 0) return;

  const demos: Array<Pick<Reel, 'title' | 'description' | 'videoUrl'> & { duration: number }> = [
    {
      title: 'Amanecer en la montaña',
      description: 'Los primeros rayos de sol sobre las cumbres ✨ #naturaleza #viajes',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      duration: 15,
    },
    {
      title: 'Setup gaming minimalista',
      description: 'Tour rápido por el setup 2026 🎮 #gaming #setup',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      duration: 15,
    },
    {
      title: 'Receta express en 30 segundos',
      description: 'Cena rápida y deliciosa 🍜 #cocina #recetas',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      duration: 60,
    },
    {
      title: 'Truco de edición que cambia todo',
      description: 'Cómo lograr este efecto en un par de clics 🎬 #tutorial #creadores',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
      duration: 15,
    },
  ];

  const now = new Date().toISOString();
  const reels: Reel[] = demos.map((d, i) => ({
    id: uuidv4(),
    channelId: channels[i % channels.length].id,
    title: d.title,
    description: d.description,
    status: 'READY',
    videoUrl: d.videoUrl,
    thumbnailUrl: '',
    storageKey: `reels/demo/${i}`,
    duration: d.duration,
    views: Math.floor(Math.random() * 50000) + 1000,
    likes: Math.floor(Math.random() * 5000) + 100,
    likedBy: [],
    createdAt: now,
    updatedAt: now,
  }));

  setCollection(REEL_KEYS.reels, reels);
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
 * Obtener reels de un canal
 */
export function getChannelReels(channelId: string): Reel[] {
  const reels = getCollection<Reel>(REEL_KEYS.reels);
  return reels
    .filter(r => r.channelId === channelId && r.status === 'READY')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
