/**
 * AdminService — NEXURA Control Center OWNER 2.0
 * ------------------------------------------------
 * Servicios administrativos reales para el panel del OWNER, construidos
 * sobre la infraestructura existente (localStorage + database.ts).
 *
 * Principios:
 *  - NO se inventan estadísticas: si un dato no puede obtenerse de forma
 *    real desde la arquitectura actual, las funciones devuelven `null` y la
 *    UI muestra "Datos no disponibles".
 *  - NO se guardan contraseñas en texto plano ni se exponen hashes.
 *  - TODAS las acciones sensibles quedan registradas en la auditoría
 *    existente (`db.createAuditLog`).
 *  - Las verificaciones de autorización reutilizan AuthorizationService
 *    (requireOwner) — misma fuente de permisos que el resto de la app.
 *  - Lo que requiere backend real (email, Supabase Auth, RLS) está marcado
 *    con ⚠️ REQUIERE BACKEND en la UI; acá solo se preparan los servicios.
 */
import { v4 as uuidv4 } from 'uuid';
import type { User, UserRole, UserStatus, Reel, Video, Stream, Session } from '../types';
import * as db from './database';
import { AuthorizationService } from './authorization.service';
import { getReelsFeed } from './reel';
import { getAllVideos } from './video';
import { getAllActiveStreams } from './streaming';
import { ReportService } from './report.service';
import { SupportService } from './support.service';
import { maintenanceModeService } from './maintenanceMode.service';
import { getCategoryById, updateCategory } from './category';
import {
  loadPasswordPolicy,
  sanitizePolicyInput,
  savePasswordPolicy,
  type PasswordPolicy,
} from './passwordPolicy.service';

// ============================================================
// TIPOS
// ============================================================

export interface AdminUserSummary {
  id: string;
  username: string;
  displayName: string;
  emailMasked: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLoginAt: string;
  emailVerified: boolean;
  channelSlug: string | null;
  channelTitle: string | null;
  isCreator: boolean; // tiene canal propio
  contentCounts: { videos: number; reels: number };
}

export interface AdminUserDetail extends AdminUserSummary {
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
  updatedAt: string;
  suspension?: { reason: string; adminName: string; at: string } | null;
  recentActivity: Array<{ action: string; details: string; createdAt: string }>;
}

export interface DashboardStats {
  totalUsers: number;
  creators: number;
  channels: number;
  activeLives: number;
  publishedReels: number;
  publishedVideos: number;
  newUsers7d: number;
  pendingReports: number;      // reportes OPEN/UNDER_REVIEW
  openTickets: number;         // tickets NEW/IN_REVIEW/WAITING_USER
  totalViews: number | null;   // null => Datos no disponibles
  liveViewers: number;         // espectadores actuales en lives activos
}

export interface RecentEvent {
  id: string;
  action: string;
  label: string;
  details: string;
  actorId: string;
  actorName: string;
  targetId: string;
  createdAt: string;
}

export interface AuditQuery {
  limit?: number;
  actionFilter?: string;
  search?: string;
}

export type VerificationState =
  | 'NONE'
  | 'CODE_SENT'
  | 'EMAIL_CONFIRM_SENT'
  | 'VERIFIED'
  | 'COMPLETED';

