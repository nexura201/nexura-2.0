import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { healthCheckService, SystemHealth } from '../services/healthCheck.service';
import { metricsService } from '../services/metrics.service';
import { queueService } from '../services/queue.service';
import { mediaServerService } from '../services/mediaServer.service';
import { cacheService } from '../services/cache.service';
import {
  Server, Database, HardDrive, Activity, AlertCircle,
  CheckCircle, XCircle, Clock, RefreshCw, TrendingUp,
  Zap, Wifi, Cpu, MemoryStick
} from 'lucide-react';

export function InfrastructureDashboardPage() {
  const { user } = useAuth();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadHealth();
    
    if (autoRefresh) {
      const interval = setInterval(loadHealth, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadHealth = async () => {
    try {
      const healthData = await healthCheckService.checkAll();
      setHealth(healthData);
    } catch (error) {
      console.error('[InfrastructureDashboard] Error loading health:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'OWNER') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-16 h-16 text-text-muted mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Acceso denegado</h1>
        <p className="text-text-secondary">Solo el OWNER puede acceder al dashboard de infraestructura.</p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'UP':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'DEGRADED':
        return <AlertCircle className="w-5 h-5 text-warning" />;
      case 'DOWN':
        return <XCircle className="w-5 h-5 text-danger" />;
      default:
        return <Clock className="w-5 h-5 text-text-muted" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UP':
        return 'bg-success/10 border-success/20';
      case 'DEGRADED':
        return 'bg-warning/10 border-warning/20';
      case 'DOWN':
        return 'bg-danger/10 border-danger/20';
      default:
        return 'bg-bg-elevated border-border';
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const [queueStats, setQueueStats] = useState<any>(null);
  const [mediaStats, setMediaStats] = useState<any>(null);
  const [cacheStats, setCacheStats] = useState<any>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        if (queueService.getStats) {
          const stats = await queueService.getStats();
          setQueueStats(stats);
        }
        if (mediaServerService.getStats) {
          const stats = mediaServerService.getStats();
          setMediaStats(stats);
        }
        if (cacheService.getStats) {
          const stats = await cacheService.getStats();
          setCacheStats(stats);
        }
      } catch (error) {
        console.error('[InfrastructureDashboard] Error loading stats:', error);
      }
    };
    loadStats();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard de Infraestructura</h1>
          <p className="text-text-secondary">Monitoreo en tiempo real de todos los servicios</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh
          </label>
          <button
            onClick={loadHealth}
            className="flex items-center gap-2 px-4 py-2 bg-bg-elevated hover:bg-bg-input border border-border rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
      ) : health ? (
        <>
          {/* System Overview */}
          <div className={`border rounded-xl p-6 mb-6 ${getStatusColor(health.status)}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {getStatusIcon(health.status)}
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Sistema {health.status === 'UP' ? 'Operativo' : health.status === 'DEGRADED' ? 'Degradado' : 'Caído'}
                  </h2>
                  <p className="text-sm text-text-secondary">
                    Uptime: {formatUptime(health.uptime)}
                  </p>
                </div>
              </div>
              <div className="text-right text-sm text-text-muted">
                Última verificación: {new Date(health.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Service Health Checks */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {health.checks.map((check) => (
              <div key={check.service} className={`border rounded-xl p-4 ${getStatusColor(check.status)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(check.status)}
                    <h3 className="font-semibold text-white capitalize">{check.service}</h3>
                  </div>
                  {check.latency !== undefined && (
                    <span className="text-xs text-text-muted">{check.latency}ms</span>
                  )}
                </div>
                <p className="text-sm text-text-secondary">{check.message}</p>
                {check.details && (
                  <div className="mt-2 text-xs text-text-muted">
                    <pre className="bg-bg-dark/50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(check.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Infrastructure Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Queue Stats */}
            {queueStats && (
              <div className="bg-bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-5 h-5 text-primary-light" />
                  <h3 className="font-semibold text-white">Colas</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Total jobs:</span>
                    <span className="text-white font-medium">{queueStats.totalJobs}</span>
                  </div>
                  {queueStats.queues.map((q: any) => (
                    <div key={q.name} className="flex justify-between text-xs">
                      <span className="text-text-muted">{q.name}:</span>
                      <span className="text-text-secondary">
                        {q.pending} pending, {q.completed} done
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Media Server Stats */}
            {mediaStats && (
              <div className="bg-bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Server className="w-5 h-5 text-success" />
                  <h3 className="font-semibold text-white">Media Servers</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Servidores:</span>
                    <span className="text-white font-medium">
                      {mediaStats.availableServers}/{mediaStats.totalServers}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Streams activos:</span>
                    <span className="text-white font-medium">{mediaStats.totalStreams}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Carga promedio:</span>
                    <span className="text-white font-medium">{mediaStats.averageLoad.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Cache Stats */}
            {cacheStats && (
              <div className="bg-bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-warning" />
                  <h3 className="font-semibold text-white">Cache</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">En memoria:</span>
                    <span className="text-white font-medium">{cacheStats.memorySize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">En storage:</span>
                    <span className="text-white font-medium">{cacheStats.storageSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Total keys:</span>
                    <span className="text-white font-medium">{cacheStats.totalKeys}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Metrics Summary */}
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-primary-light" />
                <h3 className="font-semibold text-white">Métricas</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Requests:</span>
                  <span className="text-white font-medium">
                    {metricsService.get('http_requests_total')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Errores:</span>
                  <span className="text-white font-medium">
                    {metricsService.get('http_errors_total')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Cache hits:</span>
                  <span className="text-white font-medium">
                    {metricsService.get('cache_hits_total')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Streams */}
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Wifi className="w-5 h-5 text-success" />
              Streams Activos
            </h2>
            {mediaStats && mediaStats.totalStreams > 0 ? (
              <div className="space-y-2">
                {Array.from(mediaServerService.getAllServers()).map(server => (
                  <div key={server.id} className="flex items-center justify-between p-3 bg-bg-elevated rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(server.status)}
                      <div>
                        <p className="text-white font-medium">{server.name}</p>
                        <p className="text-xs text-text-muted">{server.region || 'Default'}</p>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-white">{server.activeStreams} streams</p>
                      <p className="text-xs text-text-muted">
                        {server.currentLoad.toFixed(1)}% load
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-secondary text-center py-4">No hay streams activos</p>
            )}
          </div>
        </>
      ) : (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
          <AlertCircle className="w-16 h-16 text-danger mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Error al cargar datos</h2>
          <p className="text-text-secondary">No se pudo obtener el estado del sistema.</p>
        </div>
      )}
    </div>
  );
}
