/**
 * Soporte Técnico — Panel de Control Center (NEXURA 2.0)
 * Ruta: /owner/support (protegida: solo MODERATOR/ADMIN/OWNER, doble validación
 * en vista + SupportService). Permite gestionar tickets de usuarios:
 * buscar, filtrar, responder, cambiar estado/prioridad y ver historial.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  SupportService,
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  supportStatusLabel,
  supportCategoryLabel,
  supportPriorityLabel,
} from '../services/support.service';
import type { SupportTicketStatus, SupportPriority } from '../services/support.service';
import {
  Headphones, Search, Inbox, Clock3, Hourglass, CheckCircle2, ListChecks,
  Send, Paperclip, ArrowLeft, X,
} from 'lucide-react';

const statusBadge: Record<string, string> = {
  OPEN: 'bg-primary/15 text-primary-hover border-primary/30',
  IN_REVIEW: 'bg-accent/15 text-accent border-accent/30',
  WAITING_USER: 'bg-warning/15 text-warning border-warning/30',
  RESOLVED: 'bg-success/15 text-success border-success/30',
  CLOSED: 'bg-surface-2 text-text-secondary border-border',
};

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number; color: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-text-secondary">{label}</p>
        <p className="text-lg font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

// ============ VISTA DE GESTIÓN (Control Center) ============
export function SupportAdminPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion(v => v + 1), []);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SupportTicketStatus>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState('');

  const isStaff = !!user && (user.role === 'MODERATOR' || user.role === 'ADMIN' || user.role === 'OWNER');

  // Validación defensiva: si un usuario normal llegara aquí por URL, el servicio lanza y no expone datos
  const data = useMemo(() => {
    void version;
    if (!user || !isStaff) return null;
    try {
      const all = SupportService.listForUser(user.id);
      const stats = SupportService.getStats(user.id);
      const filtered = all.filter(t => {
        const q = query.trim().toLowerCase();
        if (q && !(
          t.ticketNumber.toLowerCase().includes(q) ||
          t.userName.toLowerCase().includes(q) ||
          (t.userEmail || '').toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q)
        )) return false;
        if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
        if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;
        if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
        return true;
      });
      return { tickets: filtered, stats };
    } catch {
      return null;
    }
  }, [user, isStaff, version, query, statusFilter, categoryFilter, priorityFilter]);

  const selected = useMemo(() => {
    void version;
    if (!user || !isStaff || !selectedId) return null;
    try {
      return SupportService.getTicket(selectedId, user.id);
    } catch {
      return null;
    }
  }, [user, isStaff, selectedId, version]);

  if (!user || !isStaff) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <Headphones className="w-14 h-14 text-danger mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Acceso denegado</h1>
        <p className="text-text-secondary">El panel de Soporte Técnico es exclusivo del equipo autorizado.</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center text-text-secondary">
        No se pudo cargar la bandeja de soporte.
      </div>
    );
  }

  const handleSendReply = () => {
    if (!selected) return;
    const body = reply.trim();
    if (body.length < 2) { addToast('error', 'Escribí una respuesta.'); return; }
    try {
      SupportService.staffReply({ ticketId: selected.id, staffId: user.id, body });
      setReply('');
      refresh();
      addToast('success', 'Respuesta enviada y usuario notificado.');
    } catch {
      addToast('error', 'No se pudo enviar la respuesta.');
    }
  };

  const handleChangeStatus = (status: SupportTicketStatus) => {
    if (!selected) return;
    try {
      SupportService.staffChangeStatus({ ticketId: selected.id, staffId: user.id, status });
      refresh();
      addToast('success', `Estado actualizado a ${supportStatusLabel(status)}.`);
    } catch {
      addToast('error', 'No se pudo cambiar el estado.');
    }
  };

  const handleChangePriority = (priority: SupportPriority) => {
    if (!selected) return;
    try {
      SupportService.staffChangePriority({ ticketId: selected.id, staffId: user.id, priority });
      refresh();
      addToast('success', `Prioridad actualizada a ${supportPriorityLabel(priority)}.`);
    } catch {
      addToast('error', 'No se pudo cambiar la prioridad.');
    }
  };

  return (
    <div className="space-y-6">
      {/* ===== Bandeja completa ===== */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Headphones className="w-5 h-5 text-primary-light" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Soporte Técnico</h2>
            <p className="text-text-secondary text-sm">Gestión de tickets de la plataforma</p>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          <StatCard icon={Inbox} label="Abiertos" value={data.stats.open} color="text-primary-light" />
          <StatCard icon={Clock3} label="En revisión" value={data.stats.inReview} color="text-accent" />
          <StatCard icon={Hourglass} label="Esperando respuesta" value={data.stats.waitingUser} color="text-warning" />
          <StatCard icon={CheckCircle2} label="Resueltos" value={data.stats.resolved} color="text-success" />
          <StatCard icon={ListChecks} label="Total" value={data.stats.total} color="text-white" />
        </div>

        {/* Buscadores y filtros */}
        <div className="bg-surface border border-border rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex items-center bg-surface-2 border border-border rounded-lg px-3 py-1.5">
            <Search className="w-4 h-4 text-text-secondary mr-2" />
            <input
              type="text"
              placeholder="Buscar por NX-000001 o usuario..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="bg-transparent text-sm text-white placeholder-text-secondary/60 outline-none w-full"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-primary">
            <option value="ALL">Todos los estados</option>
            {SUPPORT_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-primary">
            <option value="ALL">Todas las categorías</option>
            {SUPPORT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
            className="bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-primary">
            <option value="ALL">Todas las prioridades</option>
            {SUPPORT_PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>

        {/* Lista */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {data.tickets.length === 0 ? (
            <p className="p-8 text-center text-text-secondary text-sm">No hay tickets con estos filtros.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.tickets.map(t => (
                <li key={t.id}>
                  <button
                    onClick={() => { setSelectedId(t.id); setReply(''); }}
                    className="w-full text-left px-4 py-3 hover:bg-surface-2 transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-primary-light">{t.ticketNumber}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${statusBadge[t.status]}`}>
                        {supportStatusLabel(t.status)}
                      </span>
                      <span className="text-xs text-text-secondary">{supportPriorityLabel(t.priority)}</span>
                      <span className="ml-auto text-xs text-text-secondary">{fmtDate(t.updatedAt)}</span>
                    </div>
                    <p className="text-sm text-white mt-1 truncate">{t.subject}</p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {t.userName} · {supportCategoryLabel(t.category)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ===== Drawer de detalle ===== */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-end" onClick={() => setSelectedId(null)}>
          <div
            className="w-full max-w-2xl h-full bg-bg overflow-y-auto border-l border-border p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-primary-light">{selected.ticketNumber}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${statusBadge[selected.status]}`}>
                    {supportStatusLabel(selected.status)}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">{selected.subject}</h3>
                <p className="text-xs text-text-secondary mt-1">
                  {supportCategoryLabel(selected.category)} · Prioridad {supportPriorityLabel(selected.priority)}
                </p>
                {/* Información básica necesaria del usuario (sin datos sensibles) */}
                <p className="text-xs text-text-secondary mt-1">
                  Usuario: <b className="text-white">{selected.userName}</b> · {selected.userEmail}
                </p>
              </div>
              <button onClick={() => setSelectedId(null)} className="text-text-secondary hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cambiar estado / prioridad */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Cambiar estado</label>
                <select
                  value={selected.status}
                  onChange={e => handleChangeStatus(e.target.value as SupportTicketStatus)}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary"
                >
                  {SUPPORT_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Cambiar prioridad</label>
                <select
                  value={selected.priority}
                  onChange={e => handleChangePriority(e.target.value as SupportPriority)}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary"
                >
                  {SUPPORT_PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            </div>

            {/* Conversación */}
            <div className="space-y-3 mb-4">
              {selected.messages.map(m => (
                <div
                  key={m.id}
                  className={`rounded-xl border p-3 ${
                    m.authorRole === 'support' ? 'bg-surface-2 border-primary/30' : 'bg-surface border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold ${m.authorRole === 'support' ? 'text-primary-light' : 'text-white'}`}>
                      {m.authorRole === 'support' ? `🛠 ${m.authorName} (Soporte)` : `👤 ${m.authorName}`}
                    </span>
                    <span className="text-xs text-text-secondary ml-auto">{fmtDate(m.createdAt)}</span>
                  </div>
                  <p className="text-sm text-text-secondary whitespace-pre-wrap">{m.body}</p>
                  {m.attachments?.map(a => (
                    <a key={a.id} href={a.dataUrl} download={a.name}
                      className="inline-flex items-center gap-1.5 mt-2 text-xs text-primary-light hover:text-primary-hover">
                      <Paperclip className="w-3 h-3" /> {a.name} ({Math.round(a.size / 1024)} KB)
                    </a>
                  ))}
                </div>
              ))}
            </div>

            {/* Historial */}
            <details className="mb-4">
              <summary className="text-xs text-text-secondary hover:text-white cursor-pointer mb-2">
                Historial del ticket
              </summary>
              <ul className="space-y-1.5 bg-surface border border-border rounded-xl p-3">
                {selected.history.map(h => (
                  <li key={h.id} className="text-xs text-text-secondary flex gap-2">
                    <Clock3 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span><b className="text-white">{h.actorName}</b> · {h.details} — {fmtDate(h.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </details>

            {/* Responder */}
            <div className="bg-surface border border-border rounded-xl p-4">
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                rows={3}
                placeholder="Respuesta del equipo de soporte..."
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-text-secondary/60 outline-none focus:border-primary resize-none mb-3"
              />
              <button
                onClick={handleSendReply}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Send className="w-4 h-4" /> Responder y notificar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Enlace rápido desde páginas públicas al Centro de Soporte
export function SupportTicketsLink() {
  return (
    <Link
      to="/support/tickets"
      className="inline-flex items-center gap-2 text-sm text-primary-light hover:text-primary-hover"
    >
      <ArrowLeft className="w-4 h-4 rotate-180" /> Ver mis tickets
    </Link>
  );
}
