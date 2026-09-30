import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { queueService, Job, JobStatus } from '../services/queue.service';
import {
  Activity, RefreshCw, AlertCircle, CheckCircle, Clock,
  XCircle, Play, Pause, Trash2, Eye, Filter
} from 'lucide-react';

export function QueueDashboardPage() {
  const { user } = useAuth();
  const [selectedQueue, setSelectedQueue] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<JobStatus | 'all'>('all');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 5000);
    return () => clearInterval(interval);
  }, [selectedQueue, selectedStatus]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const allStats = await queueService.getStats();
      setStats(allStats);

      let loadedJobs: Job[] = [];

      if (selectedQueue === 'all') {
        // Get jobs from all queues
        for (const queue of allStats.queues) {
          const queueJobs = await queueService.getJobs(queue.name);
          loadedJobs = [...loadedJobs, ...queueJobs];
        }
      } else {
        loadedJobs = await queueService.getJobs(selectedQueue);
      }

      // Filter by status
      if (selectedStatus !== 'all') {
        loadedJobs = loadedJobs.filter(j => j.status === selectedStatus);
      }

      // Sort by creation time (newest first)
      loadedJobs.sort((a, b) => b.createdAt - a.createdAt);

      setJobs(loadedJobs);
    } catch (error) {
      console.error('[QueueDashboard] Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (jobId: string) => {
    await queueService.retryJob(jobId);
    loadJobs();
  };

  const handleCancel = async (jobId: string) => {
    if (confirm('¿Estás seguro de que quieres cancelar este trabajo?')) {
      await queueService.cancelJob(jobId);
      loadJobs();
    }
  };

  const handleCleanup = async () => {
    if (confirm('¿Quieres limpiar los trabajos completados/fallidos antiguos?')) {
      await queueService.cleanup();
      loadJobs();
    }
  };

  const getStatusIcon = (status: JobStatus) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4 text-text-muted" />;
      case 'PROCESSING':
        return <Activity className="w-4 h-4 text-primary-light animate-pulse" />;
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-danger" />;
      case 'RETRYING':
        return <RefreshCw className="w-4 h-4 text-warning animate-spin" />;
      case 'CANCELED':
        return <Pause className="w-4 h-4 text-text-muted" />;
    }
  };

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-bg-elevated text-text-secondary';
      case 'PROCESSING':
        return 'bg-primary/10 text-primary-light';
      case 'COMPLETED':
        return 'bg-success/10 text-success';
      case 'FAILED':
        return 'bg-danger/10 text-danger';
      case 'RETRYING':
        return 'bg-warning/10 text-warning';
      case 'CANCELED':
        return 'bg-bg-elevated text-text-muted';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (!user || user.role !== 'OWNER') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-16 h-16 text-text-muted mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Acceso denegado</h1>
        <p className="text-text-secondary">Solo el OWNER puede acceder al dashboard de colas.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard de Colas</h1>
          <p className="text-text-secondary">Monitoreo y gestión de trabajos asíncronos</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCleanup}
            className="flex items-center gap-2 px-4 py-2 bg-bg-elevated hover:bg-bg-input border border-border rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Limpiar antiguos
          </button>
          <button
            onClick={loadJobs}
            className="flex items-center gap-2 px-4 py-2 bg-bg-elevated hover:bg-bg-input border border-border rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {stats.queues.map((queue: any) => (
            <div key={queue.name} className="bg-bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-medium text-text-muted mb-2 capitalize">{queue.name}</h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Pending:</span>
                  <span className="text-white font-medium">{queue.pending}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Processing:</span>
                  <span className="text-primary-light font-medium">{queue.processing}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Completed:</span>
                  <span className="text-success font-medium">{queue.completed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Failed:</span>
                  <span className="text-danger font-medium">{queue.failed}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-text-muted" />
            <select
              value={selectedQueue}
              onChange={(e) => setSelectedQueue(e.target.value)}
              className="bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary"
            >
              <option value="all">Todas las colas</option>
              {stats?.queues.map((q: any) => (
                <option key={q.name} value={q.name}>{q.name}</option>
              ))}
            </select>
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary"
          >
            <option value="all">Todos los estados</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
            <option value="RETRYING">Retrying</option>
            <option value="CANCELED">Canceled</option>
          </select>
        </div>
      </div>

      {/* Jobs List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
          <Activity className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No hay trabajos</h2>
          <p className="text-text-secondary">
            No se encontraron trabajos con los filtros actuales.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <div
              key={job.id}
              className="bg-bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all cursor-pointer"
              onClick={() => setSelectedJob(job)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  {getStatusIcon(job.status)}
                  <div>
                    <p className="text-white font-medium">{job.queue}</p>
                    <p className="text-xs text-text-muted">ID: {job.id}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${getStatusColor(job.status)}`}>
                  {job.status}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-text-secondary">
                <div>
                  <span className="text-text-muted">Creado:</span>
                  <p>{new Date(job.createdAt).toLocaleString()}</p>
                </div>
                {job.processedAt && (
                  <div>
                    <span className="text-text-muted">Procesado:</span>
                    <p>{new Date(job.processedAt).toLocaleString()}</p>
                  </div>
                )}
                {job.completedAt && job.processedAt && (
                  <div>
                    <span className="text-text-muted">Duración:</span>
                    <p>{formatDuration(job.completedAt - job.processedAt)}</p>
                  </div>
                )}
                <div>
                  <span className="text-text-muted">Intentos:</span>
                  <p>{job.attempts}/{job.maxAttempts}</p>
                </div>
              </div>

              {job.error && (
                <div className="mt-2 p-2 bg-danger/10 border border-danger/20 rounded text-xs text-danger">
                  {job.error}
                </div>
              )}

              {(job.status === 'FAILED' || job.status === 'PENDING' || job.status === 'RETRYING') && (
                <div className="mt-3 flex gap-2">
                  {job.status === 'FAILED' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRetry(job.id);
                      }}
                      className="flex items-center gap-1 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary-light rounded text-xs transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Reintentar
                    </button>
                  )}
                  {(job.status === 'PENDING' || job.status === 'RETRYING') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancel(job.id);
                      }}
                      className="flex items-center gap-1 px-3 py-1 bg-danger/10 hover:bg-danger/20 text-danger rounded text-xs transition-colors"
                    >
                      <XCircle className="w-3 h-3" />
                      Cancelar
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Job Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Detalle del Trabajo</h2>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="text-text-muted hover:text-white"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(selectedJob.status)}
                <span className={`text-sm px-2 py-1 rounded ${getStatusColor(selectedJob.status)}`}>
                  {selectedJob.status}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-text-muted mb-1">ID</p>
                <p className="text-white font-mono text-sm">{selectedJob.id}</p>
              </div>

              <div>
                <p className="text-sm text-text-muted mb-1">Cola</p>
                <p className="text-white">{selectedJob.queue}</p>
              </div>

              <div>
                <p className="text-sm text-text-muted mb-1">Prioridad</p>
                <p className="text-white">{selectedJob.priority}</p>
              </div>

              <div>
                <p className="text-sm text-text-muted mb-1">Datos</p>
                <pre className="bg-bg-elevated p-3 rounded text-xs text-text-secondary overflow-x-auto">
                  {JSON.stringify(selectedJob.data, null, 2)}
                </pre>
              </div>

              {selectedJob.result && (
                <div>
                  <p className="text-sm text-text-muted mb-1">Resultado</p>
                  <pre className="bg-bg-elevated p-3 rounded text-xs text-text-secondary overflow-x-auto">
                    {JSON.stringify(selectedJob.result, null, 2)}
                  </pre>
                </div>
              )}

              {selectedJob.error && (
                <div>
                  <p className="text-sm text-text-muted mb-1">Error</p>
                  <div className="bg-danger/10 border border-danger/20 p-3 rounded text-sm text-danger">
                    {selectedJob.error}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-text-muted mb-1">Creado</p>
                  <p className="text-white">{new Date(selectedJob.createdAt).toLocaleString()}</p>
                </div>
                {selectedJob.processedAt && (
                  <div>
                    <p className="text-text-muted mb-1">Procesado</p>
                    <p className="text-white">{new Date(selectedJob.processedAt).toLocaleString()}</p>
                  </div>
                )}
                {selectedJob.completedAt && (
                  <div>
                    <p className="text-text-muted mb-1">Completado</p>
                    <p className="text-white">{new Date(selectedJob.completedAt).toLocaleString()}</p>
                  </div>
                )}
                {selectedJob.failedAt && (
                  <div>
                    <p className="text-text-muted mb-1">Falló</p>
                    <p className="text-white">{new Date(selectedJob.failedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
