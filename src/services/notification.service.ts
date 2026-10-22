import { v4 as uuidv4 } from 'uuid';
import type { Notification, NotificationType, NotificationPreferences } from '../types';

const NOTIFICATIONS_KEY = 'nexura_notifications';
const NOTIFICATION_PREFS_KEY = 'nexura_notification_prefs';

/**
 * ETAPA 7E-2 — Canal de eventos para la UI (campana del header, página de
 * Notificaciones). Es solo un pub/sub en memoria: los DATOS persisten en la
 * capa local existente (localStorage vía este servicio). No implica entrega
 * push ni sincronización entre dispositivos.
 */
type NotificationsChangedListener = () => void;
const changedListeners = new Set<NotificationsChangedListener>();

export function onNotificationsChanged(listener: NotificationsChangedListener): () => void {
  changedListeners.add(listener);
  return () => { changedListeners.delete(listener); };
}

function emitNotificationsChanged(): void {
  // Un error en un listener de UI no debe romper la operación de datos.
  changedListeners.forEach(l => { try { l(); } catch { /* ignore */ } });
}

/** Clave estable para notificaciones generadas por el sistema local (evita duplicados). */
const DEDUPE_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

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
    emitNotificationsChanged();

    return notification;
  }

  /**
   * Versión idempotente para eventos del sistema local (upload, edición, etc.).
   * Si ya existe una notificación sin leer con la misma `dedupeKey` en las
   * últimas 24 h, NO se duplica: se actualiza su contenido y marca de demo.
   */
  static createLocalEventNotification(params: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    dedupeKey: string;
    data?: Record<string, unknown>;
  }): Notification | null {
    try {
      const notifications = this.getNotifications();
      const now = Date.now();
      const existing = notifications.find(n =>
        n.userId === params.userId &&
        !n.read &&
        n.data?.dedupeKey === params.dedupeKey &&
        now - new Date(n.createdAt).getTime() < DEDUPE_TTL_MS
      );

      if (existing) {
        existing.title = params.title;
        existing.body = params.body;
        existing.data = { ...(existing.data ?? {}), ...(params.data ?? {}), dedupeKey: params.dedupeKey };
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
        emitNotificationsChanged();
        return existing;
      }

      return this.createNotification(params.userId, params.type, params.title, params.body, {
        ...(params.data ?? {}),
        dedupeKey: params.dedupeKey,
        local: true,
      });
    } catch {
      // Fallo de almacenamiento local: no rompe la operación que lo invoca.
      return null;
    }
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
    emitNotificationsChanged();
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
    emitNotificationsChanged();
  }

  // Eliminar una notificación
  static deleteNotification(notificationId: string): boolean {
    const notifications = this.getNotifications();
    const filtered = notifications.filter(n => n.id !== notificationId);
    
    if (filtered.length === notifications.length) return false;
    
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(filtered));
    emitNotificationsChanged();
    return true;
  }

  // Eliminar todas las notificaciones de un usuario
  static clearAllNotifications(userId: string): void {
    const notifications = this.getNotifications();
    const filtered = notifications.filter(n => n.userId !== userId);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(filtered));
    emitNotificationsChanged();
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
