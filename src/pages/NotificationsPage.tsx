import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, Check, Trash2, Radio, UserPlus, Video, Scissors, AtSign, ShieldCheck,
  Settings2, UploadCloud, AlertTriangle, RefreshCw, ArrowLeft, Film, Eraser,
} from 'lucide-react';
import { NotificationService, onNotificationsChanged } from '../services/notification.service';
import { useAuth } from '../context/AuthContext';
import { isDemoMode } from '../config/demoMode';
import { resetDemoData } from '../services/demoData';
import { DemoBadge } from '../components/DemoBadge';
import type { Notification, NotificationPreferences, NotificationType } from '../types';

/**
 * ETAPA 7E-2 — CENTRO DE NOTIFICACIONES DEL CREADOR (/notifications)
 *
 * Reutiliza la arquitectura existente SIN crear una segunda capa:
 *  - Datos: NotificationService (localStorage `nexura_notifications`, metadatos
 *    pequeños; nunca blobs multimedia).
 *  - DEMO_MODE: las notificaciones demo las siembra demoData.ts (idempotente,
 *    ya existía); el reset usa resetDemoData() que solo toca entidades demo_* y
 *    respeta el contenido creado por el usuario.
 *  - Preferencias: NotificationService.get/updateNotificationPreferences
 *    (configuración LOCAL/DEMO — no hay push, SMTP ni backend todavía).
 *  - Honestidad: se indica explícitamente que son notificaciones locales/demo,
 *    sin entrega push ni sincronización entre dispositivos.
 *
 * Estados UI: loading / éxito / vacío / error recuperable (sin spinner infinito).
 */

type StatusFilter = 'all' | 'unread';
type CategoryFilter = 'all' | 'streaming' | 'content' | 'followers' | 'system';

const TYPE_META: Record<string, { icon: React.ReactNode; label: string; category: Exclude<CategoryFilter, 'all'> }> = {
  STREAM_STARTED: { icon: <Radio className="w-5 h-5 text-danger" />, label: 'Streaming', category: 'streaming' },
  NEW_FOLLOWER: { icon: <UserPlus className="w-5 h-5 text-success" />, label: 'Seguidores', category: 'followers' },
  VIDEO_READY: { icon: <Video className="w-5 h-5 text-primary-light" />, label: 'Contenido', category: 'content' },
  CLIP_READY: { icon: <Scissors className="w-5 h-5 text-warning" />, label: 'Contenido', category: 'content' },
  MENTION: { icon: <AtSign className="w-5 h-5 text-primary-light" />, label: 'Actividad', category: 'streaming' },
  MODERATION: { icon: <ShieldCheck className="w-5 h-5 text-danger" />, label: 'Sistema', category: 'system' },
  SYSTEM: { icon: <Settings2 className="w-5 h-5 text-text-muted" />, label: 'Sistema', category: 'system' },
  ACCOUNT: { icon: <Bell className="w-5 h-5 text-text-muted" />, label: 'Sistema', category: 'system' },
};

function metaFor(type: NotificationType) {
  return TYPE_META[type] ?? { icon: <Bell className="w-5 h-5 text-text-muted" />, label: 'Sistema', category: 'system' as const };
}

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `hace ${days} d`;
    return new Date(iso).toLocaleDateString('es');
  } catch {
    return '';
  }
}

