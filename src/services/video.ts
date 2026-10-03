import { v4 as uuidv4 } from 'uuid';
import type { Video, VideoStatus, VideoVisibility, Stream } from '../types';
import { storageService } from './storage';
import * as db from './database';
import * as streaming from './streaming';

/**
 * VideoService - Maneja VOD (Video On Demand)
 * 
 * Flujo:
 * 1. Stream termina
 * 2. Se crea un Video en estado PROCESSING
 * 3. Se procesa el video (en producción: FFmpeg)
 * 4. Se guarda en storage
 * 5. Se actualiza el estado a READY
 */

const VIDEO_KEYS = {
  videos: 'nexura_videos',
};

// ============ VIDEO OPERATIONS ============

/**
 * Crear un VOD a partir de un stream terminado
 */
export async function createVideoFromStream(streamId: string): Promise<Video> {
  const stream = streaming.getStreamById(streamId);
  if (!stream) {
    throw new Error('STREAM_NOT_FOUND');
  }

  const channel = db.getAllChannels().find(c => c.id === stream.channelId);
  if (!channel) {
    throw new Error('CHANNEL_NOT_FOUND');
  }

  const videoId = uuidv4();
  const storageKey = `videos/${channel.id}/${videoId}/video.mp4`;
  
  const video: Video = {
    id: videoId,
    channelId: stream.channelId,
    streamId: stream.id,
    title: stream.title || `Stream ${new Date(stream.startedAt || '').toLocaleDateString()}`,
    description: '',
    status: 'PROCESSING',
    visibility: 'PUBLIC',
    duration: 0,
    thumbnailUrl: '',
    videoUrl: '',
    storageKey,
    views: 0,
    processingStartedAt: new Date().toISOString(),
    processingCompletedAt: null,
    publishedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Save video
  const videos = getCollection<Video>(VIDEO_KEYS.videos);
  videos.push(video);
  setCollection(VIDEO_KEYS.videos, videos);

  // Log audit
  db.createAuditLog('system', 'VOD_CREATED', 'video', video.id, `VOD created from stream ${streamId}`);

  // Process video (simulate FFmpeg processing)
  await processVideo(video.id);

  return video;
}

/**
 * Procesar un video (en producción: usar FFmpeg)
 */
async function processVideo(videoId: string): Promise<void> {
  const videos = getCollection<Video>(VIDEO_KEYS.videos);
  const idx = videos.findIndex(v => v.id === videoId);
  
  if (idx === -1) {
    throw new Error('VIDEO_NOT_FOUND');
  }

  const video = videos[idx];

  try {
    // Simulate processing time (in production: FFmpeg worker)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // In production, this would:
    // 1. Download the stream recording
    // 2. Process with FFmpeg (transcode, generate thumbnail)
    // 3. Upload to storage
    // 4. Update video metadata

    // For demo: create a placeholder video file
    const placeholderVideo = createPlaceholderVideo(video.title);
    const videoFile = new Blob([placeholderVideo], { type: 'video/mp4' });
    
    const storageFile = await storageService.upload(videoFile, `videos/${video.channelId}/${video.id}`);

    // Generate thumbnail
    const thumbnail = createPlaceholderThumbnail(video.title);
    const thumbnailFile = new Blob([thumbnail], { type: 'image/jpeg' });
    const thumbnailStorage = await storageService.upload(thumbnailFile, `thumbnails/${video.channelId}/${video.id}`);

    // Update video
    videos[idx].status = 'READY';
    videos[idx].videoUrl = storageFile.url;
    videos[idx].thumbnailUrl = thumbnailStorage.url;
    videos[idx].duration = 300; // 5 minutes placeholder
    videos[idx].processingCompletedAt = new Date().toISOString();
    videos[idx].publishedAt = new Date().toISOString();
    videos[idx].updatedAt = new Date().toISOString();

    setCollection(VIDEO_KEYS.videos, videos);

    // Log audit
    db.createAuditLog('system', 'VOD_PROCESSED', 'video', video.id, 'VOD processing completed');

    console.log(`[VOD] Video processed: ${video.id}`);
  } catch (error) {
    console.error('[VOD] Processing failed:', error);
    
    videos[idx].status = 'FAILED';
    videos[idx].updatedAt = new Date().toISOString();
    setCollection(VIDEO_KEYS.videos, videos);

    db.createAuditLog('system', 'VOD_FAILED', 'video', video.id, `Processing failed: ${error}`);
  }
}

/**
 * Obtener un video por ID
 */
export function getVideoById(videoId: string): Video | null {
  const videos = getCollection<Video>(VIDEO_KEYS.videos);
  return videos.find(v => v.id === videoId) || null;
}

/**
 * Obtener videos de un canal
 */
export function getChannelVideos(channelId: string): Video[] {
  const videos = getCollection<Video>(VIDEO_KEYS.videos);
  return videos
    .filter(v => v.channelId === channelId && v.status === 'READY' && v.visibility === 'PUBLIC')
    .sort((a, b) => new Date(b.publishedAt || '').getTime() - new Date(a.publishedAt || '').getTime());
}

/**
 * Actualizar un video
 */
export function updateVideo(videoId: string, updates: Partial<Video>): Video {
  const videos = getCollection<Video>(VIDEO_KEYS.videos);
  const idx = videos.findIndex(v => v.id === videoId);
  
  if (idx === -1) {
    throw new Error('VIDEO_NOT_FOUND');
  }

  Object.assign(videos[idx], updates, { updatedAt: new Date().toISOString() });
  setCollection(VIDEO_KEYS.videos, videos);

  return videos[idx];
}

/**
 * Eliminar un video
 */
export async function deleteVideo(videoId: string): Promise<boolean> {
  const videos = getCollection<Video>(VIDEO_KEYS.videos);
  const video = videos.find(v => v.id === videoId);
  
  if (!video) {
    throw new Error('VIDEO_NOT_FOUND');
  }

  // Delete from storage
  if (video.storageKey) {
    await storageService.delete(video.storageKey);
  }

  // Mark as deleted
  const idx = videos.findIndex(v => v.id === videoId);
  videos[idx].status = 'DELETED';
  videos[idx].updatedAt = new Date().toISOString();
  setCollection(VIDEO_KEYS.videos, videos);

  // Log audit
  db.createAuditLog('system', 'VOD_DELETED', 'video', videoId, 'VOD deleted');

  return true;
}

/**
 * Incrementar contador de vistas
 */
export function incrementVideoViews(videoId: string): void {
  const videos = getCollection<Video>(VIDEO_KEYS.videos);
  const idx = videos.findIndex(v => v.id === videoId);
  
  if (idx === -1) return;

  videos[idx].views += 1;
  setCollection(VIDEO_KEYS.videos, videos);
}

/**
 * Obtener todos los videos
 */
export function getAllVideos(): Video[] {
  const videos = getCollection<Video>(VIDEO_KEYS.videos);
  return videos.filter(v => v.status === 'READY' && v.visibility === 'PUBLIC');
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
 * Crear un video placeholder (para demo)
 * En producción: usar FFmpeg para procesar el video real
 */
function createPlaceholderVideo(title: string): ArrayBuffer {
  // Create a minimal MP4 file structure
  // This is just a placeholder - in production, use actual video processing
  const data = new Uint8Array(1024);
  // MP4 header (simplified)
  data[0] = 0x00;
  data[1] = 0x00;
  data[2] = 0x00;
  data[3] = 0x20;
  data[4] = 0x66; // 'f'
  data[5] = 0x74; // 't'
  data[6] = 0x79; // 'y'
  data[7] = 0x70; // 'p'
  
  return data.buffer;
}

/**
 * Crear un thumbnail placeholder (para demo)
 * En producción: usar FFmpeg para extraer un frame del video
 */
function createPlaceholderThumbnail(title: string): ArrayBuffer {
  // Create a minimal JPEG file structure
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, 320, 180);
    gradient.addColorStop(0, '#1677FF');
    gradient.addColorStop(1, '#3D9BFF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 320, 180);
    
    // Title text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title.substring(0, 30), 160, 90);
    
    // Play icon
    ctx.beginPath();
    ctx.moveTo(140, 70);
    ctx.lineTo(140, 110);
    ctx.lineTo(180, 90);
    ctx.closePath();
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  }
  
  // Convert to blob
  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
  const byteString = atob(dataUrl.split(',')[1]);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  
  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }
  
  return arrayBuffer;
}