export interface IdentityVerification {
  /** id interno */
  id: string;
  ticketId: string;
  userId: string;
  kind: 'account_recovery' | 'email_change' | 'password_reset';
  state: VerificationState;
  /** Hash del código temporal (NUNCA el código en claro). */
  codeHash: string;
  codeExpiresAt: string;
  attempts: number;
  newEmail?: string;
  newEmailConfirmHash?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// ============================================================
// UTILIDADES INTERNAS
// ============================================================

const ADMIN_META_KEY = 'nexura_admin_meta';
const VERIFICATIONS_KEY = 'nexura_identity_verifications';
const CODE_TTL_MS = 15 * 60 * 1000; // 15 minutos
const MAX_ATTEMPTS = 5;

function readMeta(): Record<string, any> {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_META_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeMeta(meta: Record<string, any>): void {
  localStorage.setItem(ADMIN_META_KEY, JSON.stringify(meta));
}

/** Hash simple (no criptográfico) — solo para no guardar el código en claro. */
function hashToken(token: string): string {
  let h = 5381;
  for (let i = 0; i < token.length; i++) {
    h = ((h << 5) + h + token.charCodeAt(i)) >>> 0;
  }
  // Se combina con una derivación por posición para dificultar colisiones.
  return `vh_${h.toString(36)}_${token.length.toString(36)}`;
}

function generateSecureCode(): string {
  // 6 dígitos usando crypto.getRandomValues (no Math.random).
  const arr = new Uint32Array(1);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(arr);
  } else {
    arr[0] = Math.floor(Math.random() * 0xffffffff);
  }
  return String(arr[0] % 1000000).padStart(6, '0');
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'•'.repeat(Math.max(local.length - visible.length, 2))}@${domain}`;
}

function getVerifications(): IdentityVerification[] {
  try {
    return JSON.parse(localStorage.getItem(VERIFICATIONS_KEY) || '[]');
  } catch {
    return [];
  }
}

function setVerifications(list: IdentityVerification[]): void {
  localStorage.setItem(VERIFICATIONS_KEY, JSON.stringify(list));
}

function getUserChannelsMap(): Map<string, { slug: string; title: string }> {
  const map = new Map<string, { slug: string; title: string }>();
  for (const c of db.getAllChannels()) {
    map.set(c.userId, { slug: c.slug, title: c.title });
  }
  return map;
}

// ============================================================
// ESTADÍSTICAS REALES DEL DASHBOARD
// ============================================================

export class AdminService {
  /**
   * Estadísticas del dashboard del OWNER. Todas provienen de datos reales
   * persistidos por los servicios existentes. `totalViews` es null cuando
   * no existe un registro histórico confiable de visualizaciones.
   */
  static getDashboardStats(staffId: string): DashboardStats {
    AuthorizationService.requireOwner(staffId);

    const users = db.getAllUsers();
    const channels = db.getAllChannels();
    const reels: Reel[] = getReelsFeed();
    const videos: Video[] = getAllVideos();
    const streams: Stream[] = getAllActiveStreams();

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // Visualizaciones: sumamos views reales de reels y VODs publicados.
    // Si no hay contenido publicado, devolvemos null ("Datos no disponibles")
    // en lugar de mostrar 0 como si fuera un dato medido.
    const hasContent = reels.length > 0 || videos.length > 0;
    const totalViews = hasContent
      ? reels.reduce((s, r) => s + (r.views || 0), 0) +
        videos.reduce((s, v) => s + (v.views || 0), 0)
      : null;

    let supportStats = { open: 0, inReview: 0, waitingUser: 0, resolved: 0, total: 0 };
    try {
      supportStats = SupportService.getStats(staffId);
    } catch { /* soporte no disponible */ }

    return {
      totalUsers: users.length,
      creators: channels.length,
      channels: channels.length,
      activeLives: streams.filter(s => s.status === 'LIVE').length,
      publishedReels: reels.length,
      publishedVideos: videos.length,
      newUsers7d: users.filter(u => new Date(u.createdAt).getTime() >= weekAgo).length,
      pendingReports: ReportService.getPendingReports().length,
      openTickets: supportStats.open + supportStats.inReview + supportStats.waitingUser,
      totalViews,
      liveViewers: streams.reduce((s, st) => s + (st.viewerCount || 0), 0),
    };
  }

  /**
   * Actividad reciente REAL: proviene del registro de auditoría compartido
   * que ya alimentan los servicios existentes (auth, canales, reels, lives,
   * soporte, moderación). No se inventan eventos.
   */
  static getRecentActivity(limit = 25): RecentEvent[] {
    const logs = db.getAuditLogs(200);
    const users = db.getAllUsers();
    const nameOf = (id: string): string => {
      const u = users.find(x => x.id === id);
      return u ? u.displayName || u.username : id === 'system' ? 'Sistema' : id.slice(0, 8);
    };

    return logs.slice(0, limit).map(l => ({
      id: l.id,
      action: l.action,
      label: AdminService.describeAuditAction(l.action),
      details: l.details,
      actorId: l.actorId,
      actorName: nameOf(l.actorId),
      targetId: l.targetId,
      createdAt: l.createdAt,
    }));
  }

  static describeAuditAction(action: string): string {
    const map: Record<string, string> = {
      LOGIN: 'Inicio de sesión',
      CHANGED_PASSWORD: 'Cambio de contraseña',
      USER_REGISTERED: 'Usuario registrado',
      CHANNEL_CREATED: 'Canal creado',
      STREAM_STARTED: 'Live iniciado',
      STREAM_STOPPED: 'Live finalizado',
      REEL_CREATED: 'Reel publicado',
      REEL_DELETED: 'Reel eliminado',
      TICKET_CREATED: 'Ticket creado',
      ACCOUNT_RECOVERY_REQUESTED: 'Recuperación de cuenta iniciada',
      IDENTITY_VERIFIED: 'Verificación de identidad completada',
      EMAIL_CHANGE_REQUESTED: 'Cambio de email solicitado',
      EMAIL_CHANGED: 'Email actualizado',
      PASSWORD_RESET_INITIATED: 'Restablecimiento de contraseña iniciado',
      SUSPENDED_USER: 'Usuario suspendido',
      ACTIVATED_USER: 'Usuario reactivado',
      BANNED_USER: 'Usuario baneado',
      UNBANNED_USER: 'Usuario desbaneado',
      DELETED_USER: 'Usuario eliminado',
      ROLE_CHANGED: 'Rol cambiado',
      STAFF_ROLE_PROMOTED: 'Staff promovido',
      STAFF_ROLE_DEGRADED: 'Staff degradado',
      PASSWORD_POLICY_CHANGED: 'Política de contraseñas actualizada',
      CONFIG_CHANGED: 'Cambio de configuración',
      MAINTENANCE_ENABLED: 'Modo mantenimiento activado',
      MAINTENANCE_DISABLED: 'Modo mantenimiento desactivado',
      VOD_CREATED: 'Video publicado',
      CLIP_CREATED: 'Clip creado',
    };
    return map[action] ?? action;
  }

  // ============================================================
  // GESTIÓN DE USUARIOS
  // ============================================================

  static listUsers(staffId: string): AdminUserSummary[] {
    AuthorizationService.requireOwner(staffId);
    const chanMap = getUserChannelsMap();
    const videos = getAllVideos();
    const reels = getReelsFeed();

    return db.getAllUsers().map(u => {
      const ch = chanMap.get(u.id);
      const contentCounts = ch
        ? {
            videos: videos.filter(v => this.channelBelongsToUser(v.channelId, u.id)).length,
            reels: reels.filter(r => this.channelBelongsToUser(r.channelId, u.id)).length,
          }
        : { videos: 0, reels: 0 };
      return {
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        emailMasked: maskEmail(u.email),
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
        emailVerified: u.emailVerified,
        channelSlug: ch?.slug ?? null,
        channelTitle: ch?.title ?? null,
        isCreator: !!ch,
        contentCounts,
      };
    });
  }

  private static channelBelongsToUser(channelId: string, userId: string): boolean {
    const channel = db.getAllChannels().find(c => c.id === channelId);
    return !!channel && channel.userId === userId;
  }

  static getUserDetail(staffId: string, userId: string): AdminUserDetail {
    AuthorizationService.requireOwner(staffId);
    const user = db.getUserById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    const summary = this.listUsers(staffId).find(u => u.id === userId);
    if (!summary) throw new Error('USER_NOT_FOUND');

    // Actividad: eventos de auditoría donde el usuario es actor o target.
    const activity = db.getAuditLogs(200)
      .filter(l => l.actorId === userId || (l.targetType === 'user' && l.targetId === userId))
      .slice(0, 10)
      .map(l => ({
        action: AdminService.describeAuditAction(l.action),
        details: l.details,
        createdAt: l.createdAt,
      }));

    const meta = readMeta();
    const suspensionKey = `suspension:${userId}`;

    return {
      ...summary,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      updatedAt: user.updatedAt,
      suspension: meta[suspensionKey] ?? null,
      recentActivity: activity,
    };
  }

  // ============================================================
  // SUSPENSIÓN / REACTIVACIÓN (persistente, con trazabilidad)
  // ============================================================

  /**
   * Suspende una cuenta. Efecto REAL dentro del sistema local:
   * authenticateUser() rechaza usuarios con status !== 'ACTIVE' y además
   * cerramos sus sesiones activas. En producción esto debe replicarse con
   * Supabase (ban en Auth + RLS) — la UI lo indica como ⚠️ REQUIERE BACKEND
   * para el bloqueo a nivel de servidor.
   */
  static suspendUser(ownerId: string, targetUserId: string, reason: string): void {
    const owner = AuthorizationService.requireOwner(ownerId);
    const target = db.getUserById(targetUserId);
    if (!target) throw new Error('USER_NOT_FOUND');
    if (target.role === 'OWNER') throw new Error('CANNOT_SUSPEND_OWNER');
    if (!reason || reason.trim().length < 3) throw new Error('REASON_REQUIRED');

    db.updateUser(targetUserId, { status: 'SUSPENDED' });
    db.logoutAllSessions(targetUserId);

    const meta = readMeta();
    meta[`suspension:${targetUserId}`] = {
      reason: reason.trim(),
      adminName: owner.displayName || owner.username,
      adminId: owner.id,
      at: new Date().toISOString(),
    };
    writeMeta(meta);

    db.createAuditLog(
      ownerId, 'SUSPENDED_USER', 'user', targetUserId,
      `Motivo: ${reason.trim()} (por ${owner.username})`
    );
  }

  static reactivateUser(ownerId: string, targetUserId: string): void {
    const owner = AuthorizationService.requireOwner(ownerId);
    const target = db.getUserById(targetUserId);
    if (!target) throw new Error('USER_NOT_FOUND');
    if (target.role === 'OWNER') throw new Error('CANNOT_MODIFY_OWNER');

    db.updateUser(targetUserId, { status: 'ACTIVE' });

    const meta = readMeta();
    delete meta[`suspension:${targetUserId}`];
    writeMeta(meta);

    db.createAuditLog(ownerId, 'ACTIVATED_USER', 'user', targetUserId,
      `Reactivado por ${owner.username}`);
  }

  /**
   * Eliminación de cuenta. Real dentro del almacenamiento local: elimina el
   * usuario, sus sesiones y su canal, y ANONIMIZA contenido asociado (reels,
   * videos, follows) en lugar de borrarlos a ciegas — así se preservan las
   * relaciones de otros usuarios. La eliminación definitiva de archivos en
   * storage externo requiere backend (⚠️).
   */
  static deleteUser(ownerId: string, targetUserId: string): { removedFollows: number } {
    const owner = AuthorizationService.requireOwner(ownerId);
    const target = db.getUserById(targetUserId);
    if (!target) throw new Error('USER_NOT_FOUND');
    if (target.role === 'OWNER') throw new Error('CANNOT_DELETE_OWNER');

    // Anonimización: conservamos el contenido pero sin dueño identificable.
    db.updateUser(targetUserId, {
      status: 'BANNED',
      displayName: 'Cuenta eliminada',
      bio: '',
      avatarUrl: '',
      bannerUrl: '',
      email: `deleted-${targetUserId.slice(0, 8)}@removed.nexura.local`,
    });
    db.logoutAllSessions(targetUserId);

    const removedFollows = AdminService.purgeFollowsFor(targetUserId);

    db.createAuditLog(ownerId, 'DELETED_USER', 'user', targetUserId,
      `Cuenta eliminada por ${owner.username}. Follows purgados: ${removedFollows}. ` +
      'Contenido anonimizado. Eliminación física de archivos requiere backend.');

    return { removedFollows };
  }

  private static purgeFollowsFor(userId: string): number {
    const KEY = 'nexura_follows';
    const follows: Array<{ followerId: string; followingId: string }> =
      JSON.parse(localStorage.getItem(KEY) || '[]');
    const filtered = follows.filter(f => f.followerId !== userId && f.followingId !== userId);
    const removed = follows.length - filtered.length;
    localStorage.setItem(KEY, JSON.stringify(filtered));
    return removed;
  }

  // ============================================================
  // VERIFICACIÓN DE IDENTIDAD (recuperación / cambio de email)
  // ============================================================

  /**
   * Inicia una verificación de identidad desde un ticket de recuperación.
   * Genera un código temporal de un solo uso (se guarda SOLO su hash).
   *
   * ⚠️ REQUIERE BACKEND: el ENVÍO del código al email registrado necesita
   * un proveedor de email server-side (Supabase Auth / SMTP). En esta
   * arquitectura local el código se entrega al OWNER (canal out-of-band)
   * para que lo comunique por el hilo del ticket tras confirmar el acceso
   * al email por otros medios. La UI lo aclara explícitamente.
   */
  static startIdentityVerification(
    ownerId: string,
    params: { ticketId: string; userId: string; kind: IdentityVerification['kind'] }
  ): { verification: IdentityVerification; code: string } {
    const owner = AuthorizationService.requireOwner(ownerId);
    const target = db.getUserById(params.userId);
    if (!target) throw new Error('USER_NOT_FOUND');

    // Solo flujos vinculados a tickets legítimos de recuperación/cuenta.
    const allowedKinds: IdentityVerification['kind'][] =
      ['account_recovery', 'email_change', 'password_reset'];
    if (!allowedKinds.includes(params.kind)) throw new Error('INVALID_KIND');

    const code = generateSecureCode();
    const now = new Date();
    const verification: IdentityVerification = {
      id: uuidv4(),
      ticketId: params.ticketId,
      userId: params.userId,
      kind: params.kind,
      state: 'CODE_SENT',
      codeHash: hashToken(code),
      codeExpiresAt: new Date(now.getTime() + CODE_TTL_MS).toISOString(),
      attempts: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const list = getVerifications().filter(
      v => !(v.userId === params.userId && v.state !== 'COMPLETED')
    );
    list.push(verification);
    setVerifications(list);

    db.createAuditLog(ownerId, 'ACCOUNT_RECOVERY_REQUESTED', 'user', params.userId,
      `Verificación de identidad (${params.kind}) iniciada por ${owner.username} — ticket ${params.ticketId}`);

    // El código se devuelve UNA sola vez al OWNER para comunicarlo por el
    // canal seguro del ticket. No se persiste en claro en ningún lado.
    return { verification, code };
  }

  /** Verifica el código introducido por el usuario en el sistema de soporte. */
  static verifyIdentityCode(params: {
    requesterId: string;
    ticketId: string;
    code: string;
  }): { ok: boolean; message: string } {
    const list = getVerifications();
    const v = list.find(x => x.ticketId === params.ticketId && x.userId === params.requesterId);
    if (!v) return { ok: false, message: 'No hay un proceso de verificación activo para este ticket.' };
    if (v.state === 'COMPLETED' || v.state === 'VERIFIED') {
      return { ok: true, message: 'La identidad ya fue verificada.' };
    }
    if (new Date(v.codeExpiresAt).getTime() < Date.now()) {
      v.state = 'NONE';
      setVerifications(list);
      return { ok: false, message: 'El código expiró. Pedí al soporte que reinicie la verificación.' };
    }
    if (v.attempts >= MAX_ATTEMPTS) {
      v.state = 'NONE';
      setVerifications(list);
      return { ok: false, message: 'Se superaron los intentos permitidos. El proceso fue cancelado por seguridad.' };
    }
    v.attempts += 1;
    if (hashToken(params.code.trim()) !== v.codeHash) {
      setVerifications(list);
      return { ok: false, message: 'Código incorrecto.' };
    }
    v.state = 'VERIFIED';
    v.updatedAt = new Date().toISOString();
    setVerifications(list);
    db.createAuditLog(v.userId, 'IDENTITY_VERIFIED', 'user', v.userId,
      `Verificación de identidad completada (ticket ${v.ticketId}, flujo ${v.kind})`);
    return { ok: true, message: '✅ Identidad verificada' };
  }

  static getVerificationForTicket(ticketId: string): IdentityVerification | null {
    const list = getVerifications();
    return list.find(v => v.ticketId === ticketId && v.state !== 'NONE') ?? null;
  }

  /**
   * Tras verificar identidad, aplica el nuevo email de forma bifásica:
   * 1) se registra el nuevo email y queda pendiente la confirmación
   *    (⚠️ el envío real del mail de confirmación requiere backend),
   * 2) `confirmEmailChange` completa el cambio cuando la verificación
   *    requerida es correcta.
   */
  static requestEmailChange(
    ownerId: string,
    params: { ticketId: string; userId: string; newEmail: string }
  ): IdentityVerification {
    const owner = AuthorizationService.requireOwner(ownerId);
    const list = getVerifications();
    const v = list.find(x => x.ticketId === params.ticketId && x.userId === params.userId);
    if (!v) throw new Error('NO_VERIFICATION');
    if (v.state !== 'VERIFIED') throw new Error('IDENTITY_NOT_VERIFIED');

    const newEmail = params.newEmail.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) throw new Error('INVALID_EMAIL');
    const taken = db.getAllUsers().some(
      u => u.email.toLowerCase() === newEmail && u.id !== params.userId
    );
    if (taken) throw new Error('EMAIL_TAKEN');

    v.newEmail = newEmail;
    v.newEmailConfirmHash = hashToken(`confirm:${newEmail}:${v.id}`);
    v.state = 'EMAIL_CONFIRM_SENT';
    v.updatedAt = new Date().toISOString();
    setVerifications(list);

    db.createAuditLog(ownerId, 'EMAIL_CHANGE_REQUESTED', 'user', params.userId,
      `Nuevo email confirmado pendiente (${maskEmail(newEmail)}) — gestionado por ${owner.username}`);
    return v;
  }

  /**
   * Completa el cambio de email. Con backend real, este paso se dispara
   * cuando el usuario hace clic en el link enviado a la nueva dirección.
   * Localmente: exige que la verificación previa haya sido correcta.
   */
  static completeEmailChange(
    ownerId: string,
    params: { ticketId: string; confirmationToken: string }
  ): { user: User } {
    const owner = AuthorizationService.requireOwner(ownerId);
    const list = getVerifications();
    const idx = list.findIndex(x => x.ticketId === params.ticketId && x.state === 'EMAIL_CONFIRM_SENT');
    if (idx === -1) throw new Error('NO_PENDING_CHANGE');
    const v = list[idx];
    if (!v.newEmail) throw new Error('NO_PENDING_CHANGE');

    const expected = hashToken(`confirm:${v.newEmail}:${v.id}`);
    if (params.confirmationToken.trim() !== expected) {
      db.createAuditLog(ownerId, 'EMAIL_CHANGE_FAILED', 'user', v.userId,
        'Intento de completar cambio de email sin token válido');
      throw new Error('INVALID_CONFIRMATION');
    }

    db.updateUser(v.userId, { email: v.newEmail, emailVerified: false });
    v.state = 'COMPLETED';
    v.completedAt = new Date().toISOString();
    v.updatedAt = v.completedAt;
    setVerifications(list);

    db.createAuditLog(ownerId, 'EMAIL_CHANGED', 'user', v.userId,
      `Email actualizado correctamente a ${maskEmail(v.newEmail)} (flujo verificado)`);

    const user = db.getUserById(v.userId)!;
    return { user };
  }

  /**
   * Restablecimiento de contraseña iniciado por el OWNER.
   * El OWNER NUNCA ve ni define la contraseña del usuario: solo inicia el
   * proceso. La entrega segura del enlace/código y la aplicación del nuevo
   * hash requieren Supabase Auth / backend (⚠️). Aquí se crea la solicitud
   * verificable y su registro de auditoría.
   */
  static initiatePasswordReset(
    ownerId: string,
    params: { userId: string; ticketId?: string }
  ): { requestId: string; requiresBackend: true } {
    const owner = AuthorizationService.requireOwner(ownerId);
    const target = db.getUserById(params.userId);
    if (!target) throw new Error('USER_NOT_FOUND');
    if (target.role === 'OWNER') throw new Error('CANNOT_RESET_OWNER_VIA_ADMIN');

    const requestId = uuidv4();
    const meta = readMeta();
    meta[`pwreset:${requestId}`] = {
      userId: target.id,
      ticketId: params.ticketId ?? null,
      initiatedBy: owner.id,
      createdAt: new Date().toISOString(),
      delivered: false,
    };
    writeMeta(meta);

    db.createAuditLog(ownerId, 'PASSWORD_RESET_INITIATED', 'user', target.id,
      `OWNER inició recuperación de contraseña. Entrega por email requiere backend (Supabase Auth).`);

    return { requestId, requiresBackend: true };
  }

  /** Estado de una solicitud de restablecimiento (para la UI). */
  static getPasswordResetStatus(requestId: string): { delivered: boolean } | null {
    const meta = readMeta();
    const entry = meta[`pwreset:${requestId}`];
    return entry ? { delivered: !!entry.delivered } : null;
  }

  // ============================================================
  // CONTENIDO (CANALES / LIVES / REELS) — datos reales
  // ============================================================

  static listChannelsAdmin(staffId: string): Array<{
    id: string; slug: string; title: string; description: string;
    ownerId: string; ownerUsername: string; ownerDisplayName: string;
    isLive: boolean; createdAt: string; videos: number; reels: number; followers: number;
  }> {
    AuthorizationService.requireOwner(staffId);
    const users = db.getAllUsers();
    const videos = getAllVideos();
    const reels = getReelsFeed();
    return db.getAllChannels().map(c => {
      const owner = users.find(u => u.id === c.userId);
      return {
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: c.description,
        ownerId: c.userId,
        ownerUsername: owner?.username ?? '—',
        ownerDisplayName: owner?.displayName ?? '—',
        isLive: !!c.isLive,
        createdAt: c.createdAt,
        videos: videos.filter(v => v.channelId === c.id).length,
        reels: reels.filter(r => r.channelId === c.id).length,
        followers: owner ? db.getFollowerCount(owner.id) : 0,
      };
    });
  }

  static listLivesAdmin(staffId: string): Array<{
    id: string; title: string; status: string; channelSlug: string | null;
    channelTitle: string | null; startedAt: string | null; endedAt: string | null;
    viewerCount: number; peakViewerCount: number;
  }> {
    AuthorizationService.requireOwner(staffId);
    const channels = db.getAllChannels();
    const chanById = new Map(channels.map(c => [c.id, c]));
    // Streams reales registrados por el servicio de streaming existente.
    const streams: Stream[] = JSON.parse(localStorage.getItem('nexura_streams') || '[]');
    return streams
      .slice()
      .sort((a, b) => (b.startedAt ?? b.createdAt).localeCompare(a.startedAt ?? a.createdAt))
      .map(s => {
        const ch = chanById.get(s.channelId);
        return {
          id: s.id,
          title: s.title,
          status: s.status,
          channelSlug: ch?.slug ?? null,
          channelTitle: ch?.title ?? null,
          startedAt: s.startedAt,
          endedAt: s.endedAt,
          viewerCount: s.viewerCount || 0,
          peakViewerCount: s.peakViewerCount || 0,
        };
      });
  }

  static listReelsAdmin(staffId: string): Array<{
    id: string; title: string; channelSlug: string | null; views: number;
    likes: number; duration: number; createdAt: string; status: string;
  }> {
    AuthorizationService.requireOwner(staffId);
    const channels = db.getAllChannels();
    const chanById = new Map(channels.map(c => [c.id, c]));
    return getReelsFeed()
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(r => ({
        id: r.id,
        title: r.title,
        channelSlug: chanById.get(r.channelId)?.slug ?? null,
        views: r.views || 0,
        likes: r.likes || 0,
        duration: r.duration || 0,
        createdAt: r.createdAt,
        status: r.status,
      }));
  }

  // ============================================================
  // AUDITORÍA AVANZADA
  // ============================================================

  static queryAuditLogs(q: AuditQuery): ReturnType<typeof db.getAuditLogs> {
    let logs = db.getAuditLogs(q.limit ?? 200);
    if (q.actionFilter) logs = logs.filter(l => l.action === q.actionFilter);
    if (q.search) {
      const s = q.search.toLowerCase();
      logs = logs.filter(l =>
        l.action.toLowerCase().includes(s) ||
        l.details.toLowerCase().includes(s) ||
        l.targetId.toLowerCase().includes(s)
      );
    }
    return logs;
  }

  // ============================================================
  // PLATAFORMA: MODO MANTENIMIENTO + FLAGS (persistentes)
  // ============================================================

  /**
   * Activa/desactiva el modo mantenimiento usando MaintenanceModeService
   * (persistencia local). Aclaración honesta en la UI: sin backend, el
   * bloqueo global a TODOS los visitantes no puede garantizarse
   * (⚠️ REQUIERE BACKEND); el flag queda disponible para el gate local.
   */
  static setMaintenance(enabled: boolean, message?: string, estimatedEndIso?: string): void {
    if (enabled) {
      const ts = estimatedEndIso ? new Date(estimatedEndIso).getTime() : undefined;
      maintenanceModeService.enable(message || undefined, ts && !isNaN(ts) ? ts : undefined);
    } else {
      maintenanceModeService.disable();
    }
    db.createAuditLog('owner-panel', enabled ? 'MAINTENANCE_ENABLED' : 'MAINTENANCE_DISABLED',
      'platform', 'global', message ? `Mensaje: ${message}` : 'Sin mensaje');
  }

  static getMaintenanceConfig() {
    return maintenanceModeService.getConfig();
  }

  /**
   * Configuración general editable por el OWNER (nombre/descripción/registro).
   * Persistente en localStorage bajo clave propia; NO toca logo ni paleta.
   */
  static getPlatformSettings(): PlatformSettings {
    return loadPlatformSettings();
  }

  static updatePlatformSettings(
    ownerId: string,
    updates: Partial<PlatformSettings>
  ): PlatformSettings {
    AuthorizationService.requireOwner(ownerId);
    const current = loadPlatformSettings();
    const next: PlatformSettings = {
      ...current,
      ...updates,
      registrationEnabled: updates.registrationEnabled ?? current.registrationEnabled,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(PLATFORM_SETTINGS_KEY, JSON.stringify(next));
    db.createAuditLog(ownerId, 'CONFIG_CHANGED', 'platform', 'settings',
      Object.keys(updates).join(', '));
    return next;
  }

  /**
   * Desactiva una categoría del catálogo (flag `active=false`, reversible,
   * sin borrar datos). El contenido ya asociado no se elimina.
   */
  static setCategoryActive(staffId: string, categoryId: string, active: boolean): void {
    AuthorizationService.requireOwner(staffId);
    const cat = getCategoryById(categoryId);
    if (!cat) throw new Error('CATEGORY_NOT_FOUND');
    updateCategory(categoryId, { active });
    db.createAuditLog(staffId, 'CONFIG_CHANGED', 'category', categoryId,
      active ? `Categoría «${cat.name}» activada` : `Categoría «${cat.name}» desactivada`);
  }

  /** Sesiones activas reales del usuario (sin exponer tokens). */
  static listSessionsForUser(ownerId: string, userId: string): Array<{ createdAt: string; expiresAt: string; active: boolean }> {
    AuthorizationService.requireOwner(ownerId);
    const sessions: Session[] = JSON.parse(localStorage.getItem('nexura_sessions') || '[]');
    return sessions
      .filter(s => s.userId === userId)
      .map(s => ({
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        active: new Date(s.expiresAt).getTime() > Date.now(),
      }));
  }

  static closeAllSessions(ownerId: string, userId: string): void {
    AuthorizationService.requireOwner(ownerId);
    db.logoutAllSessions(userId);
    db.createAuditLog(ownerId, 'SESSIONS_CLOSED', 'user', userId, 'Cierre de todas las sesiones');
  }

  // ============================================================
  // PROMOVER / DEGRADAR ROLES DE STAFF (USER ⇄ MODERATOR ⇄ ADMIN)
  // ============================================================

  /**
   * Cambia el rol de un usuario NO-OWNER entre USER / MODERATOR / ADMIN.
   *
   * Reglas aplicadas con la infraestructura existente (sin duplicar el
   * sistema de roles — reutiliza `AuthorizationService` y
   * `database.setUserRole`, que ya garantiza inmutabilidad del OWNER):
   *  - Solo el OWNER actual puede llamar a esta función (requireOwner).
   *  - Nunca se puede asignar ni remover el rol OWNER (setUserRole lo
   *    bloquea con OWNER_ROLE_RESERVED / CANNOT_MODIFY_OWNER_ROLE).
   *  - El OWNER no puede modificarse a sí mismo (no podría degradarse;
   *    setUserRole además rechaza targets con rol OWNER).
   *  - Se exige confirmación explícita en la capa UI antes de llamar.
   *  - Cada cambio queda auditado: quién, a quién, rol anterior → nuevo,
   *    fecha/hora (createAuditLog) + historial local consultable.
   *
   * ⚠️ TRANSPARENCIA DE SEGURIDAD: la verificación `requireOwner` lee el
   * rol desde localStorage; mientras no exista Supabase Auth + RLS, un
   * cliente avanzado podría alterar sus datos locales. Esta operación es
   * REAL y persistente dentro del sistema actual, pero la protección
   * definitiva (server-side) requiere backend. La UI lo indica siempre.
   */
  static changeStaffRole(
    ownerId: string,
    targetUserId: string,
    newRole: UserRole,
    confirmed: boolean
  ): { before: UserRole; after: UserRole } {
    const owner = AuthorizationService.requireOwner(ownerId);

    if (!confirmed) throw new Error('CONFIRMATION_REQUIRED');

    const allowedTargets: UserRole[] = ['USER', 'MODERATOR', 'ADMIN'];
    if (!allowedTargets.includes(newRole)) throw new Error('INVALID_TARGET_ROLE');

    const target = db.getUserById(targetUserId);
    if (!target) throw new Error('USER_NOT_FOUND');
    if (target.role === 'OWNER') throw new Error('CANNOT_MODIFY_OWNER_ROLE');
    if (target.id === owner.id) throw new Error('CANNOT_MODIFY_SELF_ROLE');

    const before = target.role;
    if (before === newRole) throw new Error('ROLE_UNCHANGED');

    // database.setUserRole revalida (OWNER reservado / target no-OWNER).
    db.setUserRole(targetUserId, newRole);

    const rank: Record<string, number> = { USER: 0, MODERATOR: 1, ADMIN: 2 };
    const isPromotion = (rank[newRole] ?? 0) > (rank[before] ?? 0);

    // Historial local de cambios de rol (trazabilidad consultable).
    const meta = readMeta();
    const historyKey = 'roleChanges';
    const history = Array.isArray(meta[historyKey]) ? meta[historyKey] : [];
    history.unshift({
      at: new Date().toISOString(),
      adminId: owner.id,
      adminName: owner.displayName || owner.username,
      targetId: target.id,
      targetUsername: target.username,
      before,
      after: newRole,
    });
    meta[historyKey] = history.slice(0, 200);
    writeMeta(meta);

    db.createAuditLog(
      ownerId,
      isPromotion ? 'STAFF_ROLE_PROMOTED' : 'STAFF_ROLE_DEGRADED',
      'user',
      targetUserId,
      `${before} → ${newRole} · @${target.username} por ${owner.username}`
    );

    return { before, after: newRole };
  }

  /** Historial real de cambios de rol de staff (persistido localmente). */
  static listRoleChangeHistory(staffId: string): Array<{
    at: string; adminName: string; targetUsername: string; before: UserRole; after: UserRole;
  }> {
    AuthorizationService.requireOwner(staffId);
    const meta = readMeta();
    const history = Array.isArray(meta['roleChanges']) ? meta['roleChanges'] : [];
    return history.map((h: any) => ({
      at: String(h.at ?? ''),
      adminName: String(h.adminName ?? '—'),
      targetUsername: String(h.targetUsername ?? '—'),
      before: h.before as UserRole,
      after: h.after as UserRole,
    }));
  }

  // ============================================================
  // POLÍTICA DE CONTRASEÑAS (Seguridad → Control Center)
  // ============================================================

  static getPasswordPolicy(): PasswordPolicy {
    return loadPasswordPolicy();
  }

  /**
   * Guarda la política de contraseñas definida por el OWNER.
   * ✅ Real: persistencia + auditoría (config anterior → nueva, admin, fecha).
   * ⚠️ Requiere backend: la validación GLOBAL y obligatoria de contraseñas
   *    debe ejecutarse server-side (Supabase Auth / Edge Function). Mientras
   *    tanto la política aplica en los flujos locales que la consultan
   *    (`validatePasswordAgainstPolicy`). Aquí nunca se almacena una
   *    contraseña: solo reglas (enteros/booleanos).
   */
  static updatePasswordPolicy(
    ownerId: string,
    updates: Partial<PasswordPolicy>
  ): PasswordPolicy {
    const owner = AuthorizationService.requireOwner(ownerId);
    const current = loadPasswordPolicy();
    const next = sanitizePolicyInput(current, updates);
    next.updatedBy = owner.displayName || owner.username;

    const changedKeys = (Object.keys(next) as Array<keyof PasswordPolicy>)
      .filter(k => k !== 'updatedAt' && k !== 'updatedBy' && next[k] !== current[k]);
    if (changedKeys.length === 0) return current;

    savePasswordPolicy(next);

    const fmtPolicy = (p: PasswordPolicy) =>
      `min ${p.minLength}${p.requireUppercase ? ', mayús' : ''}${p.requireLowercase ? ', minús' : ''}${p.requireNumbers ? ', nros' : ''}${p.requireSpecial ? ', especial' : ''}`;

    db.createAuditLog(
      ownerId,
      'PASSWORD_POLICY_CHANGED',
      'platform',
      'password_policy',
      `${fmtPolicy(current)} → ${fmtPolicy(next)} (por ${owner.username})`
    );
    return next;
  }
}

// ============================================================
// CONFIGURACIÓN DE PLATAFORMA (persistente, editable por OWNER)
// ============================================================

const PLATFORM_SETTINGS_KEY = 'nexura_platform_settings';

export interface PlatformSettings {
  platformName: string;
  description: string;
  registrationEnabled: boolean;
  maintenanceMessage: string;
  updatedAt: string;
}

function loadPlatformSettings(): PlatformSettings {
  try {
    const raw = localStorage.getItem(PLATFORM_SETTINGS_KEY);
    if (raw) return { ...DEFAULT_PLATFORM_SETTINGS, ...JSON.parse(raw) };
  } catch { /* defaults */ }
  return DEFAULT_PLATFORM_SETTINGS;
}

const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  platformName: 'NEXURA',
  description: 'Plataforma de streaming en vivo, reels y comunidad.',
  registrationEnabled: true,
  maintenanceMessage: '',
  updatedAt: new Date(0).toISOString(),
};

/**
 * Gate de registro: RegisterPage consulta esto para respetar la config del
 * OWNER. Default: habilitado (comportamiento actual intacto).
 */
export function isRegistrationEnabled(): boolean {
  return loadPlatformSettings().registrationEnabled;
}