export function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPrefs, setShowPrefs] = useState(false);

  const reload = useCallback(() => {
    if (!user) { setLoading(false); return; }
    try {
      setError(null);
      setNotifications(NotificationService.getUserNotifications(user.id));
    } catch (err: any) {
      setError(err?.message ?? 'No se pudieron cargar las notificaciones locales.');
    } finally {
      setLoading(false); // en todos los caminos: nunca spinner infinito
    }
  }, [user]);

  useEffect(() => {
    reload();
    // Sincronización instantánea con campana/guardado de eventos locales.
    const unsubscribe = onNotificationsChanged(reload);
    return unsubscribe;
  }, [reload]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const demoActive = isDemoMode();

  const visible = notifications
    .filter(n => (statusFilter === 'unread' ? !n.read : true))
    .filter(n => (categoryFilter === 'all' ? true : metaFor(n.type).category === categoryFilter));

  // ---- Acciones (§3) ----
  const handleMarkAsRead = (id: string) => {
    try {
      NotificationService.markAsRead(id);
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo marcar la notificación como leída.');
    }
    reload();
  };

  const handleMarkAllAsRead = () => {
    if (!user) return;
    try {
      NotificationService.markAllAsRead(user.id);
    } catch (err: any) {
      setError(err?.message ?? 'No se pudieron marcar todas como leídas.');
    }
    reload();
  };

  const handleDelete = (id: string) => {
    try {
      NotificationService.deleteNotification(id);
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo eliminar la notificación.');
    }
    if (selectedId === id) setSelectedId(null);
    reload();
  };

  const handleResetDemo = () => {
    try {
      resetDemoData(); // solo elimina entidades demo_* y re-siembra; respeta contenido del usuario
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo restablecer los datos demo.');
    }
    reload();
  };

  const openNotification = (n: Notification) => {
    setSelectedId(prev => (prev === n.id ? null : n.id));
    if (!n.read) handleMarkAsRead(n.id);
  };

  const linkFor = (n: Notification): string | null => {
    switch (n.type) {
      case 'STREAM_STARTED':
        return n.data?.channelId ? `/channel/${n.data.channelId}` : null;
      case 'VIDEO_READY':
        return '/dashboard/videos';
      case 'CLIP_READY':
        return '/dashboard/clips';
      default:
        return null;
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
      {/* Volver a Creator Studio */}
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-white mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Volver a Creator Studio
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Notificaciones</h1>
            {demoActive && <DemoBadge />}
          </div>
          <p className="text-text-secondary text-sm mt-1">
            Notificaciones locales/demo de este navegador.{' '}
            <span className="text-text-muted">
              Todavía no hay notificaciones push, correo real ni sincronización entre dispositivos: eso llegará con el backend.
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-secondary">
            {unreadCount > 0 ? (
              <><strong className="text-white">{unreadCount}</strong> sin leer</>
            ) : (
              'Todo leído'
            )}
          </span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 text-sm text-primary-light hover:text-primary"
            >
              <Check className="w-4 h-4" />
              Marcar todas como leídas
            </button>
          )}
        </div>
      </div>

      {/* Filtros (§2: estado + categoría/tipo) */}
      <div className="flex flex-wrap gap-2 mt-6 mb-2">
        {(['all', 'unread'] as StatusFilter[]).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s ? 'bg-primary text-white' : 'bg-bg-elevated text-text-secondary hover:text-white'
            }`}
          >
            {s === 'all' ? 'Todas' : 'No leídas'}
          </button>
        ))}
        <span className="hidden sm:block w-px bg-border mx-1" aria-hidden />
        {([
          ['all', 'Todo'],
          ['streaming', 'Streaming/Actividad'],
          ['content', 'Contenido'],
          ['followers', 'Seguidores'],
          ['system', 'Sistema'],
        ] as Array<[CategoryFilter, string]>).map(([c, label]) => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              categoryFilter === c ? 'bg-bg-input border border-primary text-white' : 'bg-bg-elevated border border-transparent text-text-secondary hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Error recuperable */}
      {error && (
        <div className="mt-4 bg-danger/10 border border-danger/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-white font-medium">Las notificaciones no se pudieron cargar</p>
            <p className="text-xs text-text-secondary mt-1">{error}</p>
          </div>
          <button onClick={reload} className="flex items-center gap-1.5 text-sm text-primary-light hover:text-white">
            <RefreshCw className="w-4 h-4" /> Reintentar
          </button>
        </div>
      )}

      {/* Loading inicial (breve: lectura local; nunca infinito porque finally fija loading=false) */}
      {loading ? (
        <div className="mt-6 bg-bg-card border border-border rounded-xl p-12 text-center">
          <Bell className="w-10 h-10 text-text-muted mx-auto mb-3 animate-pulse" />
          <p className="text-text-secondary text-sm">Cargando notificaciones…</p>
        </div>
      ) : visible.length === 0 ? (
        /* Estado vacío honesto (§2) */
        <div className="mt-4 bg-bg-card border border-border rounded-xl p-12 text-center">
          <Bell className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            {notifications.length === 0
              ? 'No tienes notificaciones todavía'
              : statusFilter === 'unread'
                ? 'No tienes notificaciones sin leer'
                : 'Ninguna notificación coincide con el filtro'}
          </h2>
          <p className="text-text-secondary text-sm max-w-md mx-auto">
            {notifications.length === 0
              ? demoActive
                ? 'En modo demo puedes "Restablecer datos demo" para ver ejemplos, o subir contenido real desde Creator Studio: cada subida genera su notificación local.'
                : 'Cuando subas contenido o ocurran eventos reales en tu canal, aparecerán aquí (guardadas solo en este dispositivo).'
              : 'Probá cambiar los filtros de arriba.'}
          </p>
          {notifications.length === 0 && (
            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              <Link
                to="/dashboard/upload"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors"
              >
                <UploadCloud className="w-4 h-4" /> Subir contenido
              </Link>
              {demoActive && (
                <button
                  onClick={handleResetDemo}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-elevated hover:bg-bg-input border border-border text-text-secondary hover:text-white text-sm transition-colors"
                >
                  <Eraser className="w-4 h-4" /> Restablecer datos demo
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2 mt-4">
          {visible.map(notification => {
            const meta = metaFor(notification.type);
            const isDemo = notification.data?.demo === true;
            const isSelected = selectedId === notification.id;
            const link = linkFor(notification);
            return (
              <div
                key={notification.id}
                className={`bg-bg-card border border-border rounded-xl p-4 transition-all ${
                  !notification.read ? 'border-l-4 border-l-primary' : ''
                } ${isSelected ? 'ring-1 ring-primary/40' : 'hover:border-primary/30'}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">{meta.icon}</div>

                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => openNotification(notification)}
                      className="block text-left w-full"
                      aria-expanded={isSelected}
                    >
                      <p className="font-medium text-white hover:text-primary-light transition-colors flex items-center gap-2 flex-wrap">
                        {notification.title}
                        {isDemo && <DemoBadge />}
                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-primary inline-block" title="Sin leer" aria-label="Sin leer" />
                        )}
                      </p>
                      <p className="text-sm text-text-secondary mt-1">{notification.body}</p>
                      <p className="text-xs text-text-muted mt-2">
                        {meta.label} · {timeAgo(notification.createdAt)} ·{' '}
                        {new Date(notification.createdAt).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </button>

                    {/* Detalle seleccionado: navegación sin rupturas (§3) */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-3">
                        {link ? (
                          <Link to={link} className="inline-flex items-center gap-1.5 text-sm text-primary-light hover:text-white">
                            <Film className="w-4 h-4" /> Abrir relacionado
                          </Link>
                        ) : (
                          <span className="text-xs text-text-muted">
                            Esta notificación no tiene un destino asociado en esta versión local.
                          </span>
                        )}
                        <Link to="/settings/notifications" className="text-xs text-text-secondary hover:text-white">
                          Preferencias
                        </Link>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
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
            );
          })}
        </div>
      )}

      {/* Preferencias existentes (§5): integración con NotificationService */}
      <section className="mt-8 bg-bg-card border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowPrefs(v => !v)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-bg-elevated transition-colors"
        >
          <div className="flex items-center gap-3">
            <Settings2 className="w-5 h-5 text-text-secondary" />
            <div>
              <p className="text-sm font-medium text-white">Preferencias de notificaciones</p>
              <p className="text-xs text-text-muted">Configuración local/demo · sin push, email ni sincronización aún</p>
            </div>
          </div>
          <span className="text-xs text-text-secondary">{showPrefs ? 'Ocultar' : 'Mostrar'}</span>
        </button>

        {showPrefs && <NotificationPreferencesPanel userId={user.id} />}
      </section>

      {demoActive && notifications.some(n => n.data?.demo === true) && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-bg-elevated border border-border rounded-xl p-4">
          <p className="text-xs text-text-secondary">
            Las entradas marcadas <DemoBadge className="mx-1 align-middle" /> provienen del universo demo (`demo_*`). El resto es generado por tus acciones reales en este dispositivo.
          </p>
          <button
            onClick={handleResetDemo}
            className="inline-flex items-center gap-2 text-xs text-text-secondary hover:text-white transition-colors"
            title="Restablece solo los datos demo; no borra tu contenido creado"
          >
            <Eraser className="w-4 h-4" /> Restablecer datos demo
          </button>
        </div>
      )}
    </div>
  );
}

