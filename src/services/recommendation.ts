import type { User, Channel, Stream, Video, Clip } from '../types';
import * as db from './database';
import * as streaming from './streaming';
import * as videoService from './video';
import * as clipService from './clip';

/**
 * RecommendationService - Sistema de recomendaciones básicas
 */

export interface Recommendation {
  type: 'stream' | 'video' | 'clip' | 'channel';
  item: Stream | Video | Clip | User;
  channel: Channel;
  user: User;
  reason: string;
  score: number;
}

/**
 * Obtener recomendaciones para un usuario
 */
export function getRecommendations(userId: string | null, limit: number = 20): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (!userId) {
    // Cold start: recomendaciones generales
    return getColdStartRecommendations(limit);
  }

  const user = db.getUserById(userId);
  if (!user) return getColdStartRecommendations(limit);

  // 1. Canales seguidos que están LIVE
  const following = db.getFollowing(userId);
  following.forEach(follow => {
    const followedUser = db.getUserById(follow.followingId);
    if (!followedUser) return;

    const channel = db.getChannelByUserId(follow.followingId);
    if (!channel) return;

    const stream = streaming.getStreamByChannelId(channel.id);
    if (stream && stream.status === 'LIVE') {
      recommendations.push({
        type: 'stream',
        item: stream,
        channel,
        user: followedUser,
        reason: 'followed_channel',
        score: 100,
      });
    }
  });

  // 2. Streams populares
  const activeStreams = streaming.getAllActiveStreams();
  const sortedStreams = activeStreams.sort((a, b) => b.viewerCount - a.viewerCount);
  
  sortedStreams.slice(0, 5).forEach(stream => {
    const channel = db.getAllChannels().find(c => c.id === stream.channelId);
    const streamUser = channel ? db.getUserById(channel.userId) : null;
    
    if (channel && streamUser) {
      // Evitar duplicados
      if (!recommendations.some(r => r.type === 'stream' && (r.item as Stream).id === stream.id)) {
        recommendations.push({
          type: 'stream',
          item: stream,
          channel,
          user: streamUser,
          reason: 'popular',
          score: 80 - (sortedStreams.indexOf(stream) * 5),
        });
      }
    }
  });

  // 3. Videos recientes
  const videos = videoService.getAllVideos();
  const recentVideos = videos
    .sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime())
    .slice(0, 5);

  recentVideos.forEach(video => {
    const channel = db.getAllChannels().find(c => c.id === video.channelId);
    const videoUser = channel ? db.getUserById(channel.userId) : null;
    
    if (channel && videoUser) {
      recommendations.push({
        type: 'video',
        item: video,
        channel,
        user: videoUser,
        reason: 'recent',
        score: 60,
      });
    }
  });

  // 4. Clips populares
  const clips = clipService.getAllClips();
  const popularClips = clips
    .sort((a, b) => b.views - a.views)
    .slice(0, 3);

  popularClips.forEach(clip => {
    const channel = db.getAllChannels().find(c => c.id === clip.channelId);
    const clipUser = channel ? db.getUserById(channel.userId) : null;
    
    if (channel && clipUser) {
      recommendations.push({
        type: 'clip',
        item: clip,
        channel,
        user: clipUser,
        reason: 'trending',
        score: 50,
      });
    }
  });

  // Ordenar por score y limitar
  recommendations.sort((a, b) => b.score - a.score);
  return recommendations.slice(0, limit);
}

/**
 * Recomendaciones para usuarios nuevos (cold start)
 */
function getColdStartRecommendations(limit: number): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // 1. Streams LIVE
  const activeStreams = streaming.getAllActiveStreams();
  const sortedStreams = activeStreams.sort((a, b) => b.viewerCount - a.viewerCount);
  
  sortedStreams.slice(0, 8).forEach(stream => {
    const channel = db.getAllChannels().find(c => c.id === stream.channelId);
    const streamUser = channel ? db.getUserById(channel.userId) : null;
    
    if (channel && streamUser) {
      recommendations.push({
        type: 'stream',
        item: stream,
        channel,
        user: streamUser,
        reason: 'popular',
        score: 100 - (sortedStreams.indexOf(stream) * 5),
      });
    }
  });

  // 2. Videos populares
  const videos = videoService.getAllVideos();
  const popularVideos = videos
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  popularVideos.forEach(video => {
    const channel = db.getAllChannels().find(c => c.id === video.channelId);
    const videoUser = channel ? db.getUserById(channel.userId) : null;
    
    if (channel && videoUser) {
      recommendations.push({
        type: 'video',
        item: video,
        channel,
        user: videoUser,
        reason: 'popular',
        score: 70,
      });
    }
  });

  // 3. Clips populares
  const clips = clipService.getAllClips();
  const popularClips = clips
    .sort((a, b) => b.views - a.views)
    .slice(0, 3);

  popularClips.forEach(clip => {
    const channel = db.getAllChannels().find(c => c.id === clip.channelId);
    const clipUser = channel ? db.getUserById(channel.userId) : null;
    
    if (channel && clipUser) {
      recommendations.push({
        type: 'clip',
        item: clip,
        channel,
        user: clipUser,
        reason: 'trending',
        score: 50,
      });
    }
  });

  recommendations.sort((a, b) => b.score - a.score);
  return recommendations.slice(0, limit);
}

/**
 * Obtener tendencias
 */
export function getTrending(limit: number = 10): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Streams con más espectadores
  const activeStreams = streaming.getAllActiveStreams();
  const sortedStreams = activeStreams.sort((a, b) => b.viewerCount - a.viewerCount);
  
  sortedStreams.slice(0, 5).forEach(stream => {
    const channel = db.getAllChannels().find(c => c.id === stream.channelId);
    const streamUser = channel ? db.getUserById(channel.userId) : null;
    
    if (channel && streamUser) {
      recommendations.push({
        type: 'stream',
        item: stream,
        channel,
        user: streamUser,
        reason: 'trending',
        score: stream.viewerCount,
      });
    }
  });

  // Videos más vistos recientemente
  const videos = videoService.getAllVideos();
  const recentPopular = videos
    .filter(v => {
      const published = new Date(v.publishedAt || v.createdAt);
      const hoursAgo = (Date.now() - published.getTime()) / (1000 * 60 * 60);
      return hoursAgo < 24; // Últimas 24 horas
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  recentPopular.forEach(video => {
    const channel = db.getAllChannels().find(c => c.id === video.channelId);
    const videoUser = channel ? db.getUserById(channel.userId) : null;
    
    if (channel && videoUser) {
      recommendations.push({
        type: 'video',
        item: video,
        channel,
        user: videoUser,
        reason: 'trending',
        score: video.views,
      });
    }
  });

  recommendations.sort((a, b) => b.score - a.score);
  return recommendations.slice(0, limit);
}
