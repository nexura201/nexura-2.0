import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3, Users, Eye, Clock, Film, Video, Scissors, Activity,
  AlertCircle, RefreshCw, ArrowLeft, History,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { AnalyticsService } from '../services/analytics.service';
import { ActivityService } from '../services/activity.service';
import * as contentService from '../services/content';
import type { UnifiedContentItem, ContentKind } from '../services/content';
import * as db from '../services/database';
import { isDemoMode } from '../config/demoMode';
import { DemoBadge } from '../components/DemoBadge';
import type { DashboardStats, ChannelActivity } from '../types';

/**
 * ETAPA 7E-1 — ANALYTICS DEL CREATOR STUDIO (/dashboard/analytics)
 *
 * Página honesta: muestra ÚNICAMENTE métricas que existen en la arquitectura
 * actual, reutilizando los servicios existentes (sin segunda capa de métricas):
 *  - Resumen principal        → AnalyticsService.getDashboardStats (seguidores,
 *                               visualizaciones, horas transmitidas).
 *  - Contenido del creador    → services/content.ts getCreatorContent (capa
 *                               unificada Etapa 6; incluye uploads locales 7A/7B).
 *  - Actividad reciente       → ActivityService.getChannelActivities.
 *  - Gráfico                  → recharts SOLO con conteos REALES por tipo de
 *                               contenido. No se fabrican series temporales:
 *                               sin histórico persistido de analíticas, la
 *                               sección lo declara explícitamente.
 *
 * NO hay métricas financieras ni datos simulados de backend. Funciona con
 * DEMO_MODE ON y OFF; si el canal pertenece a un usuario demo_* se identifica
 * con el mecanismo existente (DemoBadge / prefijo demo_).
 */

type Period = 'today' | '7days' | '30days' | '90days';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoy',
  '7days': '7 días',
  '30days': '30 días',
  '90days': '90 días',
};

