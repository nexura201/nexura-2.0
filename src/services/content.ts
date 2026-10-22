import { DEMO_USERNAME_PREFIX } from './demoData';
import * as videoService from './video';
import * as clipService from './clip';
import * as reelService from './reel';
import * as db from './database';
import { cleanupOrphanMedia } from './mediaLocal';

/**
 * content.ts — Capa unificada del ecosistema de contenido de NEXURA (Etapa 6).
 *
 * Biblioteca, Reels, Clips y VOD comparten a partir de aquí:
 *  - Un único vocabulario de ESTADOS de contenido (ver `ContentState`).
 *  - Una forma común de listar el contenido propio del creador (Biblioteca).
 *  - Helpers compartidos de formato (duración / contadores).
 *
 * IMPORTANTE (arquitectura preparada para futuro backend):
 *  Este módulo NO agrega persistencia propia: delega en los servicios existentes
 *  (`video.ts`, `clip.ts`, `reel.ts`), que hoy usan localStorage. Cuando el
 *  comprador conecte su API/DB/storage, debe reemplazar la lectura/escritura en
 *  esos tres servicios; esta capa no necesita cambios estructurales.
 */

export type ContentKind = 'video' | 'clip' | 'reel';

/**
 * Estado UNIFICADO de contenido, derivado de los estados específicos de cada
 * tipo (VideoStatus / ClipStatus / ReelStatus + visibility). No se inventan
 * estados: es una proyección coherente para mostrar la misma semántica en
 * Biblioteca, Reels, Clips y VOD.
 */
export type ContentState = 'borrador' | 'procesando' | 'publicado' | 'oculto' | 'error' | 'eliminado';

const STATE_META: Record<ContentState, { label: string; className: string }> = {
  borrador: { label: 'Borrador', className: 'bg-surface-2 text-text-secondary border-border' },
  procesando: { label: 'Procesando', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  publicado: { label: 'Publicado', className: 'bg-success/15 text-success border-success/30' },
  oculto: { label: 'Oculto', className: 'bg-bg-elevated text-text-muted border-border' },
  error: { label: 'Error', className: 'bg-danger/15 text-danger border-danger/30' },
  eliminado: { label: 'Eliminado', className: 'bg-danger/10 text-danger/70 border-danger/20' },
};

export function getContentStateLabel(state: ContentState): string {
  return STATE_META[state].label;
}

/** Mapeo canónico: los mismos crudos nunca producen etiquetas contradictorias entre pantallas. */
export function deriveContentState(raw: { status: string; visibility?: string }): ContentState {
  switch (raw.status) {
    case 'PROCESSING':
      return 'procesando';
    case 'FAILED':
      return 'error';
    case 'DELETED':
      return 'eliminado';
    case 'PRIVATE':
      return 'oculto';
    case 'READY':
      if (raw.visibility === 'PUBLIC') return 'publicado';
      // UNLISTED sigue visible por enlace; PRIVATE pasa a "oculto".
      return raw.visibility === 'PRIVATE' ? 'oculto' : 'publicado';
    default:
      return 'borrador';
  }
}

/** Clases del chip de estado (para componentes de UI de cualquier pantalla). */
export function getContentStateClasses(state: ContentState): string {
  return STATE_META[state].className;
}

// NOTA: el componente visual ContentStateChip vive en
// src/components/ContentStateChip.tsx (los services no contienen JSX).

/** Etiqueta corta del tipo de contenido (VOD / Clip / Reel). */
export function getKindLabel(kind: ContentKind): string {
  return kind === 'video' ? 'VOD' : kind === 'clip' ? 'Clip' : 'Reel';
}

// ============ FORMATO COMPARTIDO ============

export function formatContentDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatContentCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n ?? 0);
}

// ============ MODELO UNIFICADO PARA LA BIBLIOTECA ============

