import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { SecurityService } from '../services/security.service';
import { ReportService } from '../services/report.service';
import { AuthorizationService, AuthorizationError } from '../services/authorization.service';
import type { SecurityEvent, SecuritySeverity } from '../types';
import {
  Shield, AlertTriangle, Lock, UserX, Activity, TrendingUp,
  Filter, Eye, CheckCircle, XCircle, Clock
} from 'lucide-react';

export function SecurityDashboardPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [severityFilter, setSeverityFilter] = useState<SecuritySeverity | 'all'>('all');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, severityFilter]);

  const loadData = () => {
    setLoading(true);
    
    try {
      // Verificar permisos (ADMIN o OWNER)
      AuthorizationService.requireAdmin(user?.id || null);
      
      const loadedEvents = severityFilter === 'all'
        ? SecurityService.getGlobalSecurityEvents(undefined, 100)
        : SecurityService.getGlobalSecurityEvents(severityFilter, 100);
      
      setEvents(loadedEvents);
      
      // Calcular estadísticas
      const allEvents = SecurityService.getGlobalSecurityEvents(undefined, 1000);
      setStats({
        total: allEvents.length,
        critical: allEvents.filter(e => e.severity === 'CRITICAL').length,
        high: allEvents.filter(e => e.severity === 'HIGH').length,
        failedLogins: allEvents.filter(e => e.type === 'LOGIN_FAILED').length,
        suspiciousLogins: allEvents.filter(e => e.type === 'SUSPICIOUS_LOGIN').length,
        lockedAccounts: allEvents.filter(e => e.type === 'ACCOUNT_LOCKED').length,
      });
    } catch (error) {
      if (error instanceof AuthorizationError) {
        setEvents([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'LOGIN_SUCCESS':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'LOGIN_FAILED':
        return <XCircle className="w-5 h-5 text-danger" />;
      case 'SUSPICIOUS_LOGIN':
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      case 'ACCOUNT_LOCKED':
        return <Lock className="w-5 h-5 text-danger" />;
      case 'RATE_LIMIT_TRIGGERED':
        return <Activity className="w-5 h-5 text-warning" />;
      case 'PERMISSION_DENIED':
        return <UserX className="w-5 h-5 text-danger" />;
      default:
        return <Shield className="w-5 h-5 text-text-muted" />;
    }
  };

  const getSeverityColor = (severity: SecuritySeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-danger/10 text-danger border-danger/20';
      case 'HIGH':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'MEDIUM':
        return 'bg-primary/10 text-primary-light border-primary/20';
      case 'LOW':
        return 'bg-bg-elevated text-text-secondary border-border';
    }
  };

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <Shield className="w-16 h-16 text-text-muted mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Acceso denegado</h1>
        <p className="text-text-secondary">Se requieren permisos de administrador para acceder a esta página.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Centro de Seguridad</h1>
        <p className="text-text-secondary">Monitorea la seguridad de la plataforma y actividad sospechosa</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <p className="text-text-muted text-sm mb-1">Eventos Totales</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-bg-card border border-danger/20 rounded-xl p-4">
            <p className="text-text-muted text-sm mb-1">Críticos</p>
            <p className="text-2xl font-bold text-danger">{stats.critical}</p>
          </div>
          <div className="bg-bg-card border border-warning/20 rounded-xl p-4">
            <p className="text-text-muted text-sm mb-1">Altos</p>
            <p className="text-2xl font-bold text-warning">{stats.high}</p>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <p className="text-text-muted text-sm mb-1">Logins Fallidos</p>
            <p className="text-2xl font-bold text-danger">{stats.failedLogins}</p>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <p className="text-text-muted text-sm mb-1">Logins Sospechosos</p>
            <p className="text-2xl font-bold text-warning">{stats.suspiciousLogins}</p>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <p className="text-text-muted text-sm mb-1">Cuentas Bloqueadas</p>
            <p className="text-2xl font-bold text-danger">{stats.lockedAccounts}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-text-muted" />
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value as any)}
            className="bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary"
          >
            <option value="all">Todas las severidades</option>
            <option value="CRITICAL">Crítica</option>
            <option value="HIGH">Alta</option>
            <option value="MEDIUM">Media</option>
            <option value="LOW">Baja</option>
          </select>
        </div>
      </div>

      {/* Events List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No hay eventos de seguridad</h2>
          <p className="text-text-secondary">
            {severityFilter === 'all'
              ? 'No se han registrado eventos de seguridad'
              : `No hay eventos con severidad ${severityFilter}`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(event => (
            <div
              key={event.id}
              className="bg-bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getEventIcon(event.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-1 rounded border ${getSeverityColor(event.severity)}`}>
                      {event.severity}
                    </span>
                    <span className="text-sm font-medium text-white">
                      {event.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  
                  {event.metadata && (
                    <p className="text-sm text-text-secondary mb-2">
                      {JSON.stringify(event.metadata)}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    {event.userId && <span>Usuario: {event.userId.slice(0, 8)}...</span>}
                    {event.ipHash && <span>IP: {event.ipHash.slice(0, 8)}...</span>}
                    <span>
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date(event.createdAt).toLocaleString('es')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
