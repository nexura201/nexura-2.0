import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, Trash2, Radio, UserPlus, Video, Scissors } from 'lucide-react';
import { NotificationService } from '../services/notification.service';
import { useAuth } from '../context/AuthContext';
import type { Notification } from '../types';

export function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user, filter]);

  const loadNotifications = () => {
    if (!user) return;
    
    let notifs = NotificationService.getUserNotifications(user.id);
    if (filter === 'unread') {
      notifs = notifs.filter(n => !n.read);
    }
    setNotifications(notifs);
  };

  const handleMarkAsRead = (notificationId: string) => {
    NotificationService.markAsRead(notificationId);
    loadNotifications();
  };

  const handleMarkAllAsRead = () => {
    if (!user) return;
    NotificationService.markAllAsRead(user.id);
    loadNotifications();
  };

  const handleDelete = (notificationId: string) => {
    NotificationService.deleteNotification(notificationId);
    loadNotifications();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'STREAM_STARTED':
        return <Radio className="w-5 h-5 text-danger" />;
      case 'NEW_FOLLOWER':
        return <UserPlus className="w-5 h-5 text-success" />;
      case 'VIDEO_READY':
        return <Video className="w-5 h-5 text-primary-light" />;
      case 'CLIP_READY':
        return <Scissors className="w-5 h-5 text-warning" />;
      default:
        return <Bell className="w-5 h-5 text-text-muted" />;
    }
  };

  const getNotificationLink = (notification: Notification): string => {
    switch (notification.type) {
      case 'STREAM_STARTED':
        return notification.data?.channelId ? `/channel/${notification.data.channelId}` : '/';
      case 'VIDEO_READY':
        return '/dashboard/videos';
      case 'CLIP_READY':
        return '/dashboard/clips';
      default:
        return '/notifications';
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <Bell className="w-16 h-16 text-text-muted mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Inicia sesión</h1>
        <p className="text-text-secondary">Inicia sesión para ver tus notificaciones.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Notificaciones</h1>
        {notifications.some(n => !n.read) && (
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2 text-sm text-primary-light hover:text-primary"
          >
            <Check className="w-4 h-4" />
            Marcar todas como leídas
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-primary text-white'
              : 'bg-bg-elevated text-text-secondary hover:text-white'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'unread'
              ? 'bg-primary text-white'
              : 'bg-bg-elevated text-text-secondary hover:text-white'
          }`}
        >
          No leídas
        </button>
      </div>

      {/* Lista de notificaciones */}
      {notifications.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
          <Bell className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            {filter === 'unread' ? 'No tienes notificaciones sin leer' : 'No tienes notificaciones'}
          </h2>
          <p className="text-text-secondary">
            {filter === 'unread'
              ? 'Todas tus notificaciones están al día.'
              : 'Cuando recibas notificaciones, aparecerán aquí.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`bg-bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all ${
                !notification.read ? 'border-l-4 border-l-primary' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <Link
                    to={getNotificationLink(notification)}
                    className="block"
                  >
                    <p className="font-medium text-white hover:text-primary-light transition-colors">
                      {notification.title}
                    </p>
                    <p className="text-sm text-text-secondary mt-1">{notification.body}</p>
                    <p className="text-xs text-text-muted mt-2">
                      {new Date(notification.createdAt).toLocaleString('es', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </Link>
                </div>

                <div className="flex items-center gap-2">
                  {!notification.read && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="p-2 text-text-muted hover:text-primary-light transition-colors"
                      title="Marcar como leída"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notification.id)}
                    className="p-2 text-text-muted hover:text-danger transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
