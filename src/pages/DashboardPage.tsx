import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Eye, Clock, Video, Scissors, Radio, Film, UploadCloud,
  BarChart3, CalendarDays, Bell, Settings2, Library, Activity,
  ChevronRight, Clapperboard, ArrowUpCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AnalyticsService } from '../services/analytics.service';
import { ActivityService } from '../services/activity.service';
import * as contentService from '../services/content';
import type { UnifiedContentItem, ContentKind } from '../services/content';
import { isDemoMode } from '../config/demoMode';
import { ContentStateChip } from '../components/ContentStateChip';
import { DemoBadge } from '../components/DemoBadge';
import * as categoryService from '../services/category';
import * as db from '../services/database';
import type { DashboardStats, ChannelActivity } from '../types';

/**
 * ETAPA 7C — CREATOR STUDIO (/dashboard)
 *
 * El Dashboard del creador se convierte en el centro claro para administrar y
 * crear contenido, REUTILIZANDO toda la arquitectura existente de NEXURA:
 *  - Contenido reciente → services/content.ts (capa unificada de Etapa 6).
 *    Nada se lee crudo de localStorage desde esta página.
 *  - Estado del canal / seguidores → AnalyticsService.getDashboardStats + db.
 *  - Subida → /dashboard/upload (Etapa 7A/7B) con ?type= (reel|vod|clip).
 *  - Biblioteca → /library (ruta REAL existente; no se creó otra).
 *  - Accesos a secciones ya implementadas (Stream, Analytics, Notificaciones,
 *    Configuración). No se inventa funcionalidad nueva en esta etapa.
 *
 * NO se muestran métricas financieras. Todos los números provienen de datos
 * reales del almacenamiento local/demo actual. Funciona igual con
 * DEMO_MODE ON y OFF (la marca DEMO solo aparece junto a datos demo_*).
 */

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ChannelActivity[]>([]);
  const [contentItems, setContentItems] = useState<UnifiedContentItem[]>([]);
  const [channelTitle, setChannelTitle] = useState<string | null>(null);
  const [channelCategory, setChannelCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    if (!user) return;

    const channel = db.getChannelByUserId(user.id);
    if (!channel) {
      setLoading(false);
      return;
    }

    // Estadísticas del canal (servicio existente; derivadas de datos locales reales)
    setStats(AnalyticsService.getDashboardStats(channel.id));

    // Actividad reciente (servicio existente)
    setActivities(ActivityService.getChannelActivities(channel.id, 5));

    // Contenido propio unificado — ÚNICA fuente: services/content.ts (Etapa 6).
    // Incluye lo creado vía Upload en la Etapa 7A/7B.
    setContentItems(contentService.getCreatorContent(user.id));

    setChannelTitle(channel.title);
    categoryService.ensureDefaultCategories();
    const cat = channel.categoryId ? categoryService.getCategoryById(channel.categoryId) : null;
    setChannelCategory(cat?.name ?? null);

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-bg-elevated rounded w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-bg-elevated rounded-xl" />
            ))}
          </div>
          <div className="h-96 bg-bg-elevated rounded-xl" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">No tienes un canal</h1>
        <p className="text-text-secondary">Crea un canal para comenzar a transmitir.</p>
      </div>
    );
  }

  // Conteo real por tipo desde la capa unificada (sin cifras inventadas)
  const countByKind = (kind: ContentKind) => contentItems.filter(i => i.kind === kind).length;
  const recentContent = contentItems.slice(0, 6);
  const demoActive = isDemoMode();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* ===== Header / saludo del creador ===== */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-white">Creator Studio</h1>
            {demoActive && <DemoBadge />}
          </div>
          <p className="text-text-secondary mt-1">
            Hola, {user?.displayName}{channelTitle ? ` · ${channelTitle}` : ''}
          </p>
        </div>
        {/* Indicador LIVE/OFFLINE (solo si la arquitectura lo provee) */}
        <div
          className={`flex items-center gap-2 rounded-lg px-4 py-2 border ${
            stats.liveStatus === 'LIVE'
              ? 'bg-danger/10 border-danger/20'
              : 'bg-bg-card border-border'
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              stats.liveStatus === 'LIVE' ? 'bg-danger animate-pulse' : 'bg-text-muted'
            }`}
          />
          <span className={`font-medium text-sm ${stats.liveStatus === 'LIVE' ? 'text-danger' : 'text-text-secondary'}`}>
            {stats.liveStatus === 'LIVE' ? 'EN VIVO' : 'OFFLINE'}
          </span>
          {stats.liveStatus === 'LIVE' && typeof stats.currentViewers === 'number' && (
            <span className="text-text-secondary text-sm">{stats.currentViewers} espectadores</span>
          )}
        </div>
      </div>

      {/* ===== Estado general del canal ===== */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-3">
          Estado del canal
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Seguidores" value={stats.totalFollowers} color="text-primary-light" bgColor="bg-primary/10" />
          <StatCard icon={Eye} label="Visualizaciones" value={stats.totalViews} color="text-success" bgColor="bg-success/10" />
          <StatCard icon={Clock} label="Horas transmitidas" value={stats.totalStreamHours} color="text-warning" bgColor="bg-warning/10" />
          <StatCard icon={Library} label="Contenidos" value={contentItems.length} color="text-primary-light" bgColor="bg-primary/10" />
        </div>
        {/* Datos del canal que existen (nombre/categoría): sin cifras falsas */}
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-text-secondary">
          {channelTitle && (
            <span>
              Canal: <span className="text-white font-medium">{channelTitle}</span>
            </span>
          )}
          {channelCategory && (
            <span>
              Categoría: <span className="text-white font-medium">{channelCategory}</span>
            </span>
          )}
          <span>
            Reels: <span className="text-white font-medium tabular-nums">{countByKind('reel')}</span>
            {' · '}VOD: <span className="text-white font-medium tabular-nums">{countByKind('video')}</span>
            {' · '}Clips: <span className="text-white font-medium tabular-nums">{countByKind('clip')}</span>
          </span>
        </div>
      </section>

      {/* ===== Crear contenido ===== */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Crear contenido</h2>
          <Link to="/dashboard/upload" className="text-sm text-primary-light hover:text-primary inline-flex items-center gap-1">
            Ir al uploader <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction
            to="/dashboard/upload"
            icon={UploadCloud}
            iconColor="text-primary-light"
            title="Subir contenido"
            hint="Reel, VOD o Clip desde tu PC"
          />
          <QuickAction
            to="/dashboard/upload?type=reel"
            icon={Film}
            iconColor="text-primary-light"
            title="Crear Reel"
            hint="Vertical corto (9:16)"
          />
          <QuickAction
            to="/dashboard/upload?type=vod"
            icon={Video}
            iconColor="text-success"
            title="Subir video / VOD"
            hint="Video completo"
          />
          <QuickAction
            to="/dashboard/upload?type=clip"
            icon={Scissors}
            iconColor="text-warning"
            title="Crear Clip"
            hint="Fragmento corto"
          />
        </div>
      </section>

      {/* ===== Contenido reciente (capa unificada content.ts) ===== */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Contenido reciente</h2>
          <Link to="/library" className="text-sm text-primary-light hover:text-primary inline-flex items-center gap-1">
            Ver Biblioteca <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {recentContent.length === 0 ? (
          <div className="bg-bg-card border border-border rounded-xl p-10 text-center">
            <Clapperboard className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary font-medium">Todavía no tienes contenido</p>
            <p className="text-text-muted text-sm mt-1 max-w-md mx-auto">
              Sube tu primer Reel, VOD o Clip y aparecerá aquí automáticamente.
            </p>
            <Link
              to="/dashboard/upload"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium"
            >
              <ArrowUpCircle className="w-4 h-4" /> Subir contenido
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentContent.map(item => (
              <RecentContentCard key={`${item.kind}:${item.id}`} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* ===== Accesos del Creator Studio (rutas existentes) ===== */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-3">
          Accesos del Creator Studio
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <AccessLink to="/dashboard/upload" icon={UploadCloud} label="Crear contenido" />
          <AccessLink to="/library" icon={Library} label="Biblioteca" />
          <AccessLink to="/dashboard/stream" icon={Radio} label="Configuración de stream" />
          <AccessLink to="/dashboard/analytics" icon={BarChart3} label="Analytics" />
          <AccessLink to="/notifications" icon={Bell} label="Notificaciones" />
          <AccessLink to="/settings" icon={Settings2} label="Configuración" />
        </div>
        <p className="text-xs text-text-muted mt-2">
          Calendario / programación estará disponible cuando se implemente esa sección
          (no hay ruta propia todavía — no se muestra un acceso falso).
        </p>
      </section>

      {/* ===== Resumen básico de actividad ===== */}
      <section className="bg-bg-card border border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary-light" />
          Actividad reciente
        </h2>

        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary">No hay actividad reciente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map(activity => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 bg-bg-elevated rounded-lg"
              >
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{activity.title}</p>
                  <p className="text-xs text-text-secondary mt-1">{activity.description}</p>
                  <p className="text-xs text-text-muted mt-2">
                    {new Date(activity.createdAt).toLocaleString('es', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ============ SUBCOMPONENTES ============

function StatCard({ icon: Icon, label, value, color, bgColor }: {
  icon: any;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-6">
      <div className={`w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center mb-4`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <p className="text-3xl font-bold text-white tabular-nums">{value}</p>
      <p className="text-sm text-text-muted mt-1">{label}</p>
    </div>
  );
}

function QuickAction({ to, icon: Icon, iconColor, title, hint }: {
  to: string;
  icon: any;
  iconColor: string;
  title: string;
  hint: string;
}) {
  return (
    <Link
      to={to}
      className="bg-bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all group"
    >
      <Icon className={`w-7 h-7 ${iconColor} mb-3 group-hover:scale-110 transition-transform`} />
      <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
      <p className="text-xs text-text-muted">{hint}</p>
    </Link>
  );
}

function AccessLink({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-2 bg-bg-card border border-border rounded-xl px-3 py-4 text-center hover:border-primary/30 hover:text-white text-text-secondary transition-colors"
    >
      <Icon className="w-5 h-5 text-primary-light" />
      <span className="text-xs font-medium leading-tight">{label}</span>
    </Link>
  );
}

function RecentContentCard({ item }: { item: UnifiedContentItem }) {
  const path = contentService.getContentPath(item);
  const KindIcon = item.kind === 'reel' ? Film : item.kind === 'clip' ? Scissors : Video;
  return (
    <Link
      to={path}
      className="bg-bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors block"
    >
      <div className="relative aspect-video bg-bg-elevated">
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-text-muted">
            <KindIcon className="w-8 h-8" />
          </span>
        )}
        <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-bold uppercase tracking-wide text-white">
          {contentService.getKindLabel(item.kind)}
        </span>
        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-[11px] text-white tabular-nums">
          {contentService.formatContentDuration(item.duration)}
        </span>
        {item.isDemo && (
          <span className="absolute top-2 right-2">
            <DemoBadge />
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-white truncate">{item.title}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <ContentStateChip state={item.state} />
          <span className="text-xs text-text-muted">
            {new Date(item.updatedAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
          </span>
          {item.visibility && (
            <span className="text-[10px] text-text-muted uppercase tracking-wide ml-auto">
              {item.visibility}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'STREAM_STARTED':
      return <Radio className="w-5 h-5 text-danger" />;
    case 'STREAM_ENDED':
      return <Radio className="w-5 h-5 text-text-muted" />;
    case 'VIDEO_PUBLISHED':
      return <Video className="w-5 h-5 text-primary-light" />;
    case 'CLIP_CREATED':
      return <Scissors className="w-5 h-5 text-warning" />;
    case 'NEW_FOLLOWER':
      return <Users className="w-5 h-5 text-success" />;
    case 'FOLLOWER_LEFT':
      return <Users className="w-5 h-5 text-text-muted" />;
    default:
      return <CalendarDays className="w-5 h-5 text-text-muted" />;
  }
}
