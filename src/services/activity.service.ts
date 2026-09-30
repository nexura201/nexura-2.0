import { v4 as uuidv4 } from 'uuid';
import type { ChannelActivity, ActivityType } from '../types';

const ACTIVITY_KEY = 'nexura_channel_activity';

export class ActivityService {
  // Registrar una nueva actividad
  static logActivity(
    channelId: string,
    type: ActivityType,
    title: string,
    description: string,
    metadata?: any
  ): ChannelActivity {
    const activities = this.getActivities();
    
    const activity: ChannelActivity = {
      id: uuidv4(),
      channelId,
      type,
      title,
      description,
      metadata,
      createdAt: new Date().toISOString(),
    };

    activities.unshift(activity);
    
    // Mantener solo las últimas 100 actividades
    if (activities.length > 100) {
      activities.splice(100);
    }

    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activities));
    return activity;
  }

  // Obtener actividades de un canal
  static getChannelActivities(channelId: string, limit: number = 20): ChannelActivity[] {
    const activities = this.getActivities();
    return activities
      .filter(a => a.channelId === channelId)
      .slice(0, limit);
  }

  // Obtener actividades recientes de todos los canales seguidos
  static getFollowingActivities(userId: string, limit: number = 20): ChannelActivity[] {
    const follows = JSON.parse(localStorage.getItem('nexura_follows') || '[]')
      .filter((f: any) => f.followerId === userId);
    
    const followedChannelIds = follows.map((f: any) => {
      const channel = JSON.parse(localStorage.getItem('nexura_channels') || '[]')
        .find((c: any) => c.userId === f.followingId);
      return channel?.id;
    }).filter(Boolean);

    const activities = this.getActivities();
    return activities
      .filter(a => followedChannelIds.includes(a.channelId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  // Métodos específicos para diferentes tipos de actividad
  static logStreamStarted(channelId: string, streamTitle: string, streamId: string): void {
    this.logActivity(
      channelId,
      'STREAM_STARTED',
      'Stream iniciado',
      `Se inició el stream: ${streamTitle}`,
      { streamId, streamTitle }
    );
  }

  static logStreamEnded(channelId: string, streamTitle: string, streamId: string, duration: number): void {
    this.logActivity(
      channelId,
      'STREAM_ENDED',
      'Stream finalizado',
      `Stream finalizado: ${streamTitle} (${Math.round(duration / 60)} minutos)`,
      { streamId, streamTitle, duration }
    );
  }

  static logVideoPublished(channelId: string, videoTitle: string, videoId: string): void {
    this.logActivity(
      channelId,
      'VIDEO_PUBLISHED',
      'Video publicado',
      `Nuevo video: ${videoTitle}`,
      { videoId, videoTitle }
    );
  }

  static logClipCreated(channelId: string, clipTitle: string, clipId: string): void {
    this.logActivity(
      channelId,
      'CLIP_CREATED',
      'Clip creado',
      `Nuevo clip: ${clipTitle}`,
      { clipId, clipTitle }
    );
  }

  static logNewFollower(channelId: string, followerName: string, followerId: string): void {
    this.logActivity(
      channelId,
      'NEW_FOLLOWER',
      'Nuevo seguidor',
      `${followerName} comenzó a seguir tu canal`,
      { followerId, followerName }
    );
  }

  static logFollowerLeft(channelId: string, followerName: string, followerId: string): void {
    this.logActivity(
      channelId,
      'FOLLOWER_LEFT',
      'Seguidor dejó de seguir',
      `${followerName} dejó de seguir tu canal`,
      { followerId, followerName }
    );
  }

  // Eliminar actividades de un canal
  static clearChannelActivities(channelId: string): void {
    const activities = this.getActivities();
    const filtered = activities.filter(a => a.channelId !== channelId);
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(filtered));
  }

  // Helper para obtener todas las actividades
  private static getActivities(): ChannelActivity[] {
    const activities = localStorage.getItem(ACTIVITY_KEY);
    return activities ? JSON.parse(activities) : [];
  }
}
