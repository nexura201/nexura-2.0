import { v4 as uuidv4 } from 'uuid';
import type { Clip, ClipStatus } from '../types';
import { storageService } from './storage';
import * as db from './database';
import * as streaming from './streaming';
import * as videoService from './video';

/**
 * ClipService - Maneja clips de streams y videos
 * 
 * Flujo:
 * 1. Usuario crea un clip desde un stream LIVE o VOD
 * 2. Se crea un Clip en estado PROCESSING
 * 3. Se procesa el clip (en producción: FFmpeg)
 * 4. Se guarda en storage
 * 5. Se actualiza el estado a READY
 */

const CLIP_KEYS = {
  clips: 'nexura_clips',
};

// ============ CLIP OPERATIONS ============

/**
 * Crear un clip desde un stream LIVE
 */
export async function createClipFromStream(
  channelId: string,
  creatorId: string,
  title: string,
  startTime: number,
  endTime: number
): Promise<Clip> {
  const channel = db.getAllChannels().find(c => c.id === channelId);
  if (!channel) {
    throw new Error('CHANNEL_NOT_FOUND');
  }

  const stream = streaming.getStreamByChannelId(channelId);
  if (!stream || stream.status !== 'LIVE') {
    throw new Error('STREAM_NOT_LIVE');
  }

  const duration = endTime - startTime;
  if (duration < 5 || duration > 60) {
    throw new Error('INVALID_CLIP_DURATION');
  }

  const clipId = uuidv4();
  const storageKey = `clips/${channelId}/${clipId}/clip.mp4`;
  
  const clip: Clip = {
    id: clipId,
    channelId,
    videoId: null,
    streamId: stream.id,
    creatorId,
    title: title || `Clip from ${stream.title || 'stream'}`,
    description: '',
    startTime,
    endTime,
    duration,
    status: 'PROCESSING',
    thumbnailUrl: '',
    videoUrl: '',
    storageKey,
    views: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Save clip
  const clips = getCollection<Clip>(CLIP_KEYS.clips);
  clips.push(clip);
  setCollection(CLIP_KEYS.clips, clips);

  // Log audit
  db.createAuditLog(creatorId, 'CLIP_CREATED', 'clip', clip.id, `Clip created from stream ${stream.id}`);

  // Process clip (simulate FFmpeg processing)
  await processClip(clip.id);

  return clip;
}

/**
 * Crear un clip desde un VOD
 */
export async function createClipFromVideo(
  videoId: string,
  creatorId: string,
  title: string,
  startTime: number,
  endTime: number
): Promise<Clip> {
  const video = videoService.getVideoById(videoId);
  if (!video) {
    throw new Error('VIDEO_NOT_FOUND');
  }

  const duration = endTime - startTime;
  if (duration < 5 || duration > 60) {
    throw new Error('INVALID_CLIP_DURATION');
  }

  const clipId = uuidv4();
  const storageKey = `clips/${video.channelId}/${clipId}/clip.mp4`;
  
  const clip: Clip = {
    id: clipId,
    channelId: video.channelId,
    videoId: video.id,
    streamId: null,
    creatorId,
    title: title || `Clip from ${video.title}`,
    description: '',
    startTime,
    endTime,
    duration,
    status: 'PROCESSING',
    thumbnailUrl: '',
    videoUrl: '',
    storageKey,
    views: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Save clip
  const clips = getCollection<Clip>(CLIP_KEYS.clips);
  clips.push(clip);
  setCollection(CLIP_KEYS.clips, clips);

  // Log audit
  db.createAuditLog(creatorId, 'CLIP_CREATED', 'clip', clip.id, `Clip created from video ${videoId}`);

  // Process clip
  await processClip(clip.id);

  return clip;
}

/**
 * Procesar un clip (en producción: usar FFmpeg)
 */
async function processClip(clipId: string): Promise<void> {
  const clips = getCollection<Clip>(CLIP_KEYS.clips);
  const idx = clips.findIndex(c => c.id === clipId);
  
  if (idx === -1) {
    throw new Error('CLIP_NOT_FOUND');
  }

  const clip = clips[idx];

  try {
    // Simulate processing time (in production: FFmpeg worker)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // In production, this would:
    // 1. Download the source video/stream segment
    // 2. Extract the clip with FFmpeg
    // 3. Generate thumbnail
    // 4. Upload to storage

    // For demo: create placeholder files
    const placeholderClip = createPlaceholderClip(clip.title);
    const clipFile = new Blob([placeholderClip], { type: 'video/mp4' });
    
    const storageFile = await storageService.upload(clipFile, `clips/${clip.channelId}/${clip.id}`);

    // Generate thumbnail
    const thumbnail = createClipThumbnail(clip.title);
    const thumbnailFile = new Blob([thumbnail], { type: 'image/jpeg' });
    const thumbnailStorage = await storageService.upload(thumbnailFile, `thumbnails/clips/${clip.channelId}/${clip.id}`);

    // Update clip
    clips[idx].status = 'READY';
    clips[idx].videoUrl = storageFile.url;
    clips[idx].thumbnailUrl = thumbnailStorage.url;
    clips[idx].updatedAt = new Date().toISOString();

    setCollection(CLIP_KEYS.clips, clips);

    // Log audit
    db.createAuditLog('system', 'CLIP_PROCESSED', 'clip', clip.id, 'Clip processing completed');

    console.log(`[CLIP] Clip processed: ${clip.id}`);
  } catch (error) {
    console.error('[CLIP] Processing failed:', error);
    
    clips[idx].status = 'FAILED';
    clips[idx].updatedAt = new Date().toISOString();
    setCollection(CLIP_KEYS.clips, clips);

    db.createAuditLog('system', 'CLIP_FAILED', 'clip', clip.id, `Processing failed: ${error}`);
  }
}

/**
 * Obtener un clip por ID
 */
export function getClipById(clipId: string): Clip | null {
  const clips = getCollection<Clip>(CLIP_KEYS.clips);
  return clips.find(c => c.id === clipId) || null;
}

/**
 * Obtener clips de un canal
 */
export function getChannelClips(channelId: string): Clip[] {
  const clips = getCollection<Clip>(CLIP_KEYS.clips);
  return clips
    .filter(c => c.channelId === channelId && c.status === 'READY')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Obtener clips de un video
 */
export function getVideoClips(videoId: string): Clip[] {
  const clips = getCollection<Clip>(CLIP_KEYS.clips);
  return clips
    .filter(c => c.videoId === videoId && c.status === 'READY')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Obtener clips de un stream
 */
export function getStreamClips(streamId: string): Clip[] {
  const clips = getCollection<Clip>(CLIP_KEYS.clips);
  return clips
    .filter(c => c.streamId === streamId && c.status === 'READY')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Eliminar un clip
 */
export async function deleteClip(clipId: string): Promise<boolean> {
  const clips = getCollection<Clip>(CLIP_KEYS.clips);
  const clip = clips.find(c => c.id === clipId);
  
  if (!clip) {
    throw new Error('CLIP_NOT_FOUND');
  }

  // Delete from storage
  if (clip.storageKey) {
    await storageService.delete(clip.storageKey);
  }

  // Mark as deleted
  const idx = clips.findIndex(c => c.id === clipId);
  clips[idx].status = 'DELETED';
  clips[idx].updatedAt = new Date().toISOString();
  setCollection(CLIP_KEYS.clips, clips);

  // Log audit
  db.createAuditLog('system', 'CLIP_DELETED', 'clip', clipId, 'Clip deleted');

  return true;
}

/**
 * Incrementar contador de vistas
 */
export function incrementClipViews(clipId: string): void {
  const clips = getCollection<Clip>(CLIP_KEYS.clips);
  const idx = clips.findIndex(c => c.id === clipId);
  
  if (idx === -1) return;

  clips[idx].views += 1;
  setCollection(CLIP_KEYS.clips, clips);
}

/**
 * Obtener todos los clips
 */
export function getAllClips(): Clip[] {
  const clips = getCollection<Clip>(CLIP_KEYS.clips);
  return clips.filter(c => c.status === 'READY');
}

// ============ UTILITY FUNCTIONS ============

function getCollection<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setCollection<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Crear un clip placeholder (para demo)
 */
function createPlaceholderClip(title: string): ArrayBuffer {
  const data = new Uint8Array(512);
  data[0] = 0x00;
  data[1] = 0x00;
  data[2] = 0x00;
  data[3] = 0x20;
  data[4] = 0x66;
  data[5] = 0x74;
  data[6] = 0x79;
  data[7] = 0x70;
  
  return data.buffer;
}

/**
 * Crear un thumbnail de clip
 */
function createClipThumbnail(title: string): ArrayBuffer {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, 320, 180);
    gradient.addColorStop(0, '#F59E0B');
    gradient.addColorStop(1, '#FBBF24');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 320, 180);
    
    // Title text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title.substring(0, 30), 160, 90);
    
    // Scissors icon
    ctx.font = '40px sans-serif';
    ctx.fillText('✂️', 160, 50);
  }
  
  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
  const byteString = atob(dataUrl.split(',')[1]);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  
  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }
  
  return arrayBuffer;
}
