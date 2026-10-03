/**
 * SOPORTE TÉCNICO NEXURA 2.0 — Servicio de tickets
 *
 * Almacenamiento: localStorage (mismo patrón que el resto de servicios actuales).
 * Seguridad:
 *  - Los usuarios normales solo pueden leer/actualizar SUS propios tickets (anti-IDOR).
 *  - El acceso administrativo se valida con AuthorizationService.requireModerator()
 *    (MODERATOR/ADMIN/OWNER), reutilizando la lógica de permisos existente.
 *  - Nunca se exponen contraseñas, hashes ni tokens en las respuestas.
 * Notificaciones: integración con NotificationService existente.
 */
import { v4 as uuidv4 } from 'uuid';
import type { UserRole } from '../types';
import { NotificationService } from './notification.service';
import { AuthorizationService } from './authorization.service';
import { getUserById } from './database';

/** Staff de soporte = MODERATOR, ADMIN u OWNER (reutiliza los roles existentes). */
function isSupportStaff(role: UserRole): boolean {
  return role === 'MODERATOR' || role === 'ADMIN' || role === 'OWNER';
}

const TICKETS_KEY = 'nexura_support_tickets';
const COUNTER_KEY = 'nexura_support_ticket_counter';

export type SupportCategory =
  | 'streaming'      // Problemas con transmisiones
  | 'account'        // Cuenta / inicio de sesión
  | 'payments'       // Pagos
  | 'reels'          // Reels
  | 'chat'           // Chat
  | 'report_content' // Denunciar contenido
  | 'technical'      // Error técnico
  | 'other';         // Otro

export type SupportPriority = 'LOW' | 'NORMAL' | 'HIGH';

export type SupportTicketStatus =
  | 'OPEN'            // Abierto
  | 'IN_REVIEW'       // En revisión
  | 'WAITING_USER'    // Esperando respuesta
  | 'RESOLVED'        // Resuelto
  | 'CLOSED';         // Cerrado

export interface SupportAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  dataUrl: string; // Solo si la infraestructura actual lo permite (persistencia local)
}

export interface SupportMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: 'user' | 'support';
  body: string;
  attachments?: SupportAttachment[];
  createdAt: string;
}

export interface SupportTicketEvent {
  id: string;
  actorId: string;
  actorName: string;
  action: 'CREATED' | 'STATUS_CHANGED' | 'PRIORITY_CHANGED' | 'REPLY' | 'ATTACHMENT';
  details: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;               // UUID interno
  ticketNumber: string;     // NX-000001
  userId: string;
  userName: string;         // Snapshot público (displayName)
  userEmail: string;        // Email público del perfil (nunca datos sensibles)
  subject: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportTicketStatus;
  messages: SupportMessage[];
  history: SupportTicketEvent[];
  createdAt: string;
  updatedAt: string;
}

export const SUPPORT_CATEGORIES: { id: SupportCategory; label: string }[] = [
  { id: 'streaming', label: 'Problemas con transmisiones' },
  { id: 'account', label: 'Cuenta / inicio de sesión' },
  { id: 'payments', label: 'Pagos' },
  { id: 'reels', label: 'Reels' },
  { id: 'chat', label: 'Chat' },
  { id: 'report_content', label: 'Denunciar contenido' },
  { id: 'technical', label: 'Error técnico' },
  { id: 'other', label: 'Otro' },
];

export const SUPPORT_PRIORITIES: { id: SupportPriority; label: string }[] = [
  { id: 'LOW', label: 'Baja' },
  { id: 'NORMAL', label: 'Normal' },
  { id: 'HIGH', label: 'Alta' },
];

export const SUPPORT_STATUSES: { id: SupportTicketStatus; label: string }[] = [
  { id: 'OPEN', label: 'Abierto' },
  { id: 'IN_REVIEW', label: 'En revisión' },
  { id: 'WAITING_USER', label: 'Esperando respuesta' },
  { id: 'RESOLVED', label: 'Resuelto' },
  { id: 'CLOSED', label: 'Cerrado' },
];

export function supportStatusLabel(s: SupportTicketStatus): string {
  return SUPPORT_STATUSES.find(x => x.id === s)?.label ?? s;
}
export function supportCategoryLabel(c: SupportCategory): string {
  return SUPPORT_CATEGORIES.find(x => x.id === c)?.label ?? c;
}
export function supportPriorityLabel(p: SupportPriority): string {
  return SUPPORT_PRIORITIES.find(x => x.id === p)?.label ?? p;
}

