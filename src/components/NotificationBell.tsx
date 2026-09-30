import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { NotificationService } from '../services/notification.service';
import { useAuth } from '../context/AuthContext';

export function NotificationBell() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (user) {
      const count = NotificationService.getUnreadCount(user.id);
      setUnreadCount(count);

      // Actualizar cada 5 segundos
      const interval = setInterval(() => {
        const newCount = NotificationService.getUnreadCount(user.id);
        setUnreadCount(newCount);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [user]);

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-text-secondary hover:text-white transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-danger text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-bg-card border border-border rounded-lg shadow-xl z-50">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Notificaciones</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => {
                    NotificationService.markAllAsRead(user.id);
                    setUnreadCount(0);
                  }}
                  className="text-xs text-primary-light hover:text-primary"
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {NotificationService.getUserNotifications(user.id).slice(0, 10).map(notification => (
              <div
                key={notification.id}
                className={`p-4 border-b border-border hover:bg-bg-elevated transition-colors ${
                  !notification.read ? 'bg-primary/5' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    !notification.read ? 'bg-primary' : 'bg-transparent'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{notification.title}</p>
                    <p className="text-xs text-text-secondary mt-1">{notification.body}</p>
                    <p className="text-xs text-text-muted mt-2">
                      {new Date(notification.createdAt).toLocaleDateString('es')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-border">
            <Link
              to="/notifications"
              onClick={() => setShowDropdown(false)}
              className="block text-center text-sm text-primary-light hover:text-primary"
            >
              Ver todas las notificaciones
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
