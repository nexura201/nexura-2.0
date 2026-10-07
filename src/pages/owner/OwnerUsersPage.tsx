/**
 * Control Center OWNER — Gestión de Usuarios.
 * Búsqueda, filtros, estado real y acciones administrativas persistentes
 * (suspensión/reactivación con motivo+admin+fecha; cierre de sesiones).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { OwnerLayout, FeatureBadge, BackendNotice, ConfirmModal } from './OwnerLayout';
import { AdminService, type AdminUserSummary, type AdminUserDetail } from '../../services/admin.service';
import { Search, ArrowLeft, Ban, RotateCcw, KeyRound, LogOut, ShieldAlert, Video, MailCheck, ShieldCheck } from 'lucide-react';
import type { UserRole } from '../../types';

type FilterKey = 'ALL' | 'ACTIVE' | 'SUSPENDED' | 'CREATORS' | 'STAFF';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'Todos' },
  { key: 'ACTIVE', label: 'Activos' },
  { key: 'SUSPENDED', label: 'Suspendidos' },
  { key: 'CREATORS', label: 'Creadores' },
  { key: 'STAFF', label: 'OWNER / Admin' },
];

export function roleBadgeClass(role: string): string {
  return role === 'OWNER' ? 'bg-danger/10 text-danger'
    : role === 'ADMIN' ? 'bg-warning/10 text-warning'
    : role === 'MODERATOR' ? 'bg-primary/15 text-primary-hover'
    : 'bg-bg-elevated text-text-secondary';
}

export function statusBadge(status: string): { label: string; cls: string } {
  if (status === 'ACTIVE') return { label: 'Activo', cls: 'text-success bg-success/10' };
  if (status === 'SUSPENDED') return { label: 'Suspendido', cls: 'text-warning bg-warning/10' };
  return { label: 'Eliminado/Ban', cls: 'text-danger bg-danger/10' };
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });
}

export function OwnerUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<FilterKey>('ALL');

  const reload = () => {
    if (!user) return;
    try {
      setUsers(AdminService.listUsers(user.id));
      setDenied(false);
    } catch {
      setDenied(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(reload, [user]);

  const filtered = useMemo(() => {
    let list = users;
    if (filter === 'ACTIVE') list = list.filter(u => u.status === 'ACTIVE');
    if (filter === 'SUSPENDED') list = list.filter(u => u.status !== 'ACTIVE');
    if (filter === 'CREATORS') list = list.filter(u => u.isCreator);
    if (filter === 'STAFF') list = list.filter(u => u.role === 'OWNER' || u.role === 'ADMIN' || u.role === 'MODERATOR');
    const s = q.trim().toLowerCase();
    if (s) {
      list = list.filter(u =>
        u.username.toLowerCase().includes(s) ||
        u.displayName.toLowerCase().includes(s) ||
        u.emailMasked.toLowerCase().includes(s) ||
        (u.channelTitle ?? '').toLowerCase().includes(s)
      );
    }
    return list.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [users, filter, q]);

  return (
    <OwnerLayout title="Usuarios" subtitle={`${users.length} cuentas registradas · datos reales`}>
      {/* Buscador + filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar por username, nombre, email o canal…"
            className="w-full bg-bg-card border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-primary placeholder:text-text-secondary"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                filter === f.key
                  ? 'bg-primary/20 text-primary-hover border-primary/40'
                  : 'bg-bg-card text-text-secondary border-border hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <BackendNotice>
        La suspensión/reactivación se aplica sobre los datos locales de NEXURA (el login local rechaza
        cuentas no activas y se cierran las sesiones del usuario). El bloqueo a nivel de servidor
        requiere Supabase Auth (ban + RLS) — marcado abajo como ⚠️ donde corresponde.
      </BackendNotice>

      {loading ? (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : denied ? (
        <div className="mt-6 bg-bg-card border border-border rounded-xl p-8 text-center text-text-secondary">
          Acceso restringido al propietario de la plataforma.
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 bg-bg-card border border-border rounded-xl p-8 text-center text-text-secondary">
          No hay usuarios que coincidan con la búsqueda o el filtro.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {filtered.map(u => {
            const st = statusBadge(u.status);
            return (
              <Link
                key={u.id}
                to={`/owner/users/${u.id}`}
                className="block bg-bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">
                      {u.displayName} <span className="text-text-muted font-normal">@{u.username}</span>
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5 truncate">
                      {u.emailMasked} · Registrado {fmtDate(u.createdAt)}
                    </p>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${roleBadgeClass(u.role)}`}>{u.role}</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                  {u.isCreator && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-text-secondary bg-bg-elevated border border-border rounded-full px-2 py-0.5">
                      <Video className="w-3 h-3" /> {u.channelTitle}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </OwnerLayout>
  );
}

// ============================================================
// DETALLE DEL USUARIO
// ============================================================

export function OwnerUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Modales de acción
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [typedConfirm, setTypedConfirm] = useState('');
  const [pwResetOpen, setPwResetOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [sessions, setSessions] = useState<Array<{ createdAt: string; expiresAt: string; active: boolean }> | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Roles de staff (USER ⇄ MODERATOR ⇄ ADMIN) — solo OWNER
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [roleHistory, setRoleHistory] = useState<Array<{ at: string; adminName: string; targetUsername: string; before: UserRole; after: UserRole }>>([]);

  const reload = () => {
    if (!user || !id) return;
    try {
      setDetail(AdminService.getUserDetail(user.id, id));
      setError(null);
    } catch (e: any) {
      setError(e?.message === 'USER_NOT_FOUND' ? 'Usuario no encontrado.' : 'Acceso restringido.');
    }
  };

  useEffect(reload, [user, id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  if (error) {
    return (
      <OwnerLayout title="Detalle del usuario">
        <div className="bg-bg-card border border-border rounded-xl p-8 text-center text-text-secondary">{error}</div>
      </OwnerLayout>
    );
  }
  if (!detail) {
    return (
      <OwnerLayout title="Detalle del usuario">
        <div className="h-48 bg-bg-card border border-border rounded-xl animate-pulse" />
      </OwnerLayout>
    );
  }

  const isSelf = detail.id === user?.id;
  const isOwnerTarget = detail.role === 'OWNER';
  const st = statusBadge(detail.status);

  const doSuspend = () => {
    if (!user) return;
    setBusy(true);
    try {
      AdminService.suspendUser(user.id, detail.id, reason);
      setSuspendOpen(false); setReason('');
      reload();
      setToast('✅ Cuenta suspendida. Se registró motivo, administrador y fecha en auditoría.');
    } catch (e: any) {
      setToast(`No se pudo suspender: ${e?.message ?? 'error'}`);
    } finally { setBusy(false); }
  };

  const doReactivate = () => {
    if (!user) return;
    setBusy(true);
    try {
      AdminService.reactivateUser(user.id, detail.id);
      setReactivateOpen(false);
      reload();
      setToast('✅ Cuenta reactivada.');
    } catch (e: any) {
      setToast(`No se pudo reactivar: ${e?.message ?? 'error'}`);
    } finally { setBusy(false); }
  };

  const doDelete = () => {
    if (!user) return;
    setBusy(true);
    try {
      const { removedFollows } = AdminService.deleteUser(user.id, detail.id);
      setDeleteOpen(false); setDeleteStep(1); setTypedConfirm('');
      reload();
      setToast(`✅ Cuenta eliminada (anonimizada localmente). Follows purgados: ${removedFollows}. Eliminación física de archivos requiere backend.`);
    } catch (e: any) {
      setToast(`No se pudo eliminar: ${e?.message ?? 'error'}`);
    } finally { setBusy(false); }
  };

  const openSessions = () => {
    if (!user) return;
    try {
      setSessions(AdminService.listSessionsForUser(user.id, detail.id));
      setSessionsOpen(true);
    } catch {
      setSessions([]); setSessionsOpen(true);
    }
  };

  const doCloseSessions = () => {
    if (!user) return;
    try {
      AdminService.closeAllSessions(user.id, detail.id);
      setSessions(AdminService.listSessionsForUser(user.id, detail.id).map(s => ({ ...s, active: false })));
      setToast('✅ Sesiones del usuario cerradas.');
    } catch (e: any) {
      setToast(`Error: ${e?.message ?? 'no se pudo cerrar sesiones'}`);
    }
  };

  const doInitiatePwReset = () => {
    if (!user) return;
    try {
      const { requestId } = AdminService.initiatePasswordReset(user.id, { userId: detail.id });
      setPwResetOpen(false);
      setToast(`⚠️ Recuperación iniciada (req ${requestId.slice(0, 8)}…). La entrega segura del código al email requiere Supabase Auth/backend.`);
    } catch (e: any) {
      setToast(`No se pudo iniciar: ${e?.message ?? 'error'}`);
    }
  };

  // ---- Roles de staff: USER ⇄ MODERATOR ⇄ ADMIN (solo OWNER) ----
  const STAFF_ROLES: Array<{ role: UserRole; label: string; desc: string }> = [
    { role: 'USER', label: 'USER', desc: 'Usuario estándar sin permisos administrativos.' },
    { role: 'MODERATOR', label: 'MODERATOR', desc: 'Puede moderar canales asignados (chat, reportes de canal).' },
    { role: 'ADMIN', label: 'ADMIN', desc: 'Administrador: gestión de usuarios, reportes y moderación global.' },
  ];

  const openRoleModal = () => {
    if (!user) return;
    setSelectedRole(null);
    try {
      setRoleHistory(AdminService.listRoleChangeHistory(user.id));
    } catch {
      setRoleHistory([]);
    }
    setRoleModalOpen(true);
  };

  const doChangeRole = () => {
    if (!user || !selectedRole) return;
    setBusy(true);
    try {
      const { before, after } = AdminService.changeStaffRole(user.id, detail.id, selectedRole, true);
      setRoleModalOpen(false); setSelectedRole(null);
      reload();
      setToast(`✅ Rol actualizado: ${before} → ${after}. Cambio registrado en auditoría (admin, usuario, roles, fecha/hora).`);
    } catch (e: any) {
      const msg = String(e?.message ?? '');
      const friendly =
        msg === 'CANNOT_MODIFY_OWNER_ROLE' ? 'El rol OWNER no puede modificarse desde esta interfaz.' :
        msg === 'CANNOT_MODIFY_SELF_ROLE' ? 'El OWNER no puede modificarse sus propios privilegios.' :
        msg === 'ROLE_UNCHANGED' ? 'El usuario ya tiene ese rol.' :
        msg === 'CONFIRMATION_REQUIRED' ? 'Se requiere confirmación explícita.' : msg;
      setToast(`No se pudo cambiar el rol: ${friendly}`);
    } finally { setBusy(false); }
  };

  return (
    <OwnerLayout title={detail.displayName} subtitle={`@${detail.username}`}>
      {toast && (
        <div className="fixed bottom-4 right-4 z-[80] max-w-sm bg-surface border border-border rounded-xl px-4 py-3 text-sm text-white shadow-2xl">
          {toast}
        </div>
      )}

      <Link to="/owner/users" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-white mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a Usuarios
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Ficha */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
            <div className="h-24 bg-surface-2 relative">
              {detail.bannerUrl && (
                <img src={detail.bannerUrl} alt="" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
              )}
            </div>
            <div className="p-5 -mt-9">
              <div className="flex items-end gap-4">
                <div className="w-16 h-16 rounded-full bg-surface-2 border-4 border-bg-card flex items-center justify-center text-xl font-bold text-white overflow-hidden shrink-0">
                  {detail.avatarUrl
                    ? <img src={detail.avatarUrl} alt={detail.username} className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                    : detail.displayName.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white truncate">{detail.displayName}</p>
                  <p className="text-sm text-text-muted">@{detail.username}</p>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${roleBadgeClass(detail.role)}`}>{detail.role}</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
              </div>

              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 text-sm">
                <div><dt className="text-text-muted text-xs">Email</dt><dd className="text-white mt-0.5">{detail.emailMasked}</dd></div>
                <div><dt className="text-text-muted text-xs">Email verificado</dt><dd className="mt-0.5">{detail.emailVerified ? <span className="text-success inline-flex items-center gap-1"><MailCheck className="w-3.5 h-3.5" />Sí</span> : <span className="text-warning">Pendiente</span>}</dd></div>
                <div><dt className="text-text-muted text-xs">Registro</dt><dd className="text-white mt-0.5">{fmtDate(detail.createdAt)}</dd></div>
                <div><dt className="text-text-muted text-xs">Último acceso</dt><dd className="text-white mt-0.5">{fmtDate(detail.lastLoginAt)}</dd></div>
                <div><dt className="text-text-muted text-xs">Canal</dt><dd className="text-white mt-0.5">{detail.channelSlug ? <Link className="text-primary-hover hover:underline" to={`/channel/${detail.channelSlug}`}>{detail.channelTitle}</Link> : 'Sin canal'}</dd></div>
                <div><dt className="text-text-muted text-xs">Contenido</dt><dd className="text-white mt-0.5">{detail.contentCounts.videos} videos · {detail.contentCounts.reels} reels</dd></div>
              </dl>

              {detail.bio && <p className="text-sm text-text-secondary mt-4">{detail.bio}</p>}

              {detail.suspension && (
                <div className="mt-4 bg-warning/5 border border-warning/30 rounded-lg p-3 text-xs text-text-secondary">
                  <span className="text-warning font-semibold">Suspensión vigente:</span>{' '}
                  «{detail.suspension.reason}» — por {detail.suspension.adminName} el {fmtDate(detail.suspension.at)}
                </div>
              )}
            </div>
          </div>

          {/* Acciones administrativas */}
          <div className="bg-bg-card border border-border rounded-xl p-5">
            <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-warning" /> Administración de cuenta</h2>
            <p className="text-xs text-text-muted mb-4">Todas las acciones requieren confirmación y quedan registradas en la auditoría.</p>
            {isOwnerTarget ? (
              <p className="text-sm text-text-secondary">Esta es la cuenta OWNER principal. Por seguridad no se administra desde este panel (no se puede suspender, eliminar ni restablecer al OWNER vía UI administrativa).</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {detail.status === 'ACTIVE' ? (
                  <button onClick={() => setSuspendOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-warning/10 text-warning border border-warning/30 hover:bg-warning/20 transition-colors">
                    <Ban className="w-4 h-4" /> Suspender cuenta <FeatureBadge kind="ok" note="Persistente en datos locales; bloqueo de servidor requiere backend" />
                  </button>
                ) : (
                  <button onClick={() => setReactivateOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-success/10 text-success border border-success/30 hover:bg-success/20 transition-colors">
                    <RotateCcw className="w-4 h-4" /> Reactivar cuenta <FeatureBadge kind="ok" />
                  </button>
                )}
                <button onClick={openSessions} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-bg-elevated text-text-secondary border border-border hover:text-white transition-colors">
                  <LogOut className="w-4 h-4" /> Ver / cerrar sesiones <FeatureBadge kind="ok" note="Sesiones locales existentes" />
                </button>
                <button onClick={() => setPwResetOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-bg-elevated text-text-secondary border border-border hover:text-white transition-colors">
                  <KeyRound className="w-4 h-4" /> Iniciar restablecimiento de contraseña <FeatureBadge kind="backend" note="El envío seguro del código exige Supabase Auth" />
                </button>
                {!isSelf && (
                  <button onClick={openRoleModal} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary-hover border border-primary/30 hover:bg-primary/20 transition-colors">
                    <ShieldCheck className="w-4 h-4" /> Promover / degradar rol de staff <FeatureBadge kind="ok" note="Persistente + auditado; la protección server-side definitiva requiere RLS" />
                  </button>
                )}
                <button onClick={() => setDeleteOpen(true)} disabled={isSelf} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 transition-colors disabled:opacity-40">
                  <Ban className="w-4 h-4" /> Eliminar cuenta <FeatureBadge kind="ok" note="Anonimización local; borrado físico de archivos requiere backend" />
                </button>
              </div>
            )}
            <p className="text-[11px] text-text-muted mt-3">
              🔒 El OWNER nunca ve ni define la contraseña del usuario. Para recuperación completa con verificación de identidad usá el Centro de Soporte (flujo de tickets + código temporal).
            </p>
          </div>

          {/* Actividad */}
          <div className="bg-bg-card border border-border rounded-xl p-5">
            <h2 className="text-base font-semibold text-white mb-3">Actividad reciente</h2>
            {detail.recentActivity.length === 0 ? (
              <p className="text-sm text-text-muted">Datos no disponibles (sin eventos registrados para este usuario).</p>
            ) : (
              <ul className="space-y-2.5">
                {detail.recentActivity.map((a, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-white">{a.action}</span>
                      {a.details && <span className="text-text-muted"> — {a.details}</span>}
                      <p className="text-[11px] text-text-muted">{fmtDate(a.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <BackendNotice>
            Nunca se muestran contraseñas ni hashes. Los emails se presentan parcialmente protegidos.
            Las acciones marcadas ⚠️ REQUIERE BACKEND quedan preparadas para Supabase Auth + PostgreSQL + RLS.
          </BackendNotice>
        </div>
      </div>

      {/* ---- Modales ---- */}
      <ConfirmModal
        open={suspendOpen}
        title="Suspender cuenta"
        danger
        confirmLabel="Confirmar suspensión"
        confirming={busy}
        onCancel={() => setSuspendOpen(false)}
        onConfirm={doSuspend}
      >
        <p>Se impedirá el acceso de <strong className="text-white">@{detail.username}</strong> según las capacidades reales del sistema (login local rechazado + cierre de sesiones).</p>
        <div>
          <label className="block text-xs text-text-muted mb-1.5">Motivo de la suspensión (obligatorio, se audita):</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary"
            placeholder="Ej.: incumplimiento de normas de comunidad"
          />
        </div>
      </ConfirmModal>

      <ConfirmModal
        open={reactivateOpen}
        title="Reactivar cuenta"
        confirmLabel="Confirmar reactivación"
        confirming={busy}
        onCancel={() => setReactivateOpen(false)}
        onConfirm={doReactivate}
      >
        <p>El usuario <strong className="text-white">@{detail.username}</strong> podrá volver a acceder. La acción queda registrada en auditoría.</p>
      </ConfirmModal>

      <ConfirmModal
        open={deleteOpen}
        title={deleteStep === 1 ? 'Eliminar cuenta — paso 1 de 2' : 'Eliminar cuenta — confirmación final'}
        danger
        confirmLabel={deleteStep === 1 ? 'Continuar' : 'Eliminar definitivamente'}
        requireTyped={deleteStep === 2 ? 'ELIMINAR' : undefined}
        typedValue={typedConfirm}
        onTypedChange={setTypedConfirm}
        confirming={busy}
        onCancel={() => { setDeleteOpen(false); setDeleteStep(1); setTypedConfirm(''); }}
        onConfirm={() => { if (deleteStep === 1) setDeleteStep(2); else doDelete(); }}
      >
        {deleteStep === 1 ? (
          <div className="space-y-2">
            <p>Esta acción puede eliminar permanentemente la cuenta y sus datos.</p>
            <p>Se eliminará/anonimizará:</p>
            <ul className="list-disc pl-5 text-text-secondary space-y-1">
              <li>Credenciales de acceso y sesiones activas de @{detail.username}</li>
              <li>Sus relaciones de seguimiento ({detail.contentCounts.videos} videos y {detail.contentCounts.reels} reels asociados)</li>
              <li>Su perfil público quedará como «Cuenta eliminada»</li>
            </ul>
            <p className="text-xs text-text-muted">Para preservar relaciones de otros usuarios, el contenido ajeno no se borra a ciegas. El borrado físico de archivos en storage externo requiere backend (⚠️).</p>
          </div>
        ) : (
          <p><strong className="text-danger">Última confirmación:</strong> se procederá con la eliminación irreversible (a nivel local) de la cuenta de @{detail.username}.</p>
        )}
      </ConfirmModal>

      <ConfirmModal
        open={pwResetOpen}
        title="Iniciar restablecimiento de contraseña"
        confirmLabel="Iniciar proceso"
        onCancel={() => setPwResetOpen(false)}
        onConfirm={doInitiatePwReset}
      >
        <p>El sistema creará una solicitud de recuperación verificable y la registrará en auditoría.</p>
        <p className="text-warning">⚠️ La entrega segura del código/enlace al email registrado requiere Supabase Auth (backend). Sin backend el proceso NO se completa: el OWNER nunca verá ni definirá la contraseña del usuario.</p>
      </ConfirmModal>

      <ConfirmModal
        open={roleModalOpen}
        title="Promover / degradar rol de staff"
        confirmLabel={selectedRole ? `Confirmar cambio a ${selectedRole}` : 'Selecciona un rol'}
        confirming={busy}
        onCancel={() => { setRoleModalOpen(false); setSelectedRole(null); }}
        onConfirm={doChangeRole}
      >
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Usuario afectado: <strong className="text-white">@{detail.username}</strong> · Rol actual: <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${roleBadgeClass(detail.role)}`}>{detail.role}</span>
          </p>
          <div className="space-y-2">
            {STAFF_ROLES.map(r => (
              <label
                key={r.role}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  r.role === detail.role
                    ? 'opacity-40 cursor-not-allowed border-border'
                    : selectedRole === r.role
                      ? 'border-primary/60 bg-primary/10'
                      : 'border-border hover:border-primary/40'
                }`}
              >
                <input
                  type="radio"
                  name="staff-role"
                  disabled={r.role === detail.role}
                  checked={selectedRole === r.role}
                  onChange={() => setSelectedRole(r.role)}
                  className="mt-1 accent-[var(--color-primary,#2563eb)]"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-white">{r.label}</span>
                  <span className="block text-xs text-text-muted">{r.desc}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-text-muted">
            🔒 El rol OWNER es el máximo nivel: no puede asignarse ni removerse desde esta interfaz, y el OWNER no puede modificarse sus propios privilegios. Solo el OWNER actual puede realizar cambios de rol.
          </p>
          <p className="text-xs text-warning">
            ⚠️ Requiere backend/RLS: el cambio persiste en los datos locales de NEXURA y queda auditado, pero la autorización definitiva (server-side) exige Supabase Auth + RLS. Esta UI no presenta la operación como seguridad de producción.
          </p>
          {roleHistory.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">Historial de cambios de rol</p>
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {roleHistory.slice(0, 8).map((h, i) => (
                  <li key={i} className="text-xs text-text-secondary flex justify-between gap-2">
                    <span className="truncate">@{h.targetUsername}: {h.before} → {h.after} · por {h.adminName}</span>
                    <span className="text-text-muted whitespace-nowrap">{fmtDate(h.at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </ConfirmModal>

      <ConfirmModal
        open={sessionsOpen}
        title="Sesiones del usuario"
        confirmLabel="Cerrar todas las sesiones"
        onCancel={() => setSessionsOpen(false)}
        onConfirm={doCloseSessions}
      >
        {!sessions || sessions.length === 0 ? (
          <p className="text-text-muted">Datos no disponibles: no hay sesiones activas registradas para esta cuenta.</p>
        ) : (
          <ul className="space-y-1.5">
            {sessions.map((s, i) => (
              <li key={i} className="flex justify-between text-sm">
                <span className="text-text-secondary">Iniciada {fmtDate(s.createdAt)}</span>
                <span className={s.active ? 'text-success' : 'text-text-muted'}>{s.active ? 'Activa' : 'Expirada'}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-text-muted">No se exponen tokens. Cierre real en servidor requiere backend (⚠️).</p>
      </ConfirmModal>
    </OwnerLayout>
  );
}
