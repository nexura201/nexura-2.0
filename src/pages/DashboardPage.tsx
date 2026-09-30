import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, Eye, Clock, Video, Scissors, Radio, TrendingUp,
  BarChart3, Calendar, Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AnalyticsService } from '../services/analytics.service';
import { ActivityService } from '../services/activity.service';
import * as db from '../services/database';
import type { DashboardStats, AnalyticsPeriod, ChannelActivity } from '../types';

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsPeriod | null>(null);
  const [period, setPeriod] = useState<AnalyticsPeriod['period']>('7days');
  const [activities, setActivities] = useState<ChannelActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, period]);

  const loadData = () => {
    if (!user) return;

    const channel = db.getChannelByUserId(user.id);
    if (!channel) {
      setLoading(false);
      return;
    }

    // Cargar estadísticas del dashboard
    const dashboardStats = AnalyticsService.getDashboardStats(channel.id);
    setStats(dashboardStats);

    // Cargar analytics del período
    const periodAnalytics = AnalyticsService.getFullAnalytics(channel.id, period);
    setAnalytics(periodAnalytics);

    // Cargar actividades recientes
    const recentActivities = ActivityService.getChannelActivities(channel.id, 10);
    setActivities(recentActivities);

    setLoading(false);
  };

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-text-secondary mt-1">Bienvenido de vuelta, {user?.displayName}</p>
        </div>
        {stats.liveStatus === 'LIVE' && (
          <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 rounded-lg px-4 py-2">
            <div className="w-2 h-2 bg-danger rounded-full animate-pulse" />
            <span className="text-danger font-medium">EN VIVO</span>
            {stats.currentViewers && (
              <span className="text-text-secondary text-sm">
                {stats.currentViewers} espectadores
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Users}
          label="Seguidores"
          value={stats.totalFollowers}
          color="text-primary-light"
          bgColor="bg-primary/10"
        />
        <StatCard
          icon={Eye}
          label="Visualizaciones"
          value={stats.totalViews}
          color="text-success"
          bgColor="bg-success/10"
        />
        <StatCard
          icon={Clock}
          label="Horas transmitidas"
          value={stats.totalStreamHours}
          color="text-warning"
          bgColor="bg-warning/10"
        />
        <StatCard
          icon={Video}
          label="Videos"
          value={stats.totalVideos}
          color="text-primary-light"
          bgColor="bg-primary/10"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Link
          to="/dashboard/stream"
          className="bg-bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-all group"
        >
          <Radio className="w-8 h-8 text-danger mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-semibold text-white mb-1">Iniciar Stream</h3>
          <p className="text-sm text-text-muted">Configura OBS y comienza a transmitir</p>
        </Link>

        <Link
          to="/dashboard/videos"
          className="bg-bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-all group"
        >
          <Video className="w-8 h-8 text-primary-light mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-semibold text-white mb-1">Mis Videos</h3>
          <p className="text-sm text-text-muted">{stats.totalVideos} videos publicados</p>
        </Link>

        <Link
          to="/dashboard/analytics"
          className="bg-bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-all group"
        >
          <BarChart3 className="w-8 h-8 text-success mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-semibold text-white mb-1">Analíticas</h3>
          <p className="text-sm text-text-muted">Estadísticas detalladas</p>
        </Link>
      </div>

      {/* Analytics Overview */}
      {analytics && (
        <div className="bg-bg-card border border-border rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-light" />
              Resumen del período
            </h2>
            <select
              value={period}
              onChange={e => setPeriod(e.target.value as AnalyticsPeriod['period'])}
              className="bg-bg-input border border-border rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-primary"
            >
              <option value="today">Hoy</option>
              <option value="7days">Últimos 7 días</option>
              <option value="30days">Últimos 30 días</option>
              <option value="90days">Últimos 90 días</option>
            </select>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-text-muted text-sm mb-2">Streams</p>
              <p className="text-3xl font-bold text-white">{analytics.streams.length}</p>
              <p className="text-text-secondary text-sm mt-1">
                {analytics.totalStreamHours} horas transmitidas
              </p>
            </div>
            <div>
              <p className="text-text-muted text-sm mb-2">Visualizaciones</p>
              <p className="text-3xl font-bold text-white">{analytics.totalViews}</p>
              <p className="text-text-secondary text-sm mt-1">
                En videos y clips
              </p>
            </div>
            <div>
              <p className="text-text-muted text-sm mb-2">Nuevos seguidores</p>
              <p className="text-3xl font-bold text-white">{analytics.newFollowers}</p>
              <p className="text-text-secondary text-sm mt-1">
                En este período
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-bg-card border border-border rounded-xl p-6">
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
      </div>
    </div>
  );
}

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
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-sm text-text-muted mt-1">{label}</p>
    </div>
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
      return <Activity className="w-5 h-5 text-text-muted" />;
  }
}
