import { v4 as uuidv4 } from 'uuid';
import type { Notification, NotificationType, NotificationPreferences } from '../types';

const NOTIFICATIONS_KEY = 'nexura_notifications';
const NOTIFICATION_PREFS_KEY = 'nexura_notification_prefs';

export class NotificationService {
  // Crear una nueva notificación
  static createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: any
  ): Notification {
    const notifications = this.getNotifications();
    
    const notification: Notification = {
      id: uuidv4(),
      userId,
      type,
      title,
      body,
      data,
      read: false,
      createdAt: new Date().toISOString(),
    };

    notifications.unshift(notification);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));

    return notification;
  }

  // Obtener todas las notificaciones de un usuario
  static getUserNotifications(userId: string): Notification[] {
    const notifications = this.getNotifications();
    return notifications.filter(n => n.userId === userId);
  }

  // Obtener notificaciones no leídas
  static getUnreadNotifications(userId: string): Notification[] {
    const notifications = this.getUserNotifications(userId);
    return notifications.filter(n => !n.read);
  }

  // Contar notificaciones no leídas
  static getUnreadCount(userId: string): number {
    return this.getUnreadNotifications(userId).length;
  }

  // Marcar una notificación como leída
  static markAsRead(notificationId: string): boolean {
    const notifications = this.getNotifications();
    const index = notifications.findIndex(n => n.id === notificationId);
    
    if (index === -1) return false;

    notifications[index].read = true;
    notifications[index].readAt = new Date().toISOString();
    
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    return true;
  }

  // Marcar todas las notificaciones como leídas
  static markAllAsRead(userId: string): void {
    const notifications = this.getNotifications();
    const now = new Date().toISOString();
    
    notifications.forEach(n => {
      if (n.userId === userId && !n.read) {
        n.read = true;
        n.readAt = now;
      }
    });

    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  }

  // Eliminar una notificación
  static deleteNotification(notificationId: string): boolean {
    const notifications = this.getNotifications();
    const filtered = notifications.filter(n => n.id !== notificationId);
    
    if (filtered.length === notifications.length) return false;
    
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(filtered));
    return true;
  }

  // Eliminar todas las notificaciones de un usuario
  static clearAllNotifications(userId: string): void {
    const notifications = this.getNotifications();
    const filtered = notifications.filter(n => n.userId !== userId);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(filtered));
  }

  // Notificaciones específicas
  static notifyStreamStarted(channelId: string, channelName: string, followerIds: string[]): void {
    followerIds.forEach(followerId => {
      const prefs = this.getNotificationPreferences(followerId);
      if (prefs.streamStarted) {
        this.createNotification(
          followerId,
          'STREAM_STARTED',
          `${channelName} está en vivo`,
          `${channelName} ha iniciado una transmisión en vivo`,
          { channelId }
        );
      }
    });
  }

  static notifyNewFollower(channelOwnerId: string, followerName: string): void {
    const prefs = this.getNotificationPreferences(channelOwnerId);
    if (prefs.newFollower) {
      this.createNotification(
        channelOwnerId,
        'NEW_FOLLOWER',
        'Nuevo seguidor',
        `${followerName} ha comenzado a seguir tu canal`,
        { followerName }
      );
    }
  }

  static notifyVideoReady(channelId: string, videoTitle: string): void {
    const channel = JSON.parse(localStorage.getItem('nexura_channels') || '[]')
      .find((c: any) => c.id === channelId);
    
    if (channel) {
      const prefs = this.getNotificationPreferences(channel.userId);
      if (prefs.videoReady) {
        this.createNotification(
          channel.userId,
          'VIDEO_READY',
          'Video procesado',
          `Tu video "${videoTitle}" está listo para ser publicado`,
          { channelId, videoTitle }
        );
      }
    }
  }

  static notifyClipReady(channelId: string, clipTitle: string): void {
    const channel = JSON.parse(localStorage.getItem('nexura_channels') || '[]')
      .find((c: any) => c.id === channelId);
    
    if (channel) {
      const prefs = this.getNotificationPreferences(channel.userId);
      if (prefs.clipReady) {
        this.createNotification(
          channel.userId,
          'CLIP_READY',
          'Clip creado',
          `Tu clip "${clipTitle}" está listo`,
          { channelId, clipTitle }
        );
      }
    }
  }

  // Preferencias de notificaciones
  static getNotificationPreferences(userId: string): NotificationPreferences {
    const prefs = localStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (prefs) {
      const allPrefs = JSON.parse(prefs);
      const userPrefs = allPrefs.find((p: NotificationPreferences) => p.userId === userId);
      if (userPrefs) return userPrefs;
    }

    // Preferencias por defecto
    return {
      userId,
      streamStarted: true,
      newFollower: true,
      videoReady: true,
      clipReady: true,
      mention: true,
      moderation: true,
      system: true,
      emailNotifications: false,
      updatedAt: new Date().toISOString(),
    };
  }

  static updateNotificationPreferences(userId: string, preferences: Partial<NotificationPreferences>): void {
    const prefs = localStorage.getItem(NOTIFICATION_PREFS_KEY);
    let allPrefs: NotificationPreferences[] = prefs ? JSON.parse(prefs) : [];
    
    const index = allPrefs.findIndex(p => p.userId === userId);
    const currentPrefs = index !== -1 ? allPrefs[index] : this.getNotificationPreferences(userId);
    
    const updatedPrefs: NotificationPreferences = {
      ...currentPrefs,
      ...preferences,
      userId,
      updatedAt: new Date().toISOString(),
    };

    if (index !== -1) {
      allPrefs[index] = updatedPrefs;
    } else {
      allPrefs.push(updatedPrefs);
    }

    localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(allPrefs));
  }

  // Helper para obtener todas las notificaciones
  private static getNotifications(): Notification[] {
    const notifications = localStorage.getItem(NOTIFICATIONS_KEY);
    return notifications ? JSON.parse(notifications) : [];
  }
}
