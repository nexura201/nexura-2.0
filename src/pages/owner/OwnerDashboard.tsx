/**
 * Control Center OWNER — Dashboard principal.
 * Estadísticas 100% reales desde AdminService (null => "Datos no disponibles").
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { OwnerLayout, BackendNotice } from './OwnerLayout';
import { AdminService, type DashboardStats, type RecentEvent } from '../../services/admin.service';
import {
  Users, Radio, Film, Eye, UserPlus, AlertTriangle, LifeBuoy, BarChart3,
  Activity, ShieldCheck, Video, TrendingUp, Clock, CalendarDays, Wrench,
} from 'lucide-react';

export function OwnerDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<RecentEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    try {
      setStats(AdminService.getDashboardStats(user.id));
      setEvents(AdminService.getRecentActivity(15));
    } catch (e: any) {
      setError(e?.message ?? 'No se pudieron cargar las estadísticas.');
    }
  }, [user]);

  const fmt = (n: number | null | undefined): string => {
    if (n === null || n === undefined) return 'Datos no disponibles';
    return n.toLocaleString('es');
  };

  const cards = useMemo(() => {
    if (!stats) return [];
    return [
      { icon: Users, label: 'Usuarios registrados', value: fmt(stats.totalUsers), color: 'text-primary-light', to: '/owner/users' },
      { icon: Video, label: 'Creadores con canal', value: fmt(stats.creators), color: 'text-primary-light', to: '/owner/channels' },
      { icon: Radio, label: 'Lives activos', value: fmt(stats.activeLives), color: 'text-success', to: '/owner/lives' },
      { icon: Film, label: 'Reels publicados', value: fmt(stats.publishedReels), color: 'text-pink-400', to: '/owner/reels' },
      { icon: Eye, label: 'Visualizaciones', value: stats.totalViews === null ? 'Datos no disponibles' : fmt(stats.totalViews), color: 'text-warning', to: null },
      { icon: UserPlus, label: 'Usuarios nuevos (7 días)', value: fmt(stats.newUsers7d), color: 'text-success', to: '/owner/users' },
      { icon: AlertTriangle, label: 'Reportes pendientes', value: fmt(stats.pendingReports), color: 'text-danger', to: '/moderation/reports' },
      { icon: LifeBuoy, label: 'Tickets de soporte', value: fmt(stats.openTickets), color: 'text-primary-light', to: '/owner/support' },
      { icon: BarChart3, label: 'Espectadores en vivo', value: fmt(stats.liveViewers), color: 'text-primary-light', to: '/owner/lives' },
    ];
  }, [stats]);

  if (error) {
    return (
      <OwnerLayout title="Dashboard">
        <div className="bg-bg-card border border-border rounded-xl p-8 text-center text-text-secondary">
          {error === 'INSUFFICIENT_PERMISSIONS' || error === 'ACCOUNT_NOT_ACTIVE'
            ? 'Acceso restringido al propietario de la plataforma.'
            : `No se pudieron cargar las estadísticas (${error}).`}
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout title="Dashboard" subtitle="Estado general de NEXURA con datos reales">
      {/* Tarjetas de estadísticas */}
      {!stats ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-bg-card border border-border rounded-xl p-4 h-[92px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {cards.map(c => {
            const inner = (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <c.icon className={`w-4 h-4 ${c.color}`} />
                  <span className="text-xs text-text-muted">{c.label}</span>
                </div>
                <p className={`text-xl sm:text-2xl font-bold ${c.value === 'Datos no disponibles' ? 'text-text-muted text-sm' : 'text-white'}`}>
                  {c.value}
                </p>
              </>
            );
            return c.to ? (
              <Link key={c.label} to={c.to} className="bg-bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
                {inner}
              </Link>
            ) : (
              <div key={c.label} className="bg-bg-card border border-border rounded-xl p-4">{inner}</div>
            );
          })}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Estado de la plataforma */}
        <div className="lg:col-span-3 grid sm:grid-cols-3 gap-4">
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <h2 className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary-light" /> Estado de la plataforma
            </h2>
            {(() => {
              const m = AdminService.getMaintenanceConfig();
              return (
                <div className="space-y-2">
                  <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full ${m.enabled ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                    <span className={`w-2 h-2 rounded-full ${m.enabled ? 'bg-warning' : 'bg-success animate-pulse'}`} />
                    {m.enabled ? 'Mantenimiento' : 'Activa'}
                  </span>
                  {m.enabled && m.message && <p className="text-xs text-text-secondary leading-relaxed">{m.message}</p>}
                  <Link to="/owner/settings" className="block text-xs text-primary-light hover:text-white transition-colors">Administrar →</Link>
                </div>
              );
            })()}
          </div>

          <div className="bg-bg-card border border-border rounded-xl p-4">
            <h2 className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Radio className="w-4 h-4 text-primary-light" /> Estado del streaming
            </h2>
            <div className="space-y-2">
              <p className="text-sm text-white">
                Lives activos: <span className={stats && stats.activeLives ? 'text-success font-bold' : 'text-text-muted'}>{fmt(stats?.activeLives)}</span>
              </p>
              <p className="text-xs text-text-secondary">Espectadores en vivo: {fmt(stats?.liveViewers)}</p>
              <Link to="/owner/infrastructure" className="block text-xs text-primary-light hover:text-white transition-colors">Infraestructura →</Link>
            </div>
          </div>

          <div className="bg-bg-card border border-border rounded-xl p-4">
            <h2 className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" /> Alertas administrativas
            </h2>
            <ul className="space-y-1.5 text-xs">
              {stats && stats.openTickets > 0 && (
                <li><Link to="/owner/support" className="flex items-center justify-between text-text-secondary hover:text-white"><span>Tickets de soporte abiertos</span><span className="text-warning font-bold">{fmt(stats.openTickets)}</span></Link></li>
              )}
              {stats && stats.pendingReports > 0 && (
                <li><Link to="/moderation/reports" className="flex items-center justify-between text-text-secondary hover:text-white"><span>Reportes pendientes</span><span className="text-danger font-bold">{fmt(stats.pendingReports)}</span></Link></li>
              )}
              {!stats || (stats.openTickets === 0 && stats.pendingReports === 0) ? (
                <li className="text-text-muted">Sin alertas activas.</li>
              ) : null}
            </ul>
          </div>
        </div>

        {/* Actividad reciente */}
        <div className="lg:col-span-2 bg-bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary-light" /> Actividad reciente
            </h2>
            <Link to="/owner/activity" className="text-xs text-primary-light hover:text-white transition-colors">
              Ver todo →
            </Link>
          </div>
          <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
            {events.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-sm">
                Todavía no hay eventos registrados. La actividad aparece cuando existen acciones reales en la plataforma.
              </div>
            ) : (
              events.map(ev => (
                <div key={ev.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-4 h-4 text-text-muted" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white">
                      <span className="font-medium">{ev.label}</span>
                      <span className="text-text-muted"> · {ev.actorName}</span>
                    </p>
                    {ev.details && (
                      <p className="text-xs text-text-muted truncate mt-0.5">{ev.details}</p>
                    )}
                  </div>
                  <span className="text-[11px] text-text-muted whitespace-nowrap">
                    {new Date(ev.createdAt).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Accesos rápidos + estado */}
        <div className="space-y-6">
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-light" /> Accesos rápidos
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { to: '/owner/users', label: 'Usuarios', icon: Users },
                { to: '/owner/support', label: 'Soporte', icon: LifeBuoy },
                { to: '/owner/settings', label: 'Configuración', icon: ShieldCheck },
                { to: '/owner/activity', label: 'Auditoría', icon: Activity },
                { to: '/owner/calendar', label: 'Calendario', icon: CalendarDays },
                { to: '/owner/security', label: 'Seguridad', icon: Wrench },
              ].map(q => (
                <Link
                  key={q.to}
                  to={q.to}
                  className="flex items-center gap-2 bg-bg-elevated hover:bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-text-secondary hover:text-white transition-colors"
                >
                  <q.icon className="w-4 h-4 text-primary-light" /> {q.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-bg-card border border-border rounded-xl p-4">
            <h2 className="text-base font-semibold text-white mb-3">Estado del contenido</h2>
            {stats ? (
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between"><span className="text-text-secondary">Canales totales</span><span className="text-white font-medium">{fmt(stats.channels)}</span></li>
                <li className="flex justify-between"><span className="text-text-secondary">Videos publicados (VOD)</span><span className="text-white font-medium">{fmt(stats.publishedVideos)}</span></li>
                <li className="flex justify-between"><span className="text-text-secondary">Reels publicados</span><span className="text-white font-medium">{fmt(stats.publishedReels)}</span></li>
                <li className="flex justify-between"><span className="text-text-secondary">Lives activos ahora</span><span className="text-success font-medium">{fmt(stats.activeLives)}</span></li>
              </ul>
            ) : (
              <p className="text-text-muted text-sm">Datos no disponibles</p>
            )}
          </div>

          <BackendNotice>
            Este dashboard muestra únicamente <strong className="text-white">datos reales</strong> obtenidos de los
            servicios existentes. Cuando una métrica no puede medirse sin backend se indica
            «Datos no disponibles» en lugar de inventarla.
          </BackendNotice>
        </div>
      </div>
    </OwnerLayout>
  );
}