export interface UnifiedContentItem {
  id: string;
  kind: ContentKind;
  title: string;
  description: string;
  thumbnailUrl: string;
  /** URL multimedia si existe (puede ser '' → sin asset local todavía). */
  mediaUrl: string;
  duration: number;
  views: number;
  likes?: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  state: ContentState;
  rawStatus: string;
  visibility?: string;
  channelId: string;
  /** Slug del canal asociado (navegación /channel/:slug). */
  channelSlug?: string;
  /** Username del creador dueño del canal (navegación /u/:username). */
  creatorUsername?: string;
  creatorDisplayName?: string;
  /** true si el canal pertenece a un usuario demo_* (identificación DEMO). */
  isDemo: boolean;
  /** true si hay un medio reproducible con los assets actuales del proyecto. */
  hasPlayableMedia: boolean;
  storageKey?: string;
}

function resolveChannelInfo(channelId: string): { channelSlug?: string; creatorUsername?: string; creatorDisplayName?: string; isDemo: boolean } {
  const channel = db.getAllChannels().find(c => c.id === channelId);
  if (!channel) return { isDemo: false };
  const owner = db.getUserById(channel.userId);
  const username = owner?.username;
  return {
    channelSlug: channel.slug,
    creatorUsername: username,
    creatorDisplayName: owner?.displayName,
    isDemo: !!username && username.startsWith(DEMO_USERNAME_PREFIX),
  };
}

interface BaseContentSource {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: number;
  views: number;
  createdAt: string;
  updatedAt: string;
  channelId: string;
  status: string;
  visibility?: string;
  storageKey?: string;
}

function baseItem(item: BaseContentSource, kind: ContentKind): UnifiedContentItem {
  const info = resolveChannelInfo(item.channelId);
  return {
    id: item.id,
    kind,
    title: item.title,
    description: item.description,
    thumbnailUrl: item.thumbnailUrl,
    mediaUrl: item.videoUrl,
    duration: item.duration,
    views: item.views,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    state: deriveContentState(item),
    rawStatus: item.status,
    visibility: item.visibility,
    channelId: item.channelId,
    hasPlayableMedia: !!item.videoUrl,
    storageKey: item.storageKey,
    ...info, // incluye channelSlug/creatorUsername/creatorDisplayName/isDemo (única fuente)
  };
}

/**
 * ETAPA 7A/7B — Claves de almacenamiento con contenido VIVO que debe
 * conservarse (lista blanca para la limpieza de blobs huérfanos).
 * Fuente única: los SERVICIOS EXISTENTES (mismas colecciones localStorage
 * nexura_videos / nexura_clips / nexura_reels).
 *
 * Política conservadora (requisito Etapa 7B): se incluyen TODAS las claves
 * presentes en las colecciones crudas —incluidos registros DELETED,
 * PROCESSING, PRIVATE y UNLISTED— porque NO existe todavía una política
 * explícita de purga. Ante cualquier duda sobre una clave, NO se borra.
 * Lee crudo con el MISMO helper patrón-proyecto (JSON parse tolerante); no
 * hay arquitectura paralela: son exactamente las mismas colecciones que leen
 * video.ts / clip.ts / reel.ts.
 */
export function collectLiveStorageKeys(): Set<string> {
  const keys = new Set<string>();
  const readRaw = <T extends { storageKey?: string }>(lsKey: string): T[] => {
    try {
      return JSON.parse(localStorage.getItem(lsKey) || '[]') as T[];
    } catch {
      return [];
    }
  };
  for (const v of readRaw<{ storageKey?: string }>('nexura_videos')) if (v.storageKey) keys.add(v.storageKey);
  for (const c of readRaw<{ storageKey?: string }>('nexura_clips')) if (c.storageKey) keys.add(c.storageKey);
  for (const r of readRaw<{ storageKey?: string }>('nexura_reels')) if (r.storageKey) keys.add(r.storageKey);
  return keys;
}

/**
 * Limpieza SEGURA de blobs huérfanos en IndexedDB (mediaLocal).
 * Solo elimina claves que NO están en collectLiveStorageKeys() y que no son
 * demo (mediaLocal rechaza prefijos demo por sí mismo). Best-effort:
 * cualquier fallo se traga silenciosamente — nunca rompe la app.
 */