export function AnalyticsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ChannelActivity[]>([]);
  const [contentItems, setContentItems] = useState<UnifiedContentItem[]>([]);
  const [channelTitle, setChannelTitle] = useState<string | null>(null);
  const [isDemoChannel, setIsDemoChannel] = useState(false);
  const [period, setPeriod] = useState<Period>('30days');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(() => {
    if (!user) {
      setError('No has iniciado sesión.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const channel = db.getChannelByUserId(user.id);
      if (!channel) {
        // Sin canal no hay analytics propios: estado vacío honesto (no spinner).
        setStats(null);
        setLoading(false);
        return;
      }

      // Métricas existentes (servicio actual; derivadas de datos locales reales)
      setStats(AnalyticsService.getDashboardStats(channel.id));

      // Contenido propio unificado — única fuente: services/content.ts (Etapa 6)
      setContentItems(contentService.getCreatorContent(user.id));

      // Actividad reciente (servicio existente)
      setActivities(ActivityService.getChannelActivities(channel.id, 8));

      setChannelTitle(channel.title);
      const owner = db.getUserById(channel.userId);
      setIsDemoChannel(!!owner?.username && owner.username.startsWith('demo_'));

      setLoading(false);
    } catch (e) {
      console.error('[Analytics] Error cargando datos:', e);
      setStats(null);
      setError('Los datos de Analytics no están disponibles en este momento.');
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---- Render: LOADING (con timeout de seguridad: nunca spinner infinito) ----
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => {
      setError('Los datos de Analytics no están disponibles en este momento.');
      setLoading(false);
    }, 10000);
    return () => clearTimeout(t);
  }, [loading]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-bg-elevated rounded w-56" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 bg-bg-elevated rounded-xl" />
            ))}
          </div>
          <div className="h-72 bg-bg-elevated rounded-xl" />
        </div>
      </div>
    );
  }

  // ---- Render: ERROR + recuperación ----
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-text-secondary mb-6">{error}</p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" /> Reintentar
          </button>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-text-secondary hover:text-white text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a Creator Studio
          </Link>
        </div>
      </div>
    );
  }

  // ---- Render: SIN CANAL (estado vacío honesto) ----
  if (!stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <BarChart3 className="w-12 h-12 text-text-muted mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-text-secondary mb-6">
          Todavía no tienes un canal. Crea uno para ver las estadísticas aquí.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Ir a Creator Studio
        </Link>
      </div>
    );
  }

  const countByKind = (kind: ContentKind) => contentItems.filter(i => i.kind === kind).length;
  const kinds: Array<{ kind: ContentKind; label: string; color: string }> = [
    { kind: 'reel', label: 'Reels', color: '#a855f7' },
    { kind: 'video', label: 'VOD', color: '#22c55e' },
    { kind: 'clip', label: 'Clips', color: '#f59e0b' },
  ];
  const chartData = kinds.map(k => ({ name: k.label, cantidad: countByKind(k.kind) }));
  const hasContentData = contentItems.length > 0;
  const streamsInPeriod = AnalyticsService.getStreamAnalytics(
    db.getChannelByUserId(user!.id)?.id ?? '', period,
  ).streams;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* ===== Encabezado ===== */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-primary-light" /> Analytics
            </h1>
            {(isDemoChannel || isDemoMode()) && <DemoBadge />}
          </div>
          <p className="text-text-secondary mt-1">
            Resumen del rendimiento de tu canal y contenido.
            {channelTitle ? ` · ${channelTitle}` : ''}
          </p>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-primary-light hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4" /> Creator Studio
        </Link>
      </div>

      {/* Aviso de transparencia: datos locales, no estadísticas de producción */}
      <p className="text-xs text-text-muted mb-6">
        Estas métricas provienen de los datos disponibles en esta instancia local/demo
        de NEXURA. No son estadísticas de producción.
      </p>

      {/* ===== Período (filtra solo los streams del período) ===== */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <span className="text-xs uppercase tracking-wide text-text-muted mr-1">Período:</span>
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              period === p
                ? 'bg-primary/10 border-primary/40 text-primary-light'
                : 'bg-bg-card border-border text-text-secondary hover:text-white'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* ===== Resumen principal (solo métricas que existen) ===== */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-3">
          Resumen principal
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Seguidores" value={stats.totalFollowers}
            color="text-primary-light" bgColor="bg-primary/10" />
          <StatCard icon={Eye} label="Visualizaciones" value={stats.totalViews}
            color="text-success" bgColor="bg-success/10" />
          <StatCard icon={Clock} label="Horas transmitidas" value={stats.totalStreamHours}
            color="text-warning" bgColor="bg-warning/10" />
          <StatCard icon={Film} label="Contenido publicado" value={contentItems.length}
            color="text-primary-light" bgColor="bg-primary/10" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-text-secondary">
          <span>
            Estado:{' '}
            <span className={`font-medium ${stats.liveStatus === 'LIVE' ? 'text-danger' : 'text-white'}`}>
              {stats.liveStatus === 'LIVE' ? 'EN VIVO' : 'OFFLINE'}
            </span>
            {stats.liveStatus === 'LIVE' && typeof stats.currentViewers === 'number' && (
              <span className="text-text-secondary"> · {stats.currentViewers} espectadores</span>
            )}
          </span>
          <span>
            Streams finalizados ({PERIOD_LABELS[period].toLowerCase()}):{' '}
            <span className="text-white font-medium tabular-nums">{streamsInPeriod.length}</span>
          </span>
        </div>
      </section>

      {/* ===== Contenido del creador (capa unificada) ===== */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Contenido
          </h2>
          <Link to="/library" className="text-sm text-primary-light hover:text-primary">
            Ver Biblioteca
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <KindCard icon={Film} label="Reels" value={countByKind('reel')} accent="text-primary-light" />
          <KindCard icon={Video} label="VOD / Videos" value={countByKind('video')} accent="text-success" />
          <KindCard icon={Scissors} label="Clips" value={countByKind('clip')} accent="text-warning" />
        </div>
        <p className="text-xs text-text-muted mt-2">
          Incluye el contenido subido localmente desde Creator Studio (Etapa 7A/7B).
          Las visualizaciones por contenido se muestran donde el dato existe
          (VOD/Clip); los Reels locales aún no registran vistas propias.
        </p>
      </section>

      {/* ===== Gráfico: SOLO conteos reales por tipo ===== */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-3">
          Distribución de contenido
        </h2>
        {hasContentData ? (
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <p className="text-sm text-white font-medium mb-4">
              Contenidos del canal por tipo (conteo real, sin serie temporal)
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(168, 85, 247, 0.06)' }}
                    contentStyle={{ background: '#111318', border: '1px solid #2a2d34', borderRadius: 8, fontSize: 13 }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="cantidad" radius={[6, 6, 0, 0]} maxBarSize={72}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={kinds[i].color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="bg-bg-card border border-border rounded-xl p-6 text-center">
            <History className="w-8 h-8 text-text-muted mx-auto mb-2" />
            <p className="text-sm text-text-secondary">
              Los datos históricos estarán disponibles cuando NEXURA tenga
              almacenamiento persistente de analíticas.
            </p>
            <p className="text-xs text-text-muted mt-1">
              Aún no hay contenido suficiente para construir un gráfico real.
            </p>
          </div>
        )}
        {!hasContentData && (
          <p className="text-xs text-text-muted mt-2">
            Cuando exista contenido, este panel mostrará únicamente conteos reales
            (no se fabrican series temporales).
          </p>
        )}
      </section>

      {/* ===== Actividad reciente (ActivityService existente) ===== */}
      <section className="bg-bg-card border border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary-light" />
          Actividad reciente
        </h2>
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary">Sin actividad registrada todavía.</p>
            <p className="text-text-muted text-sm mt-1">
              Cuando publiques streams o contenido, aparecerá aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map(activity => (
              <div key={activity.id} className="flex items-start gap-3 p-3 bg-bg-elevated rounded-lg">
                <div className="flex-shrink-0 mt-1">{getActivityIcon(activity.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{activity.title}</p>
                  <p className="text-xs text-text-secondary mt-1 truncate">{activity.description}</p>
                  <p className="text-xs text-text-muted mt-2">
                    {new Date(activity.createdAt).toLocaleString('es', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
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

function StatCard({
  icon: Icon, label, value, color, bgColor,
}: {
  icon: React.ElementType; label: string; value: number; color: string; bgColor: string;
}) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className={`w-9 h-9 rounded-lg ${bgColor} flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <p className="text-2xl font-bold text-white tabular-nums">
        {value.toLocaleString('es')}
      </p>
      <p className="text-xs text-text-muted mt-1">{label}</p>
    </div>
  );
}

function KindCard({
  icon: Icon, label, value, accent,
}: {
  icon: React.ElementType; label: string; value: number; accent: string;
}) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4 flex items-center gap-3">
      <Icon className={`w-5 h-5 ${accent} flex-shrink-0`} />
      <div>
        <p className="text-lg font-bold text-white tabular-nums leading-none">{value}</p>
        <p className="text-xs text-text-muted mt-1">{label}</p>
      </div>
    </div>
  );
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'STREAM_STARTED': return <Clock className="w-4 h-4 text-danger" />;
    case 'STREAM_ENDED': return <Clock className="w-4 h-4 text-text-muted" />;
    case 'VIDEO_PUBLISHED': return <Video className="w-4 h-4 text-success" />;
    case 'CLIP_CREATED': return <Scissors className="w-4 h-4 text-warning" />;
    case 'NEW_FOLLOWER': return <Users className="w-4 h-4 text-primary-light" />;
    default: return <Activity className="w-4 h-4 text-text-muted" />;
  }
}

export default AnalyticsPage;
