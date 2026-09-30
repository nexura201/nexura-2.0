import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertTriangle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { healthCheckService, SystemHealth } from '../services/healthCheck.service';

export function StatusPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadHealth();
    const interval = setInterval(loadHealth, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadHealth = async () => {
    try {
      const healthData = await healthCheckService.checkAll();
      setHealth(healthData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('[StatusPage] Error loading health:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'UP':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'DEGRADED':
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      case 'DOWN':
        return <XCircle className="w-5 h-5 text-danger" />;
      default:
        return <Clock className="w-5 h-5 text-text-muted" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UP':
        return 'text-success';
      case 'DEGRADED':
        return 'text-warning';
      case 'DOWN':
        return 'text-danger';
      default:
        return 'text-text-muted';
    }
  };

  const getStatusBgColor = (status: string) => {
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-text-secondary hover:text-white mb-8">
        <ArrowLeft className="w-4 h-4" />
        Volver al inicio
      </Link>

      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Estado del Sistema</h1>
        <p className="text-xl text-text-secondary mb-6">
          Estado actual de todos los servicios de NEXURA
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
          <Clock className="w-4 h-4" />
          Última actualización: {lastUpdated.toLocaleTimeString()}
          <button
            onClick={loadHealth}
            className="ml-2 p-1 hover:bg-bg-elevated rounded transition-colors"
            title="Actualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      ) : health ? (
        <>
          {/* Overall Status */}
          <div className={`border rounded-xl p-8 mb-8 text-center ${getStatusBgColor(health.status)}`}>
            <div className="flex items-center justify-center gap-3 mb-4">
              {getStatusIcon(health.status)}
              <h2 className={`text-3xl font-bold ${getStatusColor(health.status)}`}>
                {health.status === 'UP' && 'Todos los Sistemas Operativos'}
                {health.status === 'DEGRADED' && 'Algunos Sistemas Degradados'}
                {health.status === 'DOWN' && 'Interrupción del Servicio'}
              </h2>
            </div>
            <p className="text-text-secondary">
              Uptime: {formatUptime(health.uptime)}
            </p>
          </div>

          {/* Service Status */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Servicios</h2>
            <div className="space-y-3">
              {health.checks.map((check) => (
                <div
                  key={check.service}
                  className={`border rounded-xl p-4 ${getStatusBgColor(check.status)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(check.status)}
                      <h3 className="text-lg font-semibold text-white capitalize">
                        {check.service}
                      </h3>
                    </div>
                    <div className="flex items-center gap-4">
                      {check.latency !== undefined && (
                        <span className="text-sm text-text-muted">
                          Latencia: {check.latency}ms
                        </span>
                      )}
                      <span className={`text-sm font-medium ${getStatusColor(check.status)}`}>
                        {check.status === 'UP' && 'Operativo'}
                        {check.status === 'DEGRADED' && 'Degradado'}
                        {check.status === 'DOWN' && 'Caído'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-text-secondary ml-8">{check.message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-bg-card border border-border rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Información Adicional</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Total de servicios:</span>
                  <span className="text-white font-medium">{health.checks.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Servicios operativos:</span>
                  <span className="text-success font-medium">
                    {health.checks.filter(c => c.status === 'UP').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Servicios degradados:</span>
                  <span className="text-warning font-medium">
                    {health.checks.filter(c => c.status === 'DEGRADED').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Servicios caídos:</span>
                  <span className="text-danger font-medium">
                    {health.checks.filter(c => c.status === 'DOWN').length}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-bg-card border border-border rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">¿Necesitás ayuda?</h3>
              <p className="text-text-secondary text-sm mb-4">
                Si estás experimentando problemas pero todos los servicios aparecen como operativos, contactá con nuestro equipo de soporte.
              </p>
              <Link
                to="/support"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
              >
                Contactar Soporte
              </Link>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
          <XCircle className="w-16 h-16 text-danger mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Error al cargar el estado</h2>
          <p className="text-text-secondary mb-6">
            No se pudo obtener el estado del sistema. Por favor, intentá de nuevo.
          </p>
          <button
            onClick={loadHealth}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
        </div>
      )}

      {/* Historical Status (Placeholder) */}
      <div className="mt-12 bg-bg-card border border-border rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Historial de Estado</h2>
        <p className="text-text-secondary mb-4">
          En producción, aquí se mostraría el historial de estado de los últimos 90 días.
        </p>
        <div className="bg-bg-elevated rounded-lg p-4 text-center text-text-muted">
          <p className="text-sm">
            <strong>Nota:</strong> El historial de estado requiere un sistema de monitoring externo como UptimeRobot, StatusPage, o similar.
          </p>
        </div>
      </div>
    </div>
  );
}