export async function runSafeMediaCleanup(): Promise<string[]> {
  try {
    const valid = collectLiveStorageKeys();
    return await cleanupOrphanMedia(valid);
  } catch {
    return [];
  }
}

/**
 * Contenido PROPIO del creador (usuario autenticado), de los tres tipos,
 * incluyendo borradores/ocultos/procesando (la biblioteca del autor ve todo
 * lo no eliminado). IDs estables: provienen directamente de los servicios base.
 */
export function getCreatorContent(userId: string): UnifiedContentItem[] {
  const channel = db.getChannelByUserId(userId);
  const items: UnifiedContentItem[] = [];

  const videos = videoService.getVideosForLibraryForOwner(userId);
  for (const v of videos) {
    // `visibility` ya fluye por baseItem(); acá solo se agrega publishedAt.
    items.push({ ...baseItem(v, 'video'), publishedAt: v.publishedAt });
  }

  const clips = clipService.getClipsForLibraryForOwner(userId);
  for (const c of clips) {
    items.push(baseItem(c, 'clip'));
  }

  if (channel) {
    for (const r of reelService.getChannelReelsIncludingHidden(channel.id)) {
      items.push({ ...baseItem(r, 'reel'), likes: r.likes });
    }
  }

  return items.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/** Enlace de visualización pública según el tipo (rutas reales de App.tsx). */
export function getContentPath(item: UnifiedContentItem): string {
  switch (item.kind) {
    case 'video':
      return `/video/${item.id}`;
    case 'clip':
      return `/clip/${item.id}`;
    case 'reel':
      // Arquitectura conservada de Etapa previas: el reel individual se abre
      // resaltándolo en el feed vertical mediante query param (no existe /reel/:id).
      return `/reels?r=${encodeURIComponent(item.id)}`;
  }
}

// ============ ACCIONES DE BIBLIOTECA (persistencia local) ============

/**
 * Editar título/descripción del contenido. Delega en el servicio base
 * correspondiente — no hay almacenamiento paralelo.
 * [FUTURO BACKEND] PATCH /api/{videos|clips|reels}/:id
 */
export function updateContentMetadata(
  kind: ContentKind,
  id: string,
  updates: { title?: string; description?: string }
): void {
  if (kind === 'video') videoService.updateVideoMetadata(id, updates);
  else if (kind === 'clip') clipService.updateClipMetadata(id, updates);
  else reelService.updateReelMetadata(id, updates);
}

/**
 * Cambiar visibilidad/publicación desde la Biblioteca.
 * - Videos: campo `visibility` (PUBLIC/UNLISTED/PRIVATE).
 * - Clips: campo `visibility` nuevo (Etapa 6) — NO altera `status`.
 * - Reels: ReelStatus ya admite PRIVATE (mismo patrón que VideoStatus).
 * Todo coherente con deriveContentState(): PRIVATE => "oculto".
 * [FUTURO BACKEND] PATCH /api/{videos|clips|reels}/:id { visibility }
 */
export function setContentVisibility(kind: ContentKind, id: string, makePublic: boolean): void {
  if (kind === 'video') {
    videoService.setVideoVisibility(id, makePublic ? 'PUBLIC' : 'PRIVATE');
  } else if (kind === 'clip') {
    clipService.setClipVisibility(id, makePublic ? 'PUBLIC' : 'PRIVATE');
  } else {
    reelService.setReelPublished(id, makePublic);
  }
}

/**
 * Eliminar contenido (soft-delete persistente, como los servicios base).
 * El contenido DEMO eliminado puede restaurarse con "Restaurar datos demo"
 * (resetDemoData de Etapa 5, que solo toca entidades demo_*).
 * [FUTURO BACKEND] DELETE /api/{videos|clips|reels}/:id
 */
export async function deleteContent(kind: ContentKind, id: string): Promise<void> {
  if (kind === 'video') await videoService.deleteVideo(id);
  else if (kind === 'clip') await clipService.deleteClip(id);
  else reelService.deleteReel(id);
}