function getTickets(): SupportTicket[] {
  try {
    const raw = localStorage.getItem(TICKETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setTickets(tickets: SupportTicket[]): void {
  localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
}

function nextTicketNumber(): string {
  const n = parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10) + 1;
  localStorage.setItem(COUNTER_KEY, String(n));
  return `NX-${String(n).padStart(6, '0')}`;
}

export class SupportService {
  /** Un usuario normal solo puede ver sus propios tickets; soporte ve todos. */
  static listForUser(userId: string): SupportTicket[] {
    const user = getUserById(userId);
    if (!user) throw new Error('UNAUTHORIZED');
    const isStaff = isSupportStaff(user.role);
    const tickets = getTickets();
    const visible = isStaff ? tickets : tickets.filter(t => t.userId === userId);
    return visible.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  /** Lectura segura de un ticket: anti-IDOR. */
  static getTicket(ticketId: string, requesterId: string): SupportTicket {
    const user = getUserById(requesterId);
    if (!user) throw new Error('UNAUTHORIZED');
    const ticket = getTickets().find(t => t.id === ticketId || t.ticketNumber === ticketId);
    if (!ticket) throw new Error('TICKET_NOT_FOUND');
    const isStaff = isSupportStaff(user.role);
    if (!isStaff && ticket.userId !== requesterId) {
      throw new Error('FORBIDDEN'); // Un usuario no puede abrir tickets ajenos
    }
    return ticket;
  }

  static createTicket(params: {
    requesterId: string;
    subject: string;
    category: SupportCategory;
    priority: SupportPriority;
    description: string;
    attachment?: { name: string; size: number; mimeType: string; dataUrl: string };
  }): SupportTicket {
    const user = getUserById(params.requesterId);
    if (!user) throw new Error('UNAUTHORIZED');

    const subject = params.subject.trim();
    const description = params.description.trim();
    if (subject.length < 3) throw new Error('INVALID_SUBJECT');
    if (description.length < 10) throw new Error('INVALID_DESCRIPTION');
    if (!SUPPORT_CATEGORIES.some(c => c.id === params.category)) throw new Error('INVALID_CATEGORY');
    if (!SUPPORT_PRIORITIES.some(p => p.id === params.priority)) throw new Error('INVALID_PRIORITY');

    const now = new Date().toISOString();
    const messages: SupportMessage[] = [
      {
        id: uuidv4(),
        authorId: user.id,
        authorName: user.displayName || user.username,
        authorRole: 'user',
        body: description,
        createdAt: now,
      },
    ];

    const attachment: SupportAttachment | undefined = params.attachment
      ? { id: uuidv4(), ...params.attachment }
      : undefined;
    if (attachment) messages[0].attachments = [attachment];

    const ticket: SupportTicket = {
      id: uuidv4(),
      ticketNumber: nextTicketNumber(),
      userId: user.id,
      userName: user.displayName || user.username,
      userEmail: user.email,
      subject,
      category: params.category,
      priority: params.priority,
      status: 'OPEN',
      messages,
      history: [
        {
          id: uuidv4(),
          actorId: user.id,
          actorName: user.displayName || user.username,
          action: 'CREATED',
          details: `Ticket creado (${supportCategoryLabel(params.category)}, ${supportPriorityLabel(params.priority)})`,
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const tickets = getTickets();
    tickets.push(ticket);
    setTickets(tickets);
    return ticket;
  }

  /** Respuesta del usuario dentro de su propio ticket. */
  static userReply(params: { ticketId: string; requesterId: string; body: string }): SupportTicket {
    const ticket = this.getTicket(params.ticketId, params.requesterId); // ya valida ownership
    const user = getUserById(params.requesterId)!;
    const body = params.body.trim();
    if (body.length < 2) throw new Error('INVALID_MESSAGE');
    if (ticket.status === 'CLOSED') throw new Error('TICKET_CLOSED');

    const now = new Date().toISOString();
    ticket.messages.push({
      id: uuidv4(),
      authorId: user.id,
      authorName: user.displayName || user.username,
      authorRole: 'user',
      body,
      createdAt: now,
    });
    ticket.history.push({
      id: uuidv4(),
      actorId: user.id,
      actorName: user.displayName || user.username,
      action: 'REPLY',
      details: 'El usuario respondió el ticket',
      createdAt: now,
    });
    // Si estaba resuelto/esperando soporte, vuelve a abierto para revisión
    if (ticket.status === 'RESOLVED') ticket.status = 'OPEN';
    if (ticket.status === 'OPEN' || ticket.status === 'IN_REVIEW') ticket.status = 'IN_REVIEW';
    ticket.updatedAt = now;

    this.persist(ticket);
    return ticket;
  }

  /** Acciones de staff (MODERATOR+). Valida autorización en el servicio. */
  static staffReply(params: { ticketId: string; staffId: string; body: string }): SupportTicket {
    const staff = getUserById(params.staffId);
    if (!staff) throw new Error('UNAUTHORIZED');
    AuthorizationService.requireModerator(params.staffId);

    const ticket = getTickets().find(t => t.id === params.ticketId || t.ticketNumber === params.ticketId);
    if (!ticket) throw new Error('TICKET_NOT_FOUND');

    const body = params.body.trim();
    if (body.length < 2) throw new Error('INVALID_MESSAGE');

    const now = new Date().toISOString();
    ticket.messages.push({
      id: uuidv4(),
      authorId: staff.id,
      authorName: staff.displayName || staff.username,
      authorRole: 'support',
      body,
      createdAt: now,
    });
    ticket.history.push({
      id: uuidv4(),
      actorId: staff.id,
      actorName: staff.displayName || staff.username,
      action: 'REPLY',
      details: 'Soporte respondió el ticket',
      createdAt: now,
    });
    // Tras responder, el ticket queda esperando la respuesta del usuario
    if (ticket.status === 'OPEN' || ticket.status === 'IN_REVIEW') ticket.status = 'WAITING_USER';
    ticket.updatedAt = now;

    this.persist(ticket);

    // Notificación al usuario vía el sistema existente
    NotificationService.createNotification(
      ticket.userId,
      'SYSTEM',
      `💬 Soporte respondió a tu ticket ${ticket.ticketNumber}`,
      body.slice(0, 140),
      { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, kind: 'support_reply' }
    );
    return ticket;
  }

  static staffChangeStatus(params: {
    ticketId: string;
    staffId: string;
    status: SupportTicketStatus;
  }): SupportTicket {
    const staff = getUserById(params.staffId);
    if (!staff) throw new Error('UNAUTHORIZED');
    AuthorizationService.requireModerator(params.staffId);

    if (!SUPPORT_STATUSES.some(s => s.id === params.status)) throw new Error('INVALID_STATUS');

    const ticket = getTickets().find(t => t.id === params.ticketId || t.ticketNumber === params.ticketId);
    if (!ticket) throw new Error('TICKET_NOT_FOUND');

    if (ticket.status !== params.status) {
      const now = new Date().toISOString();
      const previous = ticket.status;
      ticket.status = params.status;
      ticket.updatedAt = now;
      ticket.history.push({
        id: uuidv4(),
        actorId: staff.id,
        actorName: staff.displayName || staff.username,
        action: 'STATUS_CHANGED',
        details: `Estado: ${supportStatusLabel(previous)} → ${supportStatusLabel(params.status)}`,
        createdAt: now,
      });
      this.persist(ticket);

      NotificationService.createNotification(
        ticket.userId,
        'SYSTEM',
        `🔔 Tu ticket ${ticket.ticketNumber} fue actualizado`,
        `Nuevo estado: ${supportStatusLabel(params.status)}`,
        { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, kind: 'support_status', status: params.status }
      );
    }
    return ticket;
  }

  static staffChangePriority(params: {
    ticketId: string;
    staffId: string;
    priority: SupportPriority;
  }): SupportTicket {
    const staff = getUserById(params.staffId);
    if (!staff) throw new Error('UNAUTHORIZED');
    AuthorizationService.requireModerator(params.staffId);

    if (!SUPPORT_PRIORITIES.some(p => p.id === params.priority)) throw new Error('INVALID_PRIORITY');

    const ticket = getTickets().find(t => t.id === params.ticketId || t.ticketNumber === params.ticketId);
    if (!ticket) throw new Error('TICKET_NOT_FOUND');

    if (ticket.priority !== params.priority) {
      const now = new Date().toISOString();
      const previous = ticket.priority;
      ticket.priority = params.priority;
      ticket.updatedAt = now;
      ticket.history.push({
        id: uuidv4(),
        actorId: staff.id,
        actorName: staff.displayName || staff.username,
        action: 'PRIORITY_CHANGED',
        details: `Prioridad: ${supportPriorityLabel(previous)} → ${supportPriorityLabel(params.priority)}`,
        createdAt: now,
      });
      this.persist(ticket);

      NotificationService.createNotification(
        ticket.userId,
        'SYSTEM',
        `🔔 Tu ticket ${ticket.ticketNumber} fue actualizado`,
        `Nueva prioridad: ${supportPriorityLabel(params.priority)}`,
        { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, kind: 'support_priority' }
      );
    }
    return ticket;
  }

  /** Estadísticas para el panel de Control Center. Solo staff. */
  static getStats(staffId: string): {
    open: number;
    inReview: number;
    waitingUser: number;
    resolved: number;
    total: number;
  } {
    AuthorizationService.requireModerator(staffId);
    const tickets = getTickets();
    return {
      open: tickets.filter(t => t.status === 'OPEN').length,
      inReview: tickets.filter(t => t.status === 'IN_REVIEW').length,
      waitingUser: tickets.filter(t => t.status === 'WAITING_USER').length,
      resolved: tickets.filter(t => t.status === 'RESOLVED').length,
      total: tickets.length,
    };
  }

  private static persist(ticket: SupportTicket): void {
    const tickets = getTickets();
    const idx = tickets.findIndex(t => t.id === ticket.id);
    if (idx !== -1) tickets[idx] = ticket;
    setTickets(tickets);
  }
}
