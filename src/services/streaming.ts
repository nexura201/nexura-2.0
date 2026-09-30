import { v4 as uuidv4 } from 'uuid';
import type { Stream, StreamSession, StreamKey, StreamStatus, ViewerCount } from '../types';
import * as db from './database';

// ============ STORAGE KEYS ============
const STREAM_KEYS = {
  streamKeys: 'nexura_stream_keys',
  streams: 'nexura_streams',
  streamSessions: 'nexura_stream_sessions',
  viewerCounts: 'nexura_viewer_counts',
};

// ============ CONFIGURATION ============
const CONFIG = {
  rtmpServerUrl: 'rtmp://localhost:1935/live',
  hlsBaseUrl: 'http://localhost:8888',
  sessionTimeout: 30000, // 30s
  reconnectGracePeriod: 10000, // 10s
  heartbeatInterval: 5000, // 5s
};

// ============ UTILITY FUNCTIONS ============
function getCollection<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function setCollection<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function hashStreamKey(key: string): string {
  // Simple hash for demo - in production use bcrypt/argon2
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'sk_hash_' + Math.abs(hash).toString(36) + '_' + btoa(key).slice(0, 20);
}

function generateStreamKey(): string {
  // Generate cryptographically secure stream key
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// ============ STREAM KEY OPERATIONS ============
export function getOrCreateStreamKey(channelId: string): StreamKey {
  const keys = getCollection<StreamKey>(STREAM_KEYS.streamKeys);
  let streamKey = keys.find(k => k.channelId === channelId);
  
  if (!streamKey) {
    const now = new Date().toISOString();
    const rawKey = generateStreamKey();
    streamKey = {
      id: uuidv4(),
      channelId,
      keyHash: hashStreamKey(rawKey),
      createdAt: now,
      updatedAt: now,
    };
    keys.push(streamKey);
    setCollection(STREAM_KEYS.streamKeys, keys);
    
    // Store raw key temporarily for display (in production, only show once)
    localStorage.setItem(`streamhub_temp_key_${channelId}`, rawKey);
    
    db.createAuditLog('system', 'STREAM_KEY_CREATED', 'channel', channelId, 'Stream key generated');
  }
  
  return streamKey;
}

export function getStreamKeyForDisplay(channelId: string): string | null {
  // In production, this would require re-authentication
  // For demo, we retrieve the temp key if it exists
  return localStorage.getItem(`streamhub_temp_key_${channelId}`);
}

export function regenerateStreamKey(channelId: string): StreamKey {
  const keys = getCollection<StreamKey>(STREAM_KEYS.streamKeys);
  const idx = keys.findIndex(k => k.channelId === channelId);
  
  if (idx === -1) {
    throw new Error('STREAM_KEY_NOT_FOUND');
  }
  
  const rawKey = generateStreamKey();
  keys[idx].keyHash = hashStreamKey(rawKey);
  keys[idx].updatedAt = new Date().toISOString();
  setCollection(STREAM_KEYS.streamKeys, keys);
  
  // Store new key temporarily
  localStorage.setItem(`streamhub_temp_key_${channelId}`, rawKey);
  
  db.createAuditLog('system', 'STREAM_KEY_REGENERATED', 'channel', channelId, 'Stream key regenerated');
  
  return keys[idx];
}

export function validateStreamKey(channelId: string, rawKey: string): boolean {
  const keys = getCollection<StreamKey>(STREAM_KEYS.streamKeys);
  const streamKey = keys.find(k => k.channelId === channelId);
  
  if (!streamKey) return false;
  
  return streamKey.keyHash === hashStreamKey(rawKey);
}

export function findChannelByStreamKey(rawKey: string): string | null {
  const keys = getCollection<StreamKey>(STREAM_KEYS.streamKeys);
  const keyHash = hashStreamKey(rawKey);
  const streamKey = keys.find(k => k.keyHash === keyHash);
  
  return streamKey?.channelId || null;
}

// ============ STREAM OPERATIONS ============
export function createStream(channelId: string, streamKeyId: string): Stream {
  const streams = getCollection<Stream>(STREAM_KEYS.streams);
  const now = new Date().toISOString();
  
  const stream: Stream = {
    id: uuidv4(),
    channelId,
    title: '',
    categoryId: null,
    tags: [],
    thumbnailUrl: '',
    status: 'OFFLINE',
    streamKeyId,
    startedAt: null,
    endedAt: null,
    lastHeartbeatAt: null,
    viewerCount: 0,
    peakViewerCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  
  streams.push(stream);
  setCollection(STREAM_KEYS.streams, streams);
  
  return stream;
}

export function getStreamByChannelId(channelId: string): Stream | null {
  const streams = getCollection<Stream>(STREAM_KEYS.streams);
  return streams.find(s => s.channelId === channelId) || null;
}

export function getStreamById(streamId: string): Stream | null {
  const streams = getCollection<Stream>(STREAM_KEYS.streams);
  return streams.find(s => s.id === streamId) || null;
}

export function updateStream(streamId: string, data: Partial<Stream>): Stream {
  const streams = getCollection<Stream>(STREAM_KEYS.streams);
  const idx = streams.findIndex(s => s.id === streamId);
  
  if (idx === -1) throw new Error('STREAM_NOT_FOUND');
  
  Object.assign(streams[idx], data, { updatedAt: new Date().toISOString() });
  setCollection(STREAM_KEYS.streams, streams);
  
  return streams[idx];
}

export function getAllActiveStreams(): Stream[] {
  const streams = getCollection<Stream>(STREAM_KEYS.streams);
  return streams.filter(s => s.status === 'LIVE' || s.status === 'STARTING');
}

// ============ STREAM SESSION OPERATIONS ============
export function createStreamSession(streamId: string, sourceIp: string): StreamSession {
  const sessions = getCollection<StreamSession>(STREAM_KEYS.streamSessions);
  const now = new Date().toISOString();
  
  const session: StreamSession = {
    id: uuidv4(),
    streamId,
    startedAt: now,
    endedAt: null,
    lastHeartbeatAt: now,
    sourceIp,
    ingestServer: CONFIG.rtmpServerUrl,
    status: 'STARTING',
    createdAt: now,
    updatedAt: now,
  };
  
  sessions.push(session);
  setCollection(STREAM_KEYS.streamSessions, sessions);
  
  return session;
}

export function updateStreamSession(sessionId: string, data: Partial<StreamSession>): StreamSession {
  const sessions = getCollection<StreamSession>(STREAM_KEYS.streamSessions);
  const idx = sessions.findIndex(s => s.id === sessionId);
  
  if (idx === -1) throw new Error('SESSION_NOT_FOUND');
  
  Object.assign(sessions[idx], data, { updatedAt: new Date().toISOString() });
  setCollection(STREAM_KEYS.streamSessions, sessions);
  
  return sessions[idx];
}

export function getActiveSessionByStreamId(streamId: string): StreamSession | null {
  const sessions = getCollection<StreamSession>(STREAM_KEYS.streamSessions);
  return sessions.find(s => s.streamId === streamId && !s.endedAt) || null;
}

// ============ STREAMING EVENT SERVICE ============
export async function handleStreamStarted(channelId: string, sourceIp: string = '127.0.0.1'): Promise<{ stream: Stream; session: StreamSession } | null> {
  // Get channel
  const channel = db.getChannelByUserId(channelId);
  if (!channel) {
    console.error('[STREAM] Channel not found:', channelId);
    return null;
  }
  
  // Get user
  const user = db.getUserById(channel.userId);
  if (!user || user.status !== 'ACTIVE') {
    console.error('[STREAM] User not active:', channel.userId);
    return null;
  }
  
  // Get or create stream
  let stream = getStreamByChannelId(channel.id);
  if (!stream) {
    const streamKey = getOrCreateStreamKey(channel.id);
    stream = createStream(channel.id, streamKey.id);
  }
  
  // Create session
  const session = createStreamSession(stream.id, sourceIp);
  
  // Update stream status
  const now = new Date().toISOString();
  updateStream(stream.id, {
    status: 'STARTING',
    startedAt: now,
    lastHeartbeatAt: now,
  });
  
  // Update channel to live
  db.updateChannel(channel.id, { isLive: true });
  
  // Log event
  db.createAuditLog(user.id, 'STREAM_STARTED', 'stream', stream.id, `Stream started from ${sourceIp}`);
  
  // Simulate transition to LIVE after a short delay (in production, this comes from MediaMTX)
  setTimeout(() => {
    updateStream(stream!.id, { status: 'LIVE' });
    updateStreamSession(session.id, { status: 'LIVE' });
  }, 2000);
  
  return { stream, session };
}

export async function handleStreamStopped(streamId: string): Promise<void> {
  const stream = getStreamById(streamId);
  if (!stream) return;
  
  const session = getActiveSessionByStreamId(streamId);
  if (!session) return;
  
  const now = new Date().toISOString();
  
  // Update session
  updateStreamSession(session.id, {
    status: 'OFFLINE',
    endedAt: now,
  });
  
  // Update stream
  updateStream(stream.id, {
    status: 'OFFLINE',
    endedAt: now,
    viewerCount: 0,
  });
  
  // Update channel
  const channel = db.getChannelByUserId(stream.channelId);
  if (channel) {
    db.updateChannel(channel.id, { isLive: false });
  }
  
  // Log event
  db.createAuditLog('system', 'STREAM_STOPPED', 'stream', stream.id, 'Stream ended');
}

export async function handleStreamHeartbeat(streamId: string): Promise<void> {
  const stream = getStreamById(streamId);
  if (!stream) return;
  
  const session = getActiveSessionByStreamId(streamId);
  if (!session) return;
  
  const now = new Date().toISOString();
  
  updateStream(stream.id, { lastHeartbeatAt: now });
  updateStreamSession(session.id, { lastHeartbeatAt: now });
}

// ============ VIEWER COUNT SERVICE ============
export function getViewerCount(channelId: string): ViewerCount {
  const counts = getCollection<ViewerCount>(STREAM_KEYS.viewerCounts);
  const count = counts.find(c => c.channelId === channelId);
  
  if (!count) {
    return {
      channelId,
      current: 0,
      peak: 0,
      updatedAt: new Date().toISOString(),
    };
  }
  
  return count;
}

export function updateViewerCount(channelId: string, current: number): ViewerCount {
  const counts = getCollection<ViewerCount>(STREAM_KEYS.viewerCounts);
  const idx = counts.findIndex(c => c.channelId === channelId);
  
  const now = new Date().toISOString();
  const stream = getStreamByChannelId(channelId);
  const peak = stream?.peakViewerCount || 0;
  
  const newCount: ViewerCount = {
    channelId,
    current,
    peak: Math.max(peak, current),
    updatedAt: now,
  };
  
  if (idx === -1) {
    counts.push(newCount);
  } else {
    counts[idx] = newCount;
  }
  
  setCollection(STREAM_KEYS.viewerCounts, counts);
  
  // Update stream peak
  if (stream && current > peak) {
    updateStream(stream.id, { peakViewerCount: current });
  }
  
  return newCount;
}

export function incrementViewers(channelId: string): number {
  const count = getViewerCount(channelId);
  return updateViewerCount(channelId, count.current + 1).current;
}

export function decrementViewers(channelId: string): number {
  const count = getViewerCount(channelId);
  return updateViewerCount(channelId, Math.max(0, count.current - 1)).current;
}

// ============ STREAM CONFIG ============
export function getStreamConfig(channelId: string): { rtmpServerUrl: string; hlsPlaybackUrl: string } {
  const channel = db.getChannelByUserId(channelId);
  if (!channel) throw new Error('CHANNEL_NOT_FOUND');
  
  return {
    rtmpServerUrl: CONFIG.rtmpServerUrl,
    hlsPlaybackUrl: `${CONFIG.hlsBaseUrl}/hls/${channel.slug}`,
  };
}

export function getPlaybackUrl(channelSlug: string): string {
  return `${CONFIG.hlsBaseUrl}/hls/${channelSlug}/index.m3u8`;
}

// ============ HEALTH CHECK ============
export function checkMediaServerHealth(): boolean {
  // In production, this would ping MediaMTX API
  // For demo, we simulate health check
  return true;
}

// ============ CLEANUP ============
export function cleanupStaleStreams(): void {
  const streams = getCollection<Stream>(STREAM_KEYS.streams);
  const now = Date.now();
  
  streams.forEach(stream => {
    if (stream.status === 'LIVE' && stream.lastHeartbeatAt) {
      const lastHeartbeat = new Date(stream.lastHeartbeatAt).getTime();
      if (now - lastHeartbeat > CONFIG.sessionTimeout) {
        // Stream has timed out
        handleStreamStopped(stream.id);
        console.warn('[STREAM] Stream timed out:', stream.id);
      }
    }
  });
}

// Run cleanup every 30 seconds
setInterval(cleanupStaleStreams, 30000);
