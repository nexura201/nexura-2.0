import type { User, Channel, Stream, Video, Clip } from '../types';
import * as db from './database';
import * as streaming from './streaming';
import * as videoService from './video';
import * as clipService from './clip';

/**
 * SearchService - Búsqueda global en NEXURA
 */

export interface SearchResult {
  channels: Array<{ item: User; channel: Channel; score: number }>;
  streams: Array<{ item: Stream; channel: Channel; user: User; score: number }>;
  videos: Array<{ item: Video; channel: Channel; user: User; score: number }>;
  clips: Array<{ item: Clip; channel: Channel; user: User; score: number }>;
}

/**
 * Normalizar texto para búsqueda
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .trim();
}

/**
 * Calcular score de relevancia
 */
function calculateScore(text: string, query: string): number {
  const normalizedText = normalizeText(text);
  const normalizedQuery = normalizeText(query);
  
  // Exact match
  if (normalizedText === normalizedQuery) return 100;
  
  // Starts with
  if (normalizedText.startsWith(normalizedQuery)) return 80;
  
  // Contains
  if (normalizedText.includes(normalizedQuery)) return 60;
  
  // Word match
  const words = normalizedQuery.split(/\s+/);
  const matchCount = words.filter(word => normalizedText.includes(word)).length;
  return (matchCount / words.length) * 40;
}

/**
 * Buscar en toda la plataforma
 */
export function search(query: string, limit: number = 20): SearchResult {
  if (!query.trim()) {
    return { channels: [], streams: [], videos: [], clips: [] };
  }

  const result: SearchResult = {
    channels: [],
    streams: [],
    videos: [],
    clips: [],
  };

  // Search channels/users
  const users = db.getAllUsers().filter(u => u.status === 'ACTIVE');
  users.forEach(user => {
    const score = Math.max(
      calculateScore(user.username, query),
      calculateScore(user.displayName, query),
      calculateScore(user.bio, query)
    );
    
    if (score > 0) {
      const channel = db.getChannelByUserId(user.id);
      if (channel) {
        result.channels.push({ item: user, channel, score });
      }
    }
  });

  // Search streams
  const activeStreams = streaming.getAllActiveStreams();
  activeStreams.forEach(stream => {
    const score = Math.max(
      calculateScore(stream.title, query),
      ...(stream.tags || []).map(tag => calculateScore(tag, query))
    );
    
    if (score > 0) {
      const channel = db.getAllChannels().find(c => c.id === stream.channelId);
      const user = channel ? db.getUserById(channel.userId) : null;
      
      if (channel && user) {
        result.streams.push({ item: stream, channel, user, score });
      }
    }
  });

  // Search videos
  const videos = videoService.getAllVideos();
  videos.forEach(video => {
    const score = Math.max(
      calculateScore(video.title, query),
      calculateScore(video.description, query)
    );
    
    if (score > 0) {
      const channel = db.getAllChannels().find(c => c.id === video.channelId);
      const user = channel ? db.getUserById(channel.userId) : null;
      
      if (channel && user) {
        result.videos.push({ item: video, channel, user, score });
      }
    }
  });

  // Search clips
  const clips = clipService.getAllClips();
  clips.forEach(clip => {
    const score = calculateScore(clip.title, query);
    
    if (score > 0) {
      const channel = db.getAllChannels().find(c => c.id === clip.channelId);
      const user = channel ? db.getUserById(channel.userId) : null;
      
      if (channel && user) {
        result.clips.push({ item: clip, channel, user, score });
      }
    }
  });

  // Sort by score and limit
  result.channels.sort((a, b) => b.score - a.score);
  result.streams.sort((a, b) => b.score - a.score);
  result.videos.sort((a, b) => b.score - a.score);
  result.clips.sort((a, b) => b.score - a.score);

  result.channels = result.channels.slice(0, limit);
  result.streams = result.streams.slice(0, limit);
  result.videos = result.videos.slice(0, limit);
  result.clips = result.clips.slice(0, limit);

  return result;
}

/**
 * Obtener sugerencias de búsqueda
 */
export function getSearchSuggestions(query: string, limit: number = 5): string[] {
  if (!query.trim() || query.length < 2) return [];

  const suggestions = new Set<string>();
  const normalizedQuery = normalizeText(query);

  // Add channel names
  const users = db.getAllUsers().filter(u => u.status === 'ACTIVE');
  users.forEach(user => {
    if (normalizeText(user.username).includes(normalizedQuery)) {
      suggestions.add(user.username);
    }
    if (normalizeText(user.displayName).includes(normalizedQuery)) {
      suggestions.add(user.displayName);
    }
  });

  // Add stream titles
  const activeStreams = streaming.getAllActiveStreams();
  activeStreams.forEach(stream => {
    if (stream.title && normalizeText(stream.title).includes(normalizedQuery)) {
      suggestions.add(stream.title);
    }
  });

  // Add video titles
  const videos = videoService.getAllVideos();
  videos.forEach(video => {
    if (normalizeText(video.title).includes(normalizedQuery)) {
      suggestions.add(video.title);
    }
  });

  // Add tags
  activeStreams.forEach(stream => {
    if (stream.tags) {
      stream.tags.forEach(tag => {
        if (normalizeText(tag).includes(normalizedQuery)) {
          suggestions.add(`#${tag}`);
        }
      });
    }
  });

  return Array.from(suggestions).slice(0, limit);
}
