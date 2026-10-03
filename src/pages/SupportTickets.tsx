/**
 * Centro de Soporte — Tickets de usuario (NEXURA 2.0)
 * Rutas: /support/tickets (lista) y /support/tickets/:id (detalle).
 * Seguridad: SupportService valida ownership en el nivel de servicio (anti-IDOR);
 * esta vista solo muestra lo que el servicio autoriza.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  SupportService,
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  supportStatusLabel,
  supportCategoryLabel,
  supportPriorityLabel,
} from '../services/support.service';
import type {
  SupportTicket,
  SupportCategory,
  SupportPriority,
} from '../services/support.service';
import {
  ArrowLeft, Plus, Ticket as TicketIcon, Paperclip, Send, Clock, X,
} from 'lucide-react';

const statusBadge: Record<string, string> = {
  OPEN: 'bg-primary/15 text-primary-hover border-primary/30',
  IN_REVIEW: 'bg-accent/15 text-accent border-accent/30',
  WAITING_USER: 'bg-warning/15 text-warning border-warning/30',
  RESOLVED: 'bg-success/15 text-success border-success/30',
  CLOSED: 'bg-surface-2 text-text-secondary border-border',
};

const priorityBadge: Record<string, string> = {
  LOW: 'text-text-secondary',
  NORMAL: 'text-primary-light',
  HIGH: 'text-danger',
};

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

// ============ NUEVO TICKET MODAL ============
function NewTicketModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (t: SupportTicket) => void;
}) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportCategory>('technical');
  const [priority, setPriority] = useState<SupportPriority>('NORMAL');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState<{ name: string; size: number; mimeType: string; dataUrl: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    // La infraestructura actual persiste localmente: límite conservador 500 KB
    if (file.size > 500 * 1024) {
      addToast('error', 'El archivo supera 500 KB. Adjuntá una captura más liviana.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        dataUrl: String(reader.result || ''),
      });
    };
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const ticket = SupportService.createTicket({
        requesterId: user.id,
        subject,
        category,
        priority,
        description,
        attachment: attachment || undefined,
      });
      addToast('success', `Ticket ${ticket.ticketNumber} creado correctamente.`);
      onCreated(ticket);
    } catch (err: any) {
      const msg = err?.message === 'INVALID_SUBJECT' ? 'El asunto debe tener al menos 3 caracteres.'
        : err?.message === 'INVALID_DESCRIPTION' ? 'La descripción debe tener al menos 10 caracteres.'
        : 'No se pudo crear el ticket. Intentá de nuevo.';
      addToast('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-surface border border-border rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Nuevo ticket de soporte</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <label className="block text-sm text-text-secondary mb-1">Asunto</label>
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          maxLength={120}
          placeholder="Breve descripción del problema"
          className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-text-secondary/60 outline-none focus:border-primary mb-4"
        />

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Categoría</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as SupportCategory)}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary"
            >
              {SUPPORT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Prioridad</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as SupportPriority)}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary"
            >
              {SUPPORT_PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
        </div>

        <label className="block text-sm text-text-secondary mb-1">Descripción</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={5}
          placeholder="Contanos con detalle qué te pasó, cuándo ocurrió y qué esperabas."
          className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-text-secondary/60 outline-none focus:border-primary mb-4 resize-none"
        />

        <div className="mb-4">
          <label className="inline-flex items-center gap-2 px-3 py-2 bg-surface-2 hover:bg-bg-input border border-border rounded-lg text-sm text-text-secondary hover:text-white cursor-pointer transition-colors">
            <Paperclip className="w-4 h-4" />
            Adjuntar captura/archivo (máx. 500 KB)
            <input type="file" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
          </label>
          {attachment && (
            <div className="mt-2 flex items-center gap-2 text-xs text-text-secondary">
              <Paperclip className="w-3 h-3" />
              {attachment.name} ({Math.round(attachment.size / 1024)} KB)
              <button onClick={() => setAttachment(null)} className="text-danger hover:text-error"><X className="w-3 h-3" /></button>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-surface-2 hover:bg-bg-input border border-border text-text-secondary hover:text-white rounded-lg text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {submitting ? 'Creando...' : 'Crear ticket'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ LISTA DE TICKETS ============
export function MyTicketsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion(v => v + 1), []);

  const tickets = useMemo(() => {
    void version;
    if (!user) return [];
    try {
      return SupportService.listForUser(user.id).filter(t => t.userId === user.id);
    } catch {
      return [];
    }
  }, [user, version]);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <TicketIcon className="w-14 h-14 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Iniciá sesión para ver tus tickets</h1>
        <Link to="/login" className="inline-block mt-4 px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm transition-colors">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Mis tickets</h1>
          <p className="text-text-secondary text-sm mt-1">Centro de Soporte · NEXURA</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo ticket
        </button>
      </div>

      {tickets.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-10 text-center">
          <TicketIcon className="w-10 h-10 text-text-secondary mx-auto mb-3" />
          <p className="text-white font-medium mb-1">Todavía no tenés tickets</p>
          <p className="text-text-secondary text-sm mb-4">Creá uno y el equipo de NEXURA te responderá.</p>
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm transition-colors"
          >
            Crear mi primer ticket
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(t => (
            <Link
              key={t.id}
              to={`/support/tickets/${t.id}`}
              className="block bg-surface border border-border hover:border-primary/50 rounded-xl p-4 transition-colors"
            >
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-mono text-xs text-primary-light">{t.ticketNumber}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${statusBadge[t.status]}`}>
                  {supportStatusLabel(t.status)}
                </span>
                <span className={`text-xs ${priorityBadge[t.priority]}`}>
                  Prioridad {supportPriorityLabel(t.priority)}
                </span>
                <span className="ml-auto flex items-center gap-1 text-xs text-text-secondary">
                  <Clock className="w-3 h-3" /> {fmtDate(t.updatedAt)}
                </span>
              </div>
              <p className="text-white font-medium truncate">{t.subject}</p>
              <p className="text-text-secondary text-xs mt-0.5">{supportCategoryLabel(t.category)}</p>
            </Link>
          ))}
        </div>
      )}

      {modalOpen && (
        <NewTicketModal
          onClose={() => setModalOpen(false)}
          onCreated={(t) => { setModalOpen(false); refresh(); navigate(`/support/tickets/${t.id}`); }}
        />
      )}
    </div>
  );
}

// ============ DETALLE DE TICKET ============
export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [version, setVersion] = useState(0);
  const [reply, setReply] = useState('');

  const ticket = useMemo(() => {
    void version;
    if (!user || !id) return null;
    try {
      return SupportService.getTicket(id, user.id);
    } catch {
      return null;
    }
  }, [user, id, version]);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Iniciá sesión para ver este ticket</h1>
        <Link to="/login" className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm transition-colors">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <TicketIcon className="w-12 h-12 text-text-secondary mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Ticket no encontrado</h1>
        <p className="text-text-secondary mb-6">El ticket no existe o no tenés permisos para verlo.</p>
        <Link to="/support/tickets" className="inline-flex items-center gap-2 text-primary-light hover:text-primary-hover text-sm">
          <ArrowLeft className="w-4 h-4" /> Volver a mis tickets
        </Link>
      </div>
    );
  }

  const sendReply = () => {
    const body = reply.trim();
    if (body.length < 2) { addToast('error', 'Escribí un mensaje primero.'); return; }
    try {
      SupportService.userReply({ ticketId: ticket.id, requesterId: user.id, body });
      setReply('');
      setVersion(v => v + 1);
      addToast('success', 'Respuesta enviada.');
    } catch (err: any) {
      addToast('error', err?.message === 'TICKET_CLOSED' ? 'Este ticket está cerrado.' : 'No se pudo enviar la respuesta.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/support/tickets" className="inline-flex items-center gap-2 text-text-secondary hover:text-white text-sm mb-6">
        <ArrowLeft className="w-4 h-4" /> Mis tickets
      </Link>

      <div className="bg-surface border border-border rounded-xl p-5 mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="font-mono text-xs text-primary-light">{ticket.ticketNumber}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${statusBadge[ticket.status]}`}>
            {supportStatusLabel(ticket.status)}
          </span>
          <span className={`text-xs ${priorityBadge[ticket.priority]}`}>
            Prioridad {supportPriorityLabel(ticket.priority)}
          </span>
        </div>
        <h1 className="text-xl font-bold text-white">{ticket.subject}</h1>
        <p className="text-text-secondary text-xs mt-1">{supportCategoryLabel(ticket.category)} · Creado {fmtDate(ticket.createdAt)}</p>
      </div>

      {/* Historial completo de mensajes */}
      <div className="space-y-4 mb-6">
        {ticket.messages.map(m => (
          <div
            key={m.id}
            className={`rounded-xl border p-4 ${
              m.authorRole === 'support'
                ? 'bg-surface-2 border-primary/30'
                : 'bg-surface border-border'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-semibold ${m.authorRole === 'support' ? 'text-primary-light' : 'text-white'}`}>
                {m.authorRole === 'support' ? `🛠 ${m.authorName} (Soporte)` : m.authorName}
              </span>
              <span className="text-xs text-text-secondary ml-auto">{fmtDate(m.createdAt)}</span>
            </div>
            <p className="text-sm text-text-secondary whitespace-pre-wrap">{m.body}</p>
            {m.attachments?.map(a => (
              <a
                key={a.id}
                href={a.dataUrl}
                download={a.name}
                className="inline-flex items-center gap-1.5 mt-2 text-xs text-primary-light hover:text-primary-hover"
              >
                <Paperclip className="w-3 h-3" /> {a.name} ({Math.round(a.size / 1024)} KB)
              </a>
            ))}
          </div>
        ))}
      </div>

      {/* Historial de eventos */}
      <details className="mb-6">
        <summary className="text-sm text-text-secondary hover:text-white cursor-pointer mb-2">Historial del ticket</summary>
        <ul className="space-y-1.5 bg-surface border border-border rounded-xl p-4">
          {ticket.history.map(h => (
            <li key={h.id} className="text-xs text-text-secondary flex gap-2">
              <Clock className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span><b className="text-white">{h.actorName}</b> · {h.details} — {fmtDate(h.createdAt)}</span>
            </li>
          ))}
        </ul>
      </details>

      {/* Responder */}
      {ticket.status !== 'CLOSED' && (
        <div className="bg-surface border border-border rounded-xl p-4">
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            rows={3}
            placeholder="Escribí tu respuesta al equipo de soporte..."
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-text-secondary/60 outline-none focus:border-primary resize-none mb-3"
          />
          <button
            onClick={sendReply}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Send className="w-4 h-4" /> Responder
          </button>
        </div>
      )}
    </div>
  );
}
