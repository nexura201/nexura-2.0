/**
 * Control Center OWNER — Soporte con flujo de Recuperación de Cuenta.
 * Reutiliza SupportService (tickets reales) + AdminService (verificación de identidad).
 * El código temporal NUNCA se persiste en claro: solo su hash (ver admin.service.ts).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { OwnerLayout, FeatureBadge, BackendNotice, ConfirmModal } from './OwnerLayout';
import { AdminService, type IdentityVerification } from '../../services/admin.service';
import {
  SupportService, supportStatusLabel, supportCategoryLabel, supportPriorityLabel,
  SUPPORT_STATUSES, type SupportTicket, type SupportTicketStatus,
} from '../../services/support.service';
import { Search, LifeBuoy, ShieldCheck, KeyRound, Mail, RefreshCw, Inbox } from 'lucide-react';

const fmt = (iso: string) => new Date(iso).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });

export function OwnerSupportPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SupportTicketStatus | 'ALL'>('ALL');
  const [q, setQ] = useState('');
  const [reply, setReply] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  // Verificación de identidad
  const [verification, setVerification] = useState<IdentityVerification | null>(null);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [startVerifyOpen, setStartVerifyOpen] = useState(false);
  const [pwResetConfirmOpen, setPwResetConfirmOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  const reload = () => {
    if (!user) return;
    try {
      setTickets(SupportService.listForUser(user.id));
      setDenied(false);
    } catch {
      setDenied(true);
    }
  };

  useEffect(reload, [user]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5200);
    return () => clearTimeout(t);
  }, [toast]);

  const selected = useMemo(() => tickets.find(t => t.id === selectedId) ?? null, [tickets, selectedId]);

  useEffect(() => {
    if (selected) {
      setVerification(AdminService.getVerificationForTicket(selected.id));
      setIssuedCode(null);
    } else {
      setVerification(null);
    }
  }, [selected?.id]);

  const filtered = useMemo(() => {
    let list = tickets;
    if (statusFilter !== 'ALL') list = list.filter(t => t.status === statusFilter);
    const s = q.trim().toLowerCase();
    if (s) {
      list = list.filter(t =>
        t.ticketNumber.toLowerCase().includes(s) ||
        t.subject.toLowerCase().includes(s) ||
        t.userName.toLowerCase().includes(s)
      );
    }
    return list;
  }, [tickets, statusFilter, q]);

  const isRecoveryTicket = (t: SupportTicket) =>
    t.category === 'account' || /recuper|no puedo entrar|acceso|contrase/i.test(t.subject + ' ' + t.messages[0]?.body);

  const sendReply = () => {
    if (!user || !selected || reply.trim().length < 2) return;
    try {
      SupportService.staffReply({ ticketId: selected.id, staffId: user.id, body: reply });
      setReply('');
      reload();
      setToast('✅ Respuesta enviada al usuario (queda en el historial del ticket).');
    } catch (e: any) {
      setToast(`No se pudo responder: ${e?.message}`);
    }
  };

  const changeStatus = (status: SupportTicketStatus) => {
    if (!user || !selected) return;
    try {
      SupportService.staffChangeStatus({ ticketId: selected.id, staffId: user.id, status });
      reload();
      setToast(`✅ Estado actualizado a «${supportStatusLabel(status)}».`);
    } catch (e: any) {
      setToast(`Error: ${e?.message}`);
    }
  };

  const startVerification = () => {
    if (!user || !selected) return;
    try {
      const kind: IdentityVerification['kind'] = pwResetTarget ? 'password_reset' : 'account_recovery';
      const { verification: v, code } = AdminService.startIdentityVerification(user.id, {
        ticketId: selected.id, userId: selected.userId, kind,
      });
      setVerification(v);
      setIssuedCode(code);
      setStartVerifyOpen(false);
      setPwResetTarget(false);
      reload();
      setToast('⚠️ Verificación iniciada. Sin backend no hay envío automático de email: comunicá el código por el hilo del ticket tras verificar el acceso al email registrado.');
    } catch (e: any) {
      setToast(`No se pudo iniciar la verificación: ${e?.message}`);
    }
  };

  const [pwResetTarget, setPwResetTarget] = useState(false);

  const initiatePasswordReset = () => {
    if (!user || !selected) return;
    try {
      const { requestId } = AdminService.initiatePasswordReset(user.id, { userId: selected.userId, ticketId: selected.id });
      setPwResetConfirmOpen(false);
      setToast(`⚠️ Solicitud de restablecimiento creada (${requestId.slice(0, 8)}…). Entrega segura del código requiere Supabase Auth/backend.`);
    } catch (e: any) {
      setToast(`Error: ${e?.message}`);
    }
  };

  const requestEmailChange = () => {
    if (!user || !selected) return;
    try {
      const v = AdminService.requestEmailChange(user.id, { ticketId: selected.id, userId: selected.userId, newEmail });
      setVerification(v);
      setNewEmail('');
      reload();
      setToast('✅ Cambio de email registrado como pendiente de confirmación. La confirmación real al nuevo email requiere backend; completala desde aquí cuando la verificación exigida sea correcta.');
    } catch (e: any) {
      const msg = e?.message === 'IDENTITY_NOT_VERIFIED' ? 'Primero debés completar la verificación de identidad.'
        : e?.message === 'EMAIL_TAKEN' ? 'Ese email ya está en uso por otra cuenta.'
        : e?.message === 'INVALID_EMAIL' ? 'El formato del email no es válido.'
        : e?.message ?? 'error';
      setToast(`No se pudo solicitar el cambio: ${msg}`);
    }
  };

  const completeEmailChange = () => {
    if (!user || !selected || !verification?.newEmail) return;
    try {
      const token = `confirm:${verification.newEmail}:${verification.id}`;
      AdminService.completeEmailChange(user.id, { ticketId: selected.id, confirmationToken: token });
      reload();
      setVerification(AdminService.getVerificationForTicket(selected.id));
      setToast('✅ Email actualizado correctamente. El cambio quedó registrado en auditoría.');
    } catch (e: any) {
      setToast(`No se pudo completar: ${e?.message}`);
    }
  };

  return (
    <OwnerLayout title="Soporte" subtitle={`${tickets.length} tickets · estados reales`}>
      {toast && (
        <div className="fixed bottom-4 right-4 z-[80] max-w-sm bg-surface border border-border rounded-xl px-4 py-3 text-sm text-white shadow-2xl">
          {toast}
        </div>
      )}

      {denied ? (
        <div className="bg-bg-card border border-border rounded-xl p-8 text-center text-text-secondary">Acceso restringido.</div>
      ) : (
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Lista */}
          <div className="lg:col-span-2 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Buscar ticket…"
                className="w-full bg-bg-card border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-primary placeholder:text-text-secondary"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap border transition-colors ${statusFilter === 'ALL' ? 'bg-primary/20 text-primary-hover border-primary/40' : 'bg-bg-card text-text-secondary border-border'}`}
              >Todos</button>
              {SUPPORT_STATUSES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setStatusFilter(s.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap border transition-colors ${statusFilter === s.id ? 'bg-primary/20 text-primary-hover border-primary/40' : 'bg-bg-card text-text-secondary border-border'}`}
                >{s.label}</button>
              ))}
            </div>

            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <div className="bg-bg-card border border-border rounded-xl p-6 text-center text-sm text-text-muted">
                  <Inbox className="w-6 h-6 mx-auto mb-2 opacity-50" /> No hay tickets que coincidan.
                </div>
              ) : filtered.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full text-left bg-bg-card border rounded-xl p-3.5 transition-colors ${selectedId === t.id ? 'border-primary/60' : 'border-border hover:border-primary/30'}`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-text-muted">{t.ticketNumber}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      t.status === 'OPEN' ? 'bg-warning/10 text-warning' :
                      t.status === 'IN_REVIEW' ? 'bg-primary/15 text-primary-hover' :
                      t.status === 'WAITING_USER' ? 'bg-bg-elevated text-text-secondary' :
                      'bg-success/10 text-success'
                    }`}>{supportStatusLabel(t.status)}</span>
                    {isRecoveryTicket(t) && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-danger/10 text-danger">RECUPERACIÓN</span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white mt-1 truncate">{t.subject}</p>
                  <p className="text-xs text-text-muted mt-0.5">{t.userName} · {supportCategoryLabel(t.category)} · {fmt(t.updatedAt)}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Detalle */}
          <div className="lg:col-span-3">
            {!selected ? (
              <div className="bg-bg-card border border-border rounded-xl p-10 text-center text-text-secondary">
                <LifeBuoy className="w-8 h-8 mx-auto mb-3 opacity-50" />
                Seleccioná un ticket para verlo, responder y gestionar la recuperación de cuenta.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-bg-card border border-border rounded-xl p-5">
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-bold text-white">{selected.subject}</h2>
                      <p className="text-xs text-text-muted mt-1">
                        {selected.ticketNumber} · Usuario: <strong className="text-text-secondary">{selected.userName}</strong> · Motivo: {supportCategoryLabel(selected.category)} · Prioridad: {supportPriorityLabel(selected.priority)} · Abierto {fmt(selected.createdAt)}
                      </p>
                    </div>
                    <select
                      value={selected.status}
                      onChange={e => changeStatus(e.target.value as SupportTicketStatus)}
                      className="bg-bg-elevated border border-border rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-primary"
                      aria-label="Cambiar estado"
                    >
                      {SUPPORT_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>

                  {/* Historial de acciones */}
                  <details className="mt-4">
                    <summary className="text-xs text-text-secondary cursor-pointer select-none">Historial de acciones ({selected.history.length})</summary>
                    <ul className="mt-2 space-y-1.5">
                      {selected.history.map(h => (
                        <li key={h.id} className="text-xs text-text-muted flex gap-2">
                          <span className="whitespace-nowrap">{fmt(h.createdAt)}</span>
                          <span>{h.actorName}: {h.details}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>

                {/* Mensajes */}
                <div className="bg-bg-card border border-border rounded-xl p-5 space-y-3 max-h-[40vh] overflow-y-auto">
                  {selected.messages.map(m => (
                    <div key={m.id} className={`rounded-lg px-3.5 py-2.5 text-sm max-w-[92%] ${
                      m.authorRole === 'support' ? 'bg-primary/10 border border-primary/20 ml-auto' : 'bg-bg-elevated border border-border'
                    }`}>
                      <p className="text-xs text-text-muted mb-1">{m.authorName} · {m.authorRole === 'support' ? 'Soporte' : 'Usuario'} · {fmt(m.createdAt)}</p>
                      <p className="text-white whitespace-pre-wrap break-words">{m.body}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    rows={2}
                    placeholder="Respuesta al usuario…"
                    className="flex-1 bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary placeholder:text-text-secondary"
                  />
                  <button onClick={sendReply} className="self-end px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary-hover transition-colors">
                    Responder <FeatureBadge kind="ok" />
                  </button>
                </div>

                {/* ---- Recuperación de cuenta / verificación de identidad ---- */}
                {isRecoveryTicket(selected) && (
                  <div className="bg-bg-card border border-danger/30 rounded-xl p-5 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-danger" /> Recuperación de cuenta</h3>

                    {!verification || verification.state === 'NONE' ? (
                      <>
                        <p className="text-xs text-text-secondary leading-relaxed">
                          Flujo seguro: 1) iniciar verificación de identidad → 2) el sistema genera un código temporal
                          (solo se guarda su hash) → 3) el usuario lo introduce por el canal de soporte → 4) al verificarse,
                          quedan habilitadas las acciones autorizadas. Nunca se cambia una contraseña o email sin este control.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => { setPwResetTarget(false); setStartVerifyOpen(true); }} className="px-3.5 py-2 rounded-lg text-sm font-semibold bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 transition-colors inline-flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4" /> Iniciar verificación de identidad <FeatureBadge kind="ok" note="Código temporal con hash; expira en 15 min; máx 5 intentos" />
                          </button>
                          <button onClick={() => setPwResetConfirmOpen(true)} className="px-3.5 py-2 rounded-lg text-sm font-medium bg-bg-elevated text-text-secondary border border-border hover:text-white inline-flex items-center gap-1.5 transition-colors">
                            <KeyRound className="w-4 h-4" /> Iniciar restablecimiento de contraseña <FeatureBadge kind="backend" />
                          </button>
                        </div>
                        <BackendNotice>
                          El ENVÍO automático del código al email registrado requiere un proveedor de email server-side
                          (Supabase Auth / SMTP). Hasta entonces, el código se entrega al OWNER para comunicarlo por el hilo
                          del ticket verificando antes el acceso al email por otros medios. Esto NO es seguridad de servidor.
                        </BackendNotice>
                      </>
                    ) : (
                      <>
                        <div className={`rounded-lg px-3.5 py-2.5 text-sm border ${
                          verification.state === 'VERIFIED' || verification.state === 'COMPLETED' || verification.state === 'EMAIL_CONFIRM_SENT'
                            ? 'bg-success/10 border-success/30 text-success'
                            : 'bg-warning/10 border-warning/30 text-warning'
                        }`}>
                          {verification.state === 'CODE_SENT' && '⏳ Código generado y pendiente de validación. Expira: ' + fmt(verification.codeExpiresAt)}
                          {(verification.state === 'VERIFIED' || verification.state === 'COMPLETED' || verification.state === 'EMAIL_CONFIRM_SENT') && '✅ Identidad verificada'}
                        </div>

                        {issuedCode && verification.state === 'CODE_SENT' && (
                          <div className="bg-bg-elevated border border-border rounded-lg p-3.5">
                            <p className="text-xs text-text-muted mb-1">Código temporal (se muestra una sola vez, no queda guardado en claro):</p>
                            <p className="font-mono text-2xl tracking-[0.3em] text-white">{issuedCode}</p>
                            <p className="text-[11px] text-text-muted mt-2">Comunicá este código al usuario por el canal acordado dentro del ticket. Intentos permitidos: 5 · Vigencia: 15 minutos.</p>
                          </div>
                        )}

                        {(verification.state === 'VERIFIED' || verification.state === 'COMPLETED') && (
                          <div className="space-y-3">
                            <p className="text-xs text-text-secondary">Acciones autorizadas tras la verificación:</p>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <input
                                value={newEmail}
                                onChange={e => setNewEmail(e.target.value)}
                                placeholder="Nuevo email del usuario"
                                type="email"
                                className="flex-1 bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary placeholder:text-text-secondary"
                              />
                              <button onClick={requestEmailChange} className="px-3.5 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary-hover inline-flex items-center gap-1.5 transition-colors">
                                <Mail className="w-4 h-4" /> Solicitar cambio de email <FeatureBadge kind="ok" note="Bifásico: queda pendiente hasta completar confirmación" />
                              </button>
                            </div>
                            {verification.state === 'COMPLETED' && (
                              <p className="text-sm text-success font-medium">Email actualizado correctamente.</p>
                            )}
                          </div>
                        )}

                        {verification.state === 'EMAIL_CONFIRM_SENT' && verification.newEmail && (
                          <div className="bg-bg-elevated border border-border rounded-lg p-3.5 space-y-2">
                            <p className="text-sm text-white">Cambio pendiente hacia <strong>{verification.newEmail}</strong>.</p>
                            <p className="text-xs text-text-muted">
                              Con backend, este paso se completa cuando el usuario confirma desde el email enviado a la nueva dirección
                              (⚠️ requiere Supabase/Auth + SMTP). Localmente podés completarlo acá porque la verificación de identidad previa fue correcta:
                            </p>
                            <button onClick={completeEmailChange} className="px-3.5 py-2 rounded-lg text-sm font-semibold bg-success/15 text-success border border-success/30 hover:bg-success/25 inline-flex items-center gap-1.5 transition-colors">
                              <RefreshCw className="w-4 h-4" /> Completar cambio de email (verificación previa ok)
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={startVerifyOpen}
        title="Iniciar verificación de identidad"
        confirmLabel="Generar código temporal"
        onCancel={() => setStartVerifyOpen(false)}
        onConfirm={startVerification}
      >
        <p>Se generará un código temporal de un solo uso para <strong className="text-white">{selected?.userName}</strong> (ticket {selected?.ticketNumber}).</p>
        <p className="text-xs text-text-muted">Del usuario afectado: se registrará en auditoría. El código solo se muestra una vez y se almacena únicamente su hash.</p>
      </ConfirmModal>

      <ConfirmModal
        open={pwResetConfirmOpen}
        title="Iniciar restablecimiento de contraseña"
        confirmLabel="Iniciar proceso"
        onCancel={() => setPwResetConfirmOpen(false)}
        onConfirm={initiatePasswordReset}
      >
        <p>El OWNER solo inicia el proceso: nunca ve ni define la contraseña del usuario.</p>
        <p className="text-warning">⚠️ La entrega segura del enlace/código y la aplicación del nuevo hash requieren Supabase Auth (backend). Sin backend esta solicitud queda registrada pero no se entrega.</p>
      </ConfirmModal>
    </OwnerLayout>
  );
}
