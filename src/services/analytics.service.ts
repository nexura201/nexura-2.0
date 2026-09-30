import type { 
  StreamAnalytics, 
  VideoAnalytics, 
  ClipAnalytics, 
  DashboardStats, 
  AnalyticsPeriod,
  Stream,
  Video,
  Clip
} from '../types';

const ANALYTICS_KEY = 'nexura_analytics';

export class AnalyticsService {
  // Obtener estadísticas del dashboard para un canal
  static getDashboardStats(channelId: string): DashboardStats {
    const channel = JSON.parse(localStorage.getItem('nexura_channels') || '[]')
      .find((c: any) => c.id === channelId);
    
    if (!channel) {
      return {
        totalFollowers: 0,
        totalFollowing: 0,
        totalViews: 0,
        totalStreamHours: 0,
        totalVideos: 0,
        totalClips: 0,
        recentActivity: [],
        liveStatus: 'OFFLINE',
      };
    }

    const followers = JSON.parse(localStorage.getItem('nexura_follows') || '[]')
      .filter((f: any) => f.followingId === channel.userId);
    
    const following = JSON.parse(localStorage.getItem('nexura_follows') || '[]')
      .filter((f: any) => f.followerId === channel.userId);

    const streams = JSON.parse(localStorage.getItem('nexura_streams') || '[]')
      .filter((s: any) => s.channelId === channelId);

    const videos = JSON.parse(localStorage.getItem('nexura_videos') || '[]')
      .filter((v: any) => v.channelId === channelId && v.status === 'READY');

    const clips = JSON.parse(localStorage.getItem('nexura_clips') || '[]')
      .filter((c: any) => c.channelId === channelId && c.status === 'READY');

    const totalViews = videos.reduce((sum: number, v: any) => sum + (v.views || 0), 0) +
                       clips.reduce((sum: number, c: any) => sum + (c.views || 0), 0);

    const totalStreamHours = streams.reduce((sum: number, s: any) => {
      if (s.startedAt && s.endedAt) {
        const duration = (new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000 / 3600;
        return sum + duration;
      }
      return sum;
    }, 0);

    const currentStream = streams.find((s: any) => s.status === 'LIVE');

    return {
      totalFollowers: followers.length,
      totalFollowing: following.length,
      totalViews,
      totalStreamHours: Math.round(totalStreamHours * 10) / 10,
      totalVideos: videos.length,
      totalClips: clips.length,
      recentActivity: [], // Se llenará con ActivityService
      liveStatus: currentStream ? 'LIVE' : 'OFFLINE',
      currentViewers: currentStream?.viewerCount,
    };
  }

  // Obtener analytics de streams en un período
  static getStreamAnalytics(channelId: string, period: AnalyticsPeriod['period']): AnalyticsPeriod {
    const { startDate, endDate } = this.getPeriodDates(period);
    
    const streams = JSON.parse(localStorage.getItem('nexura_streams') || '[]')
      .filter((s: any) => {
        if (s.channelId !== channelId) return false;
        if (!s.endedAt) return false;
        const streamDate = new Date(s.endedAt);
        return streamDate >= startDate && streamDate <= endDate;
      });

    const streamAnalytics: StreamAnalytics[] = streams.map((s: any) => {
      const duration = s.startedAt && s.endedAt 
        ? (new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000
        : 0;

      return {
        streamId: s.id,
        channelId: s.channelId,
        title: s.title || 'Stream sin título',
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        duration,
        peakViewers: s.peakViewerCount || 0,
        averageViewers: Math.round((s.viewerCount || 0) * 0.7), // Estimación
        uniqueViewers: s.peakViewerCount || 0,
        newFollowers: 0, // Se calcularía con ActivityService
        chatMessages: 0, // Se calcularía con ChatService
        status: s.status,
      };
    });

    const totalStreamHours = streamAnalytics.reduce((sum, s) => sum + s.duration, 0) / 3600;
    const newFollowers = streamAnalytics.reduce((sum, s) => sum + s.newFollowers, 0);

    return {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      streams: streamAnalytics,
      videos: [],
      clips: [],
      totalViews: 0,
      totalStreamHours: Math.round(totalStreamHours * 10) / 10,
      newFollowers,
    };
  }

  // Obtener analytics de videos
  static getVideoAnalytics(channelId: string, period: AnalyticsPeriod['period']): VideoAnalytics[] {
    const { startDate, endDate } = this.getPeriodDates(period);
    
    const videos = JSON.parse(localStorage.getItem('nexura_videos') || '[]')
      .filter((v: any) => {
        if (v.channelId !== channelId) return false;
        if (v.status !== 'READY') return false;
        const videoDate = new Date(v.publishedAt || v.createdAt);
        return videoDate >= startDate && videoDate <= endDate;
      });

    return videos.map((v: any) => ({
      videoId: v.id,
      channelId: v.channelId,
      title: v.title,
      views: v.views || 0,
      duration: v.duration || 0,
      averageWatchTime: Math.round((v.duration || 0) * 0.6), // Estimación
      completionRate: 60, // Estimación
      publishedAt: v.publishedAt || v.createdAt,
    }));
  }

  // Obtener analytics de clips
  static getClipAnalytics(channelId: string, period: AnalyticsPeriod['period']): ClipAnalytics[] {
    const { startDate, endDate } = this.getPeriodDates(period);
    
    const clips = JSON.parse(localStorage.getItem('nexura_clips') || '[]')
      .filter((c: any) => {
        if (c.channelId !== channelId) return false;
        if (c.status !== 'READY') return false;
        const clipDate = new Date(c.createdAt);
        return clipDate >= startDate && clipDate <= endDate;
      });

    return clips.map((c: any) => ({
      clipId: c.id,
      channelId: c.channelId,
      title: c.title,
      views: c.views || 0,
      shares: 0, // No implementado aún
      duration: c.duration || 0,
      createdAt: c.createdAt,
    }));
  }

  // Obtener analytics completo para un período
  static getFullAnalytics(channelId: string, period: AnalyticsPeriod['period']): AnalyticsPeriod {
    const streamAnalytics = this.getStreamAnalytics(channelId, period);
    const videoAnalytics = this.getVideoAnalytics(channelId, period);
    const clipAnalytics = this.getClipAnalytics(channelId, period);

    const totalViews = videoAnalytics.reduce((sum, v) => sum + v.views, 0) +
                       clipAnalytics.reduce((sum, c) => sum + c.views, 0);

    return {
      ...streamAnalytics,
      videos: videoAnalytics,
      clips: clipAnalytics,
      totalViews,
    };
  }

  // Obtener el stream más reciente
  static getLatestStream(channelId: string): StreamAnalytics | null {
    const streams = JSON.parse(localStorage.getItem('nexura_streams') || '[]')
      .filter((s: any) => s.channelId === channelId && s.endedAt)
      .sort((a: any, b: any) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime());

    if (streams.length === 0) return null;

    const s = streams[0];
    const duration = s.startedAt && s.endedAt 
      ? (new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000
      : 0;

    return {
      streamId: s.id,
      channelId: s.channelId,
      title: s.title || 'Stream sin título',
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      duration,
      peakViewers: s.peakViewerCount || 0,
      averageViewers: Math.round((s.viewerCount || 0) * 0.7),
      uniqueViewers: s.peakViewerCount || 0,
      newFollowers: 0,
      chatMessages: 0,
      status: s.status,
    };
  }

  // Helper para obtener fechas de un período
  private static getPeriodDates(period: AnalyticsPeriod['period']): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case '7days':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(startDate.getDate() - 90);
        break;
    }

    return { startDate, endDate };
  }
}
