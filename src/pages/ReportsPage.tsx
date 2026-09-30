import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ReportService } from '../services/report.service';
import { AuthorizationService, AuthorizationError } from '../services/authorization.service';
import type { Report, ReportStatus, ReportPriority } from '../types';
import * as db from '../services/database';
import {
  Flag, AlertTriangle, CheckCircle, XCircle, Clock,
  Filter, Search, Eye, ChevronDown, User, MessageSquare,
  Radio, Video, Scissors
} from 'lucide-react';

export function ReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('pending');
  const [priorityFilter, setPriorityFilter] = useState<ReportPriority | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadReports();
    }
  }, [user, filter, priorityFilter]);

  const loadReports = () => {
    setLoading(true);
    
    try {
      // Verificar permisos (MODERATOR, ADMIN, OWNER)
      AuthorizationService.requireModerator(user?.id || null);
      
      let loadedReports = ReportService.getReports();
      
      // Aplicar filtros
      if (filter === 'pending') {
        loadedReports = loadedReports.filter(r => r.status === 'OPEN' || r.status === 'UNDER_REVIEW');
      } else if (filter === 'resolved') {
        loadedReports = loadedReports.filter(r => 
          r.status === 'ACTION_TAKEN' || r.status === 'DISMISSED' || r.status === 'CLOSED'
        );
      }
      
      if (priorityFilter !== 'all') {
        loadedReports = loadedReports.filter(r => r.priority === priorityFilter);
      }
      
      if (searchQuery) {
        loadedReports = loadedReports.filter(r =>
          r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.targetId.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      setReports(loadedReports);
    } catch (error) {
      if (error instanceof AuthorizationError) {
        // Usuario no tiene permisos
        setReports([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = (reportId: string) => {
    if (!user) return;
    ReportService.assignReport(reportId, user.id);
    loadReports();
  };

  const handleResolve = (reportId: string, resolution: string) => {
    if (!user) return;
    ReportService.resolveWithAction(reportId, user.id, resolution);
    loadReports();
    setSelectedReport(null);
  };

  const handleDismiss = (reportId: string, reason: string) => {
    if (!user) return;
    ReportService.dismissReport(reportId, user.id, reason);
    loadReports();
    setSelectedReport(null);
  };

  const getTargetIcon = (targetType: string) => {
    switch (targetType) {
      case 'USER':
        return <User className="w-4 h-4" />;
      case 'MESSAGE':
        return <MessageSquare className="w-4 h-4" />;
      case 'CHANNEL':
        return <Radio className="w-4 h-4" />;
      case 'VIDEO':
        return <Video className="w-4 h-4" />;
      case 'CLIP':
        return <Scissors className="w-4 h-4" />;
      default:
        return <Flag className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: ReportPriority) => {
    switch (priority) {
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

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case 'OPEN':
        return 'bg-warning/10 text-warning';
      case 'UNDER_REVIEW':
        return 'bg-primary/10 text-primary-light';
      case 'ACTION_TAKEN':
        return 'bg-success/10 text-success';
      case 'DISMISSED':
        return 'bg-bg-elevated text-text-muted';
      case 'ESCALATED':
        return 'bg-danger/10 text-danger';
      case 'CLOSED':
        return 'bg-bg-elevated text-text-muted';
    }
  };

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <Flag className="w-16 h-16 text-text-muted mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Acceso denegado</h1>
        <p className="text-text-secondary">Se requieren permisos de moderador para acceder a esta página.</p>
      </div>
    );
  }

  const stats = ReportService.getReportStats();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Reportes</h1>
        <p className="text-text-secondary">Gestiona los reportes de usuarios y contenido</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-text-muted text-sm mb-1">Pendientes</p>
          <p className="text-2xl font-bold text-warning">{stats.open}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-text-muted text-sm mb-1">En revisión</p>
          <p className="text-2xl font-bold text-primary-light">{stats.underReview}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-text-muted text-sm mb-1">Resueltos</p>
          <p className="text-2xl font-bold text-success">{stats.resolved}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-text-muted text-sm mb-1">Críticos</p>
          <p className="text-2xl font-bold text-danger">{stats.byPriority.CRITICAL}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-primary text-white'
                  : 'bg-bg-elevated text-text-secondary hover:text-white'
              }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setFilter('resolved')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'resolved'
                  ? 'bg-primary text-white'
                  : 'bg-bg-elevated text-text-secondary hover:text-white'
              }`}
            >
              Resueltos
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-bg-elevated text-text-secondary hover:text-white'
              }`}
            >
              Todos
            </button>
          </div>

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value as any)}
            className="bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary"
          >
            <option value="all">Todas las prioridades</option>
            <option value="CRITICAL">Crítica</option>
            <option value="HIGH">Alta</option>
            <option value="MEDIUM">Media</option>
            <option value="LOW">Baja</option>
          </select>

          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center bg-bg-input border border-border rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-text-muted mr-2" />
              <input
                type="text"
                placeholder="Buscar reportes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white placeholder-text-muted outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            {filter === 'pending' ? 'No hay reportes pendientes' : 'No hay reportes'}
          </h2>
          <p className="text-text-secondary">
            {filter === 'pending'
              ? 'Todos los reportes han sido revisados'
              : 'No se encontraron reportes con los filtros actuales'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => {
            const reporter = db.getUserById(report.reporterId);
            
            return (
              <div
                key={report.id}
                className="bg-bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all cursor-pointer"
                onClick={() => setSelectedReport(report)}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {getTargetIcon(report.targetType)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(report.priority)}`}>
                        {report.priority}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                      <span className="text-xs text-text-muted">
                        {report.targetType}
                      </span>
                    </div>
                    
                    <p className="text-sm text-white mb-1 line-clamp-2">
                      {report.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      <span>Razón: {report.reason}</span>
                      <span>Por: {reporter?.username || 'Desconocido'}</span>
                      <span>
                        {new Date(report.createdAt).toLocaleDateString('es')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Report Detail Modal */}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onAssign={handleAssign}
          onResolve={handleResolve}
          onDismiss={handleDismiss}
        />
      )}
    </div>
  );
}

function ReportDetailModal({
  report,
  onClose,
  onAssign,
  onResolve,
  onDismiss,
}: {
  report: Report;
  onClose: () => void;
  onAssign: (id: string) => void;
  onResolve: (id: string, resolution: string) => void;
  onDismiss: (id: string, reason: string) => void;
}) {
  const [resolution, setResolution] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Detalle del Reporte</h2>
            <button onClick={onClose} className="text-text-muted hover:text-white">
              <XCircle className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex items-center gap-2 mb-4">
            <span className={`text-xs px-2 py-1 rounded border ${
              report.priority === 'CRITICAL' ? 'bg-danger/10 text-danger border-danger/20' :
              report.priority === 'HIGH' ? 'bg-warning/10 text-warning border-warning/20' :
              'bg-primary/10 text-primary-light border-primary/20'
            }`}>
              {report.priority}
            </span>
            <span className={`text-xs px-2 py-1 rounded ${
              report.status === 'OPEN' ? 'bg-warning/10 text-warning' :
              report.status === 'UNDER_REVIEW' ? 'bg-primary/10 text-primary-light' :
              'bg-success/10 text-success'
            }`}>
              {report.status}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-text-muted mb-1">Razón</p>
            <p className="text-white">{report.reason}</p>
          </div>

          <div>
            <p className="text-sm text-text-muted mb-1">Descripción</p>
            <p className="text-text-secondary">{report.description}</p>
          </div>

          <div>
            <p className="text-sm text-text-muted mb-1">Objetivo</p>
            <p className="text-white">
              {report.targetType}: {report.targetId}
            </p>
          </div>

          <div>
            <p className="text-sm text-text-muted mb-1">Reportado por</p>
            <p className="text-white">{report.reporterId}</p>
          </div>

          <div>
            <p className="text-sm text-text-muted mb-1">Fecha</p>
            <p className="text-text-secondary">
              {new Date(report.createdAt).toLocaleString('es')}
            </p>
          </div>

          {(report.status === 'OPEN' || report.status === 'UNDER_REVIEW') && (
            <div className="pt-4 border-t border-border space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Resolución / Acción tomada
                </label>
                <textarea
                  value={resolution}
                  onChange={e => setResolution(e.target.value)}
                  placeholder="Describe la acción tomada o la razón de la decisión..."
                  className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-white placeholder-text-muted outline-none focus:border-primary transition-colors"
                  rows={4}
                />
              </div>

              <div className="flex gap-3">
                {report.status === 'OPEN' && (
                  <button
                    onClick={() => onAssign(report.id)}
                    className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
                  >
                    Asignar a mí
                  </button>
                )}
                <button
                  onClick={() => onResolve(report.id, resolution)}
                  disabled={!resolution.trim()}
                  className="flex-1 px-4 py-2 bg-success hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  Resolver con acción
                </button>
                <button
                  onClick={() => onDismiss(report.id, resolution)}
                  disabled={!resolution.trim()}
                  className="flex-1 px-4 py-2 bg-bg-elevated hover:bg-bg-input border border-border text-text-secondary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  Descartar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