// ============ PREFERENCIAS (reutilizan NotificationService existente) ============

const PREF_ROWS: Array<{ key: keyof NotificationPreferences; label: string; hint: string; infraNote?: boolean }> = [
  { key: 'streamStarted', label: 'Transmisiones iniciadas', hint: 'Avisos cuando un canal que seguís empieza a transmitir' },
  { key: 'newFollower', label: 'Nuevos seguidores', hint: 'Avisos cuando alguien sigue tu canal' },
  { key: 'videoReady', label: 'Video procesado', hint: 'Recordatorios cuando tu contenido queda listo' },
  { key: 'clipReady', label: 'Clips listos', hint: 'Recordatorios cuando un clip queda listo' },
  { key: 'mention', label: 'Menciones', hint: 'Cuando te mencionan en chat o contenido' },
  { key: 'moderation', label: 'Moderación', hint: 'Acciones de moderación sobre tu canal' },
  { key: 'system', label: 'Sistema', hint: 'Avisos generales de la plataforma' },
  { key: 'emailNotifications', label: 'Correo electrónico', hint: 'Requiere backend de email (aún no disponible)', infraNote: true },
];

function NotificationPreferencesPanel({ userId }: { userId: string }) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => NotificationService.getNotificationPreferences(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setPrefs(NotificationService.getNotificationPreferences(userId));
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'No se pudieron leer las preferencias locales.');
    }
  }, [userId]);

  const toggle = (key: keyof NotificationPreferences) => {
    const next = { ...prefs, [key]: !prefs[key] } as Partial<NotificationPreferences>;
    try {
      NotificationService.updateNotificationPreferences(userId, next);
      setPrefs(NotificationService.getNotificationPreferences(userId));
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo guardar la preferencia (almacenamiento local no disponible).');
    }
  };

  if (error) {
    return (
      <div className="px-4 pb-4">
        <p className="text-xs text-danger">{error}</p>
      </div>
    );
  }

  return (
    <div className="border-t border-border divide-y divide-border">
      {PREF_ROWS.map(row => {
        const enabled = !!prefs[row.key];
        return (
          <div key={row.key} className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="text-sm text-white font-medium">
                {row.label}
                {row.infraNote && (
                  <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-400 bg-amber-500/15 border border-amber-500/30 rounded px-1.5 py-0.5">
                    Solo local/demo
                  </span>
                )}
              </p>
              <p className="text-xs text-text-muted mt-0.5">{row.hint}</p>
            </div>
            <button
              role="switch"
              aria-checked={enabled}
              aria-label={row.label}
              onClick={() => toggle(row.key)}
              className={`relative w-10 h-6 rounded-full flex-shrink-0 transition-colors ${enabled ? 'bg-primary' : 'bg-bg-input border border-border'}`}
            >
              <span
                className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all"
                style={{ left: enabled ? undefined : 4, right: enabled ? 4 : undefined }}
              />
            </button>
          </div>
        );
      })}
      <p className="px-4 pb-4 text-xs text-text-muted">
        Estas preferencias se guardan únicamente en este navegador. La entrega real por push/correo dependerá del backend futuro de NEXURA.
      </p>
    </div>
  );
}
