/**
 * Control Center OWNER — Configuración de plataforma (11 subsecciones),
 * Seguridad y Actividad/Auditoría.
 *
 * Honestidad funcional: cada bloque indica ✅ FUNCIONAL (persistencia real en
 * la arquitectura local actual) o ⚠️ REQUIERE BACKEND (preparado/documentado,
 * no simulado). No se guardan secretos en localStorage.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { OwnerLayout, FeatureBadge, BackendNotice, ConfirmModal } from './OwnerLayout';
import { AdminService, type PlatformSettings } from '../../services/admin.service';
import {
  StreamingSettingsService,
  MAX_VIEWERS_PRESETS,
  LIVE_DURATION_OPTIONS,
  QUALITY_OPTIONS,
  formatLiveDuration,
  formatMaxViewers,
  type StreamingSettings,
} from '../../services/streamingSettings.service';
import { getAllCategories } from '../../services/category';
import { ReportService } from '../../services/report.service';
import * as db from '../../services/database';
import type { AuditLog } from '../../types';
import {
  Settings2, Users, Video, Radio, MessageSquare, CreditCard, Shield,
  Palette, Bell, Server, Download, Search, Wrench, CheckCircle2, AlertTriangle, Activity,
  Lock, ShieldCheck, Image as ImageIcon, Code2, Star, Globe, Type, Shapes,
} from 'lucide-react';

const fmt = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });
};

// ============================================================
// SUBSECCIONES
// ============================================================

type SectionId = 'general' | 'users' | 'content' | 'streaming' | 'community' | 'notifications' | 'monetization' | 'ia' | 'appearance' | 'system';

const SECTIONS: { id: SectionId; label: string; icon: React.ElementType }[] = [
  { id: 'general', label: 'General', icon: Settings2 },
  { id: 'users', label: 'Usuarios', icon: Users },
  { id: 'content', label: 'Contenido', icon: Video },
  { id: 'streaming', label: 'Streaming', icon: Radio },
  { id: 'community', label: 'Comunidad', icon: MessageSquare },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
  { id: 'monetization', label: 'Monetización', icon: CreditCard },
  { id: 'ia', label: 'NEXURA IA', icon: Activity },
  { id: 'appearance', label: 'Apariencia', icon: Palette },
  { id: 'system', label: 'Sistema', icon: Server },
];

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
        checked ? 'bg-primary' : 'bg-bg-elevated border border-border'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

function SectionShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-5">
      <h2 className="text-base font-semibold text-white mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Row({ label, note, badge, children }: { label: string; note?: string; badge?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0">
      <div className="min-w-0">
        <p className="text-sm text-white flex items-center gap-2 flex-wrap">{label} {badge}</p>
        {note && <p className="text-xs text-text-muted mt-0.5">{note}</p>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

// ============================================================
// PÁGINA PRINCIPAL DE CONFIGURACIÓN
// ============================================================

export function OwnerSettingsPage() {
  const { user } = useAuth();
  const [section, setSection] = useState<SectionId>('general');
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [maintenance, setMaintenance] = useState(() => AdminService.getMaintenanceConfig());
  const [toast, setToast] = useState<string | null>(null);
  const [confirmMantOff, setConfirmMantOff] = useState(false);
  const [mantMessage, setMantMessage] = useState('');
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!user) return;
    try {
      AdminService.getDashboardStats(user.id); // valida rol OWNER + cuenta activa
      setSettings(AdminService.getPlatformSettings());
      setDenied(false);
    } catch {
      setDenied(true);
    }
  }, [user]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const save = (updates: Partial<PlatformSettings>, msg: string) => {
    if (!user) return;
    try {
      setSettings(AdminService.updatePlatformSettings(user.id, updates));
      setToast(msg);
    } catch {
      setToast('No se pudo guardar (permisos).');
    }
  };

  const toggleMaintenance = (enabled: boolean) => {
    if (!user) return;
    if (!enabled) { setConfirmMantOff(true); return; }
    AdminService.setMaintenance(true, mantMessage || undefined);
    setMaintenance(AdminService.getMaintenanceConfig());
    setToast('✅ Modo mantenimiento activado (flag persistente local). Ver aclaración más abajo.');
  };

  const confirmMaintenanceOff = () => {
    AdminService.setMaintenance(false);
    setMaintenance(AdminService.getMaintenanceConfig());
    setConfirmMantOff(false);
    setToast('✅ Modo mantenimiento desactivado.');
  };

  if (denied) {
    return (
      <OwnerLayout title="Configuración">
        <div className="bg-bg-card border border-border rounded-xl p-8 text-center text-text-secondary">
          Acceso restringido al propietario de la plataforma.
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout title="Configuración de plataforma" subtitle="Ajustes estructurales reales · el logo y la paleta oficial no se modifican desde este panel">
      {toast && (
        <div className="fixed bottom-4 right-4 z-[80] max-w-sm bg-surface border border-border rounded-xl px-4 py-3 text-sm text-white shadow-2xl">
          {toast}
        </div>
      )}

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Navegación de secciones */}
        <nav className="lg:col-span-1 space-y-1">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                section === s.id ? 'bg-primary/20 text-primary-hover' : 'text-text-secondary hover:bg-surface-2 hover:text-white'
              }`}
            >
              <s.icon className="w-4 h-4 shrink-0" /> {s.label}
            </button>
          ))}
        </nav>

        {/* Contenido */}
        <div className="lg:col-span-3 space-y-6">
          {!settings ? (
            <div className="h-64 bg-bg-card border border-border rounded-xl animate-pulse" />
          ) : (
            <>
              {section === 'general' && (
                <SectionShell title="General">
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Nombre de la plataforma</label>
                    <input
                      defaultValue={settings.platformName}
                      onBlur={e => { const v = e.target.value.trim(); if (v && v !== settings.platformName) save({ platformName: v }, '✅ Nombre guardado.'); }}
                      className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary"
                    />
                    <p className="text-[11px] text-text-muted mt-1.5">
                      Se aplica a textos de la plataforma. El logo oficial de NEXURA no se modifica desde este panel.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Descripción</label>
                    <textarea
                      defaultValue={settings.description}
                      onBlur={e => { const v = e.target.value.trim(); if (v && v !== settings.description) save({ description: v }, '✅ Descripción guardada.'); }}
                      rows={3}
                      className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary"
                    />
                  </div>
                  <Row
                    label="Permitir registro de nuevos usuarios"
                    badge={<FeatureBadge kind="ok" />}
                    note="Puerta real sobre la página de registro: RegisterPage consulta isRegistrationEnabled()."
                  >
                    <Toggle
                      checked={settings.registrationEnabled}
                      onChange={v => save({ registrationEnabled: v }, v ? '✅ Registro habilitado.' : '✅ Registro deshabilitado temporalmente.')}
                    />
                  </Row>
                  <p className="text-[11px] text-text-muted">Última actualización: {fmt(settings.updatedAt)}</p>
                </SectionShell>
              )}

              {section === 'users' && (
                <SectionShell title="Usuarios">
                  <Row
                    label="Gestión completa de usuarios"
                    badge={<FeatureBadge kind="ok" />}
                    note="Buscar, suspender (con motivo auditado), reactivar, cerrar sesiones y eliminar con doble confirmación."
                  >
                    <Link to="/owner/users" className="text-sm text-primary-hover hover:underline">Abrir →</Link>
                  </Row>
                  <Row
                    label="Promover / degradar roles de staff (ADMIN, MODERATOR)"
                    badge={<FeatureBadge kind="backend" />}
                    note="La lógica de roles existe (AuthorizationService + database.setUserRole), pero exponerla sin verificación de identidad del destinatario y RLS server-side sería inseguro. Queda preparada para cuando haya backend; hoy NO se ofrece una UI que simule esa seguridad."
                  />
                  <Row
                    label="Política de contraseñas (longitud/complejidad)"
                    badge={<FeatureBadge kind="backend" />}
                    note="La validación definitiva debe ocurrir en el servidor junto con el hash. El cambio propio de contraseña sí es real (ver Seguridad)."
                  />
                  <Row label="Autenticación de dos factores (2FA)" badge={<FeatureBadge kind="soon" />} note="Requiere proveedor TOTP server-side." />
                </SectionShell>
              )}

              {section === 'content' && (
                <SectionShell title="Contenido">
                  <Row label="Canales — listado real" badge={<FeatureBadge kind="ok" />}>
                    <Link to="/owner/channels" className="text-sm text-primary-hover hover:underline">Abrir →</Link>
                  </Row>
                  <Row label="Lives — estado real de transmisiones" badge={<FeatureBadge kind="ok" />}>
                    <Link to="/owner/lives" className="text-sm text-primary-hover hover:underline">Abrir →</Link>
                  </Row>
                  <Row label="Reels — listado real (views, likes, duración)" badge={<FeatureBadge kind="ok" />}>
                    <Link to="/owner/reels" className="text-sm text-primary-hover hover:underline">Abrir →</Link>
                  </Row>
                  <Row label="Calendario de emisiones" badge={<FeatureBadge kind="ok" />}>
                    <Link to="/owner/calendar" className="text-sm text-primary-hover hover:underline">Abrir →</Link>
                  </Row>
                  <Row label="Reportes de contenido (cola de moderación)" badge={<FeatureBadge kind="ok" note="ReportService existente" />}>
                    <Link to="/moderation/reports" className="text-sm text-primary-hover hover:underline">Abrir →</Link>
                  </Row>
                  <div>
                    <p className="text-xs text-text-muted mb-2 mt-2">
                      Categorías del catálogo — desactivar oculta la categoría del público (reversible, no borra contenido):
                    </p>
                    <CategoryToggles ownerId={user?.id ?? null} onToast={m => setToast(m)} />
                  </div>
                  <Row
                    label="Cantidad máxima de canales por usuario"
                    badge={<FeatureBadge kind="ok" note="Regla vigente en database.ts" />}
                    note="El sistema local permite un canal por usuario. Cambiar ese límite es un cambio de código validado en servidor cuando exista backend."
                  />
                  <Row label="Transcodificación / compresión de video" badge={<FeatureBadge kind="backend" />} note="Requiere pipeline de transcoding server-side." />
                </SectionShell>
              )}

              {section === 'streaming' && (
                <StreamingSettingsSection ownerId={user?.id ?? null} onToast={m => setToast(m)} />
              )}

              {section === 'community' && (
                <SectionShell title="Comunidad">
                  <Row label="Seguimientos" badge={<FeatureBadge kind="ok" note="Sistema real de follows en la app" />} note="Los usuarios pueden seguir canales; la gestión masiva desde el panel requiere backend." />
                  <Row label="Moderación de reportes" badge={<FeatureBadge kind="ok" />}>
                    <Link to="/moderation/reports" className="text-sm text-primary-hover hover:underline">Abrir →</Link>
                  </Row>
                  <Row label="Comentarios" badge={<FeatureBadge kind="backend" />} note="La moderación de comentarios a escala requiere validación y persistencia server-side." />
                  <Row label="Chat — filtrado automático de lenguaje ofensivo" badge={<FeatureBadge kind="backend" />} note="Requiere servicio de moderación de texto en servidor." />
                  <Row label="Chat — modo lento (slow mode)" badge={<FeatureBadge kind="backend" />} note="Rate limiting real exige servidor de chat." />
                  <Row label="Chat — límite de caracteres por mensaje" badge={<FeatureBadge kind="backend" />} note="Validación server-side pendiente." />
                  <Row label="Emojis personalizados" badge={<FeatureBadge kind="soon" />} note="Requiere storage + CDN." />
                </SectionShell>
              )}

              {section === 'monetization' && (
                <SectionShell title="Monetización">
                  <BackendNotice>
                    Requiere configuración de pagos. No existe backend de pasarela todavía: esta sección documenta la
                    estructura preparada para la integración futura. <strong className="text-white">No se simulan cobros ni payouts.</strong>
                  </BackendNotice>
                  <Row label="Suscripciones" badge={<FeatureBadge kind="backend" />} note="Requiere pasarela real + webhooks server-side." />
                  <Row label="Donaciones" badge={<FeatureBadge kind="backend" />} note="Requiere pasarela real + verificación de identidad del destinatario en servidor." />
                  <Row label="Comisiones de la plataforma" badge={<FeatureBadge kind="backend" />} note="Debe definirse en el proveedor de pagos, nunca en el cliente." />
                  <Row label="PayPal" badge={<FeatureBadge kind="backend" />} note="Integración server-side con credenciales guardadas SOLO en el servidor (jamás en el frontend ni en localStorage)." />
                  <Row label="Mercado Pago" badge={<FeatureBadge kind="backend" />} note="Ídem: access tokens privativos excluidos por diseño del navegador." />
                </SectionShell>
              )}

              {section === 'ia' && (
                <SectionShell title="NEXURA IA">
                  <Row label="Estado" badge={<FeatureBadge kind="soon" />} note="Asistente presente en la interfaz pública (Explorar); sin modelo server-side conectado todavía." />
                  <Row label="Funciones disponibles hoy" badge={<FeatureBadge kind="ok" note="Solo UI" />} note="Sugerencias de descubrimiento basadas en datos locales del catálogo. No hay generación IA real." />
                  <Row label="Configuración de proveedor IA (API keys)" badge={<FeatureBadge kind="backend" />} note="Las claves de cualquier proveedor de IA deben vivir exclusivamente en el servidor. Por regla de seguridad NO se ofrece un campo para pegar secretos en el navegador." />
                  <Row label="Moderación asistida por IA" badge={<FeatureBadge kind="backend" />} note="Requiere procesamiento server-side sobre el flujo de contenido." />
                </SectionShell>
              )}

              {section === 'appearance' && (
                <>
                  <SectionShell title="Apariencia">
                    <p className="text-sm text-text-secondary leading-relaxed">
                      La identidad visual de NEXURA está centralizada y protegida para mantener la coherencia visual de toda la plataforma.
                    </p>

                    {/* Estado actual de la identidad visual (solo informativo, sin edición) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-bg-elevated border border-border rounded-xl p-4 flex items-start gap-3">
                        <ImageIcon className="w-4 h-4 text-primary-hover mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">Logo oficial</p>
                          <p className="text-xs text-text-muted mt-1 leading-relaxed">
                            Activo y centralizado en los assets <code className="text-primary-hover">/brand/*</code>. No se edita desde este panel.
                          </p>
                        </div>
                      </div>
                      <div className="bg-bg-elevated border border-border rounded-xl p-4 flex items-start gap-3">
                        <Palette className="w-4 h-4 text-primary-hover mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">Paleta principal</p>
                          <p className="text-xs text-text-muted mt-1 leading-relaxed">Azul marino + azul eléctrico.</p>
                          <div className="flex items-center gap-2 mt-2">
                            {[
                              { hex: '#07111F', name: 'Navy — fondo' },
                              { hex: '#0D1B2A', name: 'Navy — superficie' },
                              { hex: '#1677FF', name: 'Azul eléctrico — marca' },
                              { hex: '#3D9BFF', name: 'Azul eléctrico — hover' },
                            ].map((c) => (
                              <span key={c.hex} className="flex items-center gap-1.5" title={`${c.name} (${c.hex})`}>
                                <span className="w-4 h-4 rounded-md border border-border shrink-0" style={{ backgroundColor: c.hex }} />
                                <span className="text-[10px] font-mono text-text-muted">{c.hex}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="bg-bg-elevated border border-border rounded-xl p-4 flex items-start gap-3">
                        <Code2 className="w-4 h-4 text-primary-hover mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">Tokens visuales</p>
                          <p className="text-xs text-text-muted mt-1 leading-relaxed">
                            Centralizados en <code className="text-primary-hover">src/index.css</code> (definición única de la paleta oficial).
                          </p>
                        </div>
                      </div>
                      <div className="bg-bg-elevated border border-border rounded-xl p-4 flex items-start gap-3">
                        <ShieldCheck className="w-4 h-4 text-success mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">Estado</p>
                          <p className="text-xs text-text-muted mt-1 leading-relaxed">
                            Identidad visual activa en toda la plataforma.
                          </p>
                          <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold border rounded-full px-2 py-0.5 bg-success/10 text-success border-success/30">
                            Identidad visual activa
                          </span>
                        </div>
                      </div>
                    </div>

                    <Row
                      label="Edición desde este panel"
                      badge={<FeatureBadge kind="soon" />}
                      note="No disponible actualmente: logo y paleta no pueden modificarse desde el Control Center. Cualquier cambio de identidad exige despliegue controlado sobre /brand/* y src/index.css."
                    >
                      <Lock className="w-4 h-4 text-text-muted" />
                    </Row>
                  </SectionShell>

                  <SectionShell title="Administración visual futura">
                    <p className="text-sm text-text-secondary leading-relaxed">
                      Próximamente esta sección podrá permitir administrar, desde el Control Center, los elementos de la identidad visual de la plataforma:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {[
                        { icon: ImageIcon, label: 'Logo principal' },
                        { icon: Star, label: 'Favicon' },
                        { icon: Type, label: 'Nombre de la plataforma' },
                        { icon: Shapes, label: 'Elementos visuales de marca' },
                        { icon: Palette, label: 'Colores principales' },
                        { icon: Globe, label: 'Otros elementos de identidad visual' },
                      ].map((item) => (
                        <div key={item.label} className="bg-bg-elevated border border-border rounded-xl p-3.5 flex items-center gap-2.5">
                          <item.icon className="w-4 h-4 text-primary-hover shrink-0" />
                          <span className="text-sm text-white min-w-0">{item.label}</span>
                          <span className="ml-auto shrink-0 inline-flex items-center text-[11px] font-semibold border rounded-full px-2 py-0.5 bg-bg-card text-text-muted border-border">
                            🚧 Próximamente
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed">
                      Preparado para futura administración. Ninguna de estas opciones está operativa hoy: no se modifica el logo, la paleta ni los assets de <code>/brand/*</code> desde este panel.
                    </p>
                  </SectionShell>
                </>
              )}

              {section === 'notifications' && (
                <SectionShell title="Notificaciones">
                  <Row
                    label="Notificaciones internas del sistema"
                    badge={<FeatureBadge kind="ok" note="NotificationService existente" />}
                    note="Soporte, estados de tickets y acciones ya generan notificaciones reales dentro de la app (campana)."
                  />
                  <Row label="Emails transaccionales (registro, recuperación, avisos)" badge={<FeatureBadge kind="backend" />} note="Requiere proveedor SMTP/Resend/SendGrid server-side. La plantilla base existe en config.service (email.from) pero el envío no puede realizarse desde el navegador de forma segura." />
                  <Row label="Push notifications" badge={<FeatureBadge kind="backend" />} note="Requiere service worker + VAPID keys gestionadas en servidor." />
                </SectionShell>
              )}

              {section === 'system' && (
                <>
                  <SectionShell title="Sistema">
                    <Row label="Versión de la aplicación" badge={<FeatureBadge kind="ok" />} note="Fuente: ConfigService (app.version).">
                      <span className="text-sm text-white font-mono">v1.0.0</span>
                    </Row>
                    <Row label="Infraestructura (media server, colas, storage)" badge={<FeatureBadge kind="ok" note="Vistas existentes del panel" />}>
                      <Link to="/owner/infrastructure" className="text-sm text-primary-hover hover:underline">Abrir →</Link>
                    </Row>
                    <Row
                      label="Backup / exportación de datos"
                      badge={<FeatureBadge kind="ok" note="Export JSON local" />}
                      note="Con PostgreSQL/Supabase el backup se gestiona en el servidor. Localmente: descargá un snapshot de los datos de la app (excluye el token de sesión propio)."
                    >
                      <button
                        onClick={() => {
                          const dump: Record<string, unknown> = {};
                          for (let i = 0; i < localStorage.length; i++) {
                            const k = localStorage.key(i);
                            if (!k || k === 'nexura_token') continue;
                            dump[k] = safeParse(localStorage.getItem(k));
                          }
                          const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `nexura-export-${new Date().toISOString().slice(0, 10)}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="inline-flex items-center gap-1.5 text-sm text-primary-hover hover:underline"
                      >
                        <Download className="w-4 h-4" /> Exportar datos (JSON)
                      </button>
                    </Row>
                    <Row label="Logs del sistema" badge={<FeatureBadge kind="ok" note="Auditoría compartida" />}>
                      <Link to="/owner/activity" className="text-sm text-primary-hover hover:underline">Ver logs →</Link>
                    </Row>
                  </SectionShell>

                  <SectionShell title="Modo mantenimiento">
                    <div className="flex items-center justify-between gap-4 py-1">
                      <p className="text-sm text-white flex items-center gap-2 flex-wrap">
                        Estado actual:
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${maintenance.enabled ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                          {maintenance.enabled ? 'ACTIVADO' : 'DESACTIVADO'}
                        </span>
                        <FeatureBadge kind="ok" note="Flag persistente; la página /maintenance existe en la app" />
                      </p>
                      <Toggle checked={maintenance.enabled} onChange={toggleMaintenance} />
                    </div>
                    {!maintenance.enabled && (
                      <div>
                        <label className="block text-xs text-text-muted mb-1.5">Mensaje personalizado (opcional):</label>
                        <input
                          value={mantMessage}
                          onChange={e => setMantMessage(e.target.value)}
                          placeholder="Ej.: Volvemos en 30 minutos"
                          className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary placeholder:text-text-secondary"
                        />
                      </div>
                    )}
                    <BackendNotice>
                      El flag y la página de mantenimiento funcionan en esta arquitectura. Sin backend no puede garantizarse
                      el bloqueo HTTP global de <strong className="text-white">todos</strong> los visitantes simultáneos (respuesta 503
                      desde el servidor/edge): eso es ⚠️ REQUIERE BACKEND y no está simulado.
                    </BackendNotice>
                  </SectionShell>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmMantOff}
        title="Desactivar modo mantenimiento"
        confirmLabel="Desactivar"
        onCancel={() => setConfirmMantOff(false)}
        onConfirm={confirmMaintenanceOff}
      >
        <p>La plataforma volverá a su estado normal. La acción queda registrada en auditoría.</p>
      </ConfirmModal>
    </OwnerLayout>
  );
}

function safeParse(v: string | null) {
  try { return v ? JSON.parse(v) : v; } catch { return v; }
}

// ---- Toggles de categorías (funcional sobre category.ts) ----
function CategoryToggles({ ownerId, onToast }: { ownerId: string | null; onToast: (m: string) => void }) {
  const [tick, force] = useState(0);
  const cats = useMemo(() => { try { return getAllCategories(); } catch { return []; } }, [tick, ownerId]);

  if (cats.length === 0) return <p className="text-xs text-text-muted">Datos no disponibles.</p>;
  return (
    <div className="space-y-1.5">
      {cats.map(c => (
        <div key={c.id} className="flex items-center justify-between gap-3 text-sm py-1 border-b border-border last:border-0">
          <span className="text-white truncate">{c.name}</span>
          <Toggle
            checked={c.active !== false}
            onChange={v => {
              if (!ownerId) return;
              try {
                AdminService.setCategoryActive(ownerId, c.id, v);
                force(x => x + 1);
                onToast(`✅ Categoría «${c.name}» ${v ? 'activada' : 'desactivada'}.`);
              } catch (e: any) {
                onToast(`Error: ${e?.message ?? 'no se pudo actualizar'}`);
              }
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ============================================================
// SEGURIDAD (panel del OWNER sobre su propia cuenta)
// ============================================================

export function OwnerSecurityPage() {
  const { user, refreshUser } = useAuth();
  const [toast, setToast] = useState<string | null>(null);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwOpen, setPwOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionsTick, setSessionsTick] = useState(0);

  const sessions = useMemo(() => {
    try { return user ? AdminService.listSessionsForUser(user.id, user.id) : []; } catch { return []; }
  }, [user, sessionsTick]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const changePassword = () => {
    setError(null);
    if (!user) return;
    if (newPw !== confirmPw) { setError('La confirmación no coincide con la nueva contraseña.'); return; }
    if (newPw.length < 8) { setError('La nueva contraseña debe tener al menos 8 caracteres.'); return; }
    try {
      // Reutiliza la autenticación EXISTENTE: valida la contraseña actual
      // contra el hash almacenado y almacena el hash nuevo (bcrypt).
      db.changeUserPassword(user.id, currentPw, newPw);
      setPwOpen(false); setCurrentPw(''); setNewPw(''); setConfirmPw('');
      refreshUser();
      setToast('✅ Contraseña actualizada correctamente.');
    } catch (e: any) {
      const msg = String(e?.message ?? '');
      setError(msg.includes('INVALID_CREDENTIALS') ? 'La contraseña actual no es correcta.' : 'No se pudo cambiar la contraseña.');
    }
  };

  return (
    <OwnerLayout title="Seguridad" subtitle="Protección de la cuenta OWNER · reutiliza la autenticación existente">
      {toast && (
        <div className="fixed bottom-4 right-4 z-[80] max-w-sm bg-surface border border-border rounded-xl px-4 py-3 text-sm text-white shadow-2xl">
          {toast}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary-light" /> Cambiar contraseña
          </h2>
          <p className="text-xs text-text-muted">
            Requiere la contraseña actual. Solo se almacena el hash (nunca texto plano). Esta es la única vía
            permitida de modificar las credenciales del OWNER. <FeatureBadge kind="ok" />
          </p>
          {!pwOpen ? (
            <button onClick={() => setPwOpen(true)} className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary-hover transition-colors">
              Cambiar contraseña
            </button>
          ) : (
            <div className="space-y-3">
              <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Contraseña actual" autoComplete="current-password"
                className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary" />
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Nueva contraseña (mínimo 8 caracteres)" autoComplete="new-password"
                className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary" />
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Repetir nueva contraseña" autoComplete="new-password"
                className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary" />
              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex gap-2">
                <button onClick={changePassword} className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary-hover transition-colors">Guardar</button>
                <button onClick={() => { setPwOpen(false); setError(null); }} className="px-4 py-2 rounded-lg text-sm bg-bg-elevated text-text-secondary border border-border hover:text-white transition-colors">Cancelar</button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-bg-card border border-border rounded-xl p-5 space-y-3">
          <h2 className="text-base font-semibold text-white">Mis sesiones</h2>
          {sessions.length === 0 ? (
            <p className="text-sm text-text-muted">Datos no disponibles.</p>
          ) : (
            <ul className="space-y-1.5">
              {sessions.map((s, i) => (
                <li key={i} className="text-sm flex justify-between gap-3">
                  <span className="text-text-secondary">Iniciada {fmt(s.createdAt)}</span>
                  <span className={s.active ? 'text-success' : 'text-text-muted'}>{s.active ? 'Activa' : 'Expirada'}</span>
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={() => {
              if (!user) return;
              AdminService.closeAllSessions(user.id, user.id);
              setSessionsTick(x => x + 1);
              setToast('✅ Sesiones registradas cerradas. Si tu sesión actual sigue abierta en esta pestaña, al recargar deberás iniciar ingreso nuevamente.');
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-bg-elevated text-text-secondary border border-border hover:text-white transition-colors"
          >
            Cerrar todas mis sesiones <FeatureBadge kind="ok" note="Sesiones locales" />
          </button>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-bg-card border border-border rounded-xl p-5">
            <h2 className="text-base font-semibold text-white mb-2">Actividad reciente de mi cuenta</h2>
            <OwnerSelfActivity />
          </div>
          <BackendNotice>
            2FA, alertas de accesos sospechosos y bloqueo de IPs requieren backend (⚠️). Ninguna función de seguridad
            de servidor fue simulada: lo visible opera sobre la autenticación y auditoría existentes.
          </BackendNotice>
        </div>
      </div>
    </OwnerLayout>
  );
}

// ============================================================
// SECCIÓN STREAMING — configuraciones administrativas reales
// (persistencia local; aplicación al streaming pendiente de backend)
// ============================================================

const inputCls = 'bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary';
const btnPrimaryCls = 'px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
const btnSecondaryCls = 'px-4 py-2 rounded-lg text-sm font-medium bg-bg-elevated text-text-secondary border border-border hover:text-white transition-colors';

/** Etiqueta honesta: la config se guarda, pero aún no la aplica un media server. */
function PendingBackendTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold border rounded-full px-2 py-0.5 bg-warning/10 text-warning border-warning/30">
      <AlertTriangle className="w-3 h-3" /> {label}
    </span>
  );
}

function StreamingSettingsSection({ ownerId, onToast }: { ownerId: string | null; onToast: (m: string) => void }) {
  const [streaming, setStreaming] = useState<StreamingSettings>(() => StreamingSettingsService.getSettings());

  // 1) Capacidad asignable por servidor
  const capacityPresets = MAX_VIEWERS_PRESETS;
  const [capDraft, setCapDraft] = useState<string>(
    streaming.maxViewersPerServer !== null && !capacityPresets.some(p => p.value === streaming.maxViewersPerServer)
      ? String(streaming.maxViewersPerServer)
      : ''
  );

  useEffect(() => {
    if (streaming.maxViewersPerServer !== null &&
        !MAX_VIEWERS_PRESETS.some(p => p.value === streaming.maxViewersPerServer)) {
      setCapDraft(String(streaming.maxViewersPerServer));
    } else if (MAX_VIEWERS_PRESETS.some(p => p.value === streaming.maxViewersPerServer)) {
      setCapDraft('');
    }
  }, [streaming.maxViewersPerServer]);

  const saveCapacity = (value: number | null) => {
    if (!ownerId) { onToast('No se pudo guardar (permisos).'); return; }
    try {
      setStreaming(StreamingSettingsService.setMaxViewersPerServer(ownerId, value));
      onToast(`✅ Capacidad por servidor guardada: ${formatMaxViewers(value)}. Configuración administrativa guardada localmente — aplicación al streaming requiere backend.`);
    } catch {
      onToast('Valor inválido o sin permisos. Ingresá un número entero ≥ 1 o elegí "Sin límite".');
    }
  };

  const applyCustomCapacity = () => {
    const n = Number(capDraft.trim());
    if (!capDraft.trim() || !Number.isFinite(n) || Math.floor(n) < 1) {
      onToast('Ingresá un número entero de espectadores mayor que 0.');
      return;
    }
    saveCapacity(Math.floor(n));
  };

  // 2) Duración máxima de live
  const [durDraft, setDurDraft] = useState<string>('');
  const saveDuration = (minutes: number | null) => {
    if (!ownerId) { onToast('No se pudo guardar (permisos).'); return; }
    try {
      setStreaming(StreamingSettingsService.setMaxLiveDuration(ownerId, minutes));
      setDurDraft('');
      onToast(`✅ Duración máxima de live guardada: ${formatLiveDuration(minutes)}. Corte automático pendiente de backend.`);
    } catch {
      onToast('Duración inválida o sin permisos.');
    }
  };
  const applyCustomDuration = () => {
    const n = Number(durDraft.trim());
    if (!durDraft.trim() || !Number.isFinite(n) || Math.floor(n) < 1) {
      onToast('Ingresá una cantidad de minutos mayor que 0.');
      return;
    }
    saveDuration(Math.floor(n));
  };

  // 3) Calidad máxima
  const [qualityDraft, setQualityDraft] = useState<string>(streaming.maxQuality);
  useEffect(() => { setQualityDraft(streaming.maxQuality); }, [streaming.maxQuality]);
  const saveQuality = () => {
    if (!ownerId) { onToast('No se pudo guardar (permisos).'); return; }
    try {
      setStreaming(StreamingSettingsService.setMaxQuality(ownerId, qualityDraft));
      onToast(`✅ Calidad máxima guardada: ${qualityDraft}. Aplicación al streaming pendiente de backend.`);
    } catch {
      onToast('Calidad inválida o sin permisos.');
    }
  };

  return (
    <>
      <SectionShell title="Streaming">
        {/* Enlaces existentes — NO se modifican (infraestructura/servidores/colas solo se listan) */}
        <Row label="Infraestructura: servidores, colas y estado" badge={<FeatureBadge kind="ok" note="Vistas existentes del panel" />}>
          <Link to="/owner/infrastructure" className="text-sm text-primary-hover hover:underline">Abrir →</Link>
        </Row>
        <Row label="Colas de streaming" badge={<FeatureBadge kind="ok" />}>
          <Link to="/owner/infrastructure/queues" className="text-sm text-primary-hover hover:underline">Abrir →</Link>
        </Row>

        {/* 1) CAPACIDAD ASIGNABLE POR SERVIDOR */}
        <div className="py-3 border-b border-border last:border-0 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-white flex items-center gap-2 flex-wrap">
                Capacidad asignable por servidor
                <FeatureBadge kind="ok" note="Configuración administrativa real, persistente en este dispositivo" />
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                Política de NEXURA: espectadores máximos permitidos por servidor. Es una configuración
                administrativa — no afirma limitar físicamente un servidor hasta que exista un
                backend/media server que la aplique.
              </p>
            </div>
            <PendingBackendTag label="Aplicación en streaming: pendiente de backend" />
          </div>

          <p className="text-sm text-white">
            Capacidad actual:{' '}
            <strong className="text-primary-hover">
              {streaming.maxViewersPerServer === null
                ? 'Sin límite'
                : `${formatMaxViewers(streaming.maxViewersPerServer)} espectadores por servidor`}
            </strong>
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {capacityPresets.map(p => (
              <button
                key={p.label}
                onClick={() => saveCapacity(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  streaming.maxViewersPerServer === p.value
                    ? 'bg-primary/20 border-primary/60 text-primary-hover'
                    : 'bg-bg-card border-border text-text-secondary hover:text-white'
                }`}
              >
                {p.label}{p.value !== null ? ' espectadores' : ''}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              min={1}
              step={1}
              value={capDraft}
              onChange={e => setCapDraft(e.target.value)}
              placeholder="Valor personalizado (ej. 2500)"
              aria-label="Capacidad personalizada de espectadores por servidor"
              className={`w-56 ${inputCls}`}
            />
            <button onClick={applyCustomCapacity} className={btnPrimaryCls}>Guardar</button>
            <button
              onClick={() => saveCapacity(null)}
              className={`${streaming.maxViewersPerServer === null ? btnSecondaryCls + ' opacity-60' : btnSecondaryCls}`}
            >
              Sin límite
            </button>
          </div>
          <p className="text-[11px] text-text-muted">
            Última actualización de la configuración: {fmt(streaming.updatedAt)}
          </p>
        </div>

        {/* 2) DURACIÓN MÁXIMA DE LIVE / CORTE FORZADO */}
        <div className="py-3 border-b border-border last:border-0 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-white flex items-center gap-2 flex-wrap">
                Duración máxima de live / corte forzado
                <FeatureBadge kind="ok" note="Configuración administrativa real, persistente en este dispositivo" />
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                Define la duración máxima permitida para una transmisión. La configuración queda preparada
                para que el futuro backend/media server la aplique; hoy el live NO se corta realmente.
              </p>
            </div>
            <PendingBackendTag label="Corte automático del live: pendiente de backend" />
          </div>

          <p className="text-sm text-white">
            Duración máxima actual: <strong className="text-primary-hover">{formatLiveDuration(streaming.maxLiveDurationMinutes)}</strong>
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {LIVE_DURATION_OPTIONS.map(o => (
              <button
                key={o.label}
                onClick={() => saveDuration(o.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  streaming.maxLiveDurationMinutes === o.value
                    ? 'bg-primary/20 border-primary/60 text-primary-hover'
                    : 'bg-bg-card border-border text-text-secondary hover:text-white'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              min={1}
              step={1}
              value={durDraft}
              onChange={e => setDurDraft(e.target.value)}
              placeholder="Otros minutos (ej. 90)"
              aria-label="Duración máxima personalizada en minutos"
              className={`w-56 ${inputCls}`}
            />
            <button onClick={applyCustomDuration} className={btnPrimaryCls}>Guardar</button>
          </div>
        </div>

        {/* 3) CALIDAD MÁXIMA DE TRANSMISIÓN */}
        <div className="py-3 border-b border-border last:border-0 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-white flex items-center gap-2 flex-wrap">
                Calidad máxima de transmisión
                <FeatureBadge kind="ok" note="Configuración administrativa real, persistente en este dispositivo" />
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                Calidad máxima permitida por política de la plataforma. No modifica la configuración real
                de RTMP/HLS ni del media server.
              </p>
            </div>
            <PendingBackendTag label="Aplicación al streaming: pendiente de backend" />
          </div>

          <p className="text-sm text-white">
            Calidad máxima actual: <strong className="text-primary-hover">{streaming.maxQuality}</strong>
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {QUALITY_OPTIONS.map(q => (
              <button
                key={q}
                onClick={() => setQualityDraft(q)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  qualityDraft === q
                    ? 'bg-primary/20 border-primary/60 text-primary-hover'
                    : 'bg-bg-card border-border text-text-secondary hover:text-white'
                }`}
              >
                {q}
              </button>
            ))}
            <button
              onClick={saveQuality}
              disabled={qualityDraft === streaming.maxQuality}
              className={btnPrimaryCls}
            >
              {qualityDraft === streaming.maxQuality ? 'Guardada' : 'Guardar'}
            </button>
          </div>
        </div>
      </SectionShell>

      <BackendNotice>
        <strong className="text-white">Configuración administrativa guardada localmente — aplicación al streaming requiere backend.</strong>{' '}
        Estas tres opciones guardan la política de NEXURA de forma persistente (sobrevive a la recarga de la
        página y queda registrada en la auditoría como cambio de configuración), pero todavía no existe un
        backend/media server que limite físicamente espectadores, corte lives ni restrinja la calidad de las
        transmisiones. Cada opción muestra su etiqueta «pendiente de backend».
      </BackendNotice>
    </>
  );
}

function OwnerSelfActivity() {
  const { user } = useAuth();
  const events = useMemo(() => {
    try {
      return user ? AdminService.getRecentActivity(80).filter(e => e.actorId === user.id).slice(0, 10) : [];
    } catch { return []; }
  }, [user]);
  if (events.length === 0) return <p className="text-sm text-text-muted">Datos no disponibles.</p>;
  return (
    <ul className="space-y-2">
      {events.map(e => (
        <li key={e.id} className="text-sm flex justify-between gap-3">
          <span className="text-white truncate">
            {e.label}{e.details ? <span className="text-text-muted"> — {e.details}</span> : null}
          </span>
          <span className="text-xs text-text-muted whitespace-nowrap">{fmt(e.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}

// ============================================================
// ACTIVIDAD / AUDITORÍA
// ============================================================

export function OwnerActivityPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [q, setQ] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!user) return;
    try {
      AdminService.getDashboardStats(user.id);
      setLogs(AdminService.queryAuditLogs({ limit: 300 }));
    } catch {
      setDenied(true);
    }
  }, [user]);

  const actions = useMemo(() => Array.from(new Set(logs.map(l => l.action))).sort(), [logs]);

  const filtered = useMemo(() => {
    let list = logs;
    if (actionFilter) list = list.filter(l => l.action === actionFilter);
    const s = q.trim().toLowerCase();
    if (s) list = list.filter(l =>
      l.action.toLowerCase().includes(s) || l.details.toLowerCase().includes(s) ||
      l.targetId.toLowerCase().includes(s) || l.actorId.toLowerCase().includes(s)
    );
    return list;
  }, [logs, q, actionFilter]);

  const exportCsv = () => {
    const header = 'fecha,accion,actor,target_tipo,target_id,detalles\n';
    const rows = filtered.map(l =>
      [l.createdAt, l.action, l.actorId, l.targetType, l.targetId, `"${(l.details ?? '').replace(/"/g, '""')}"`].join(',')
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `nexura-auditoria-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const pendingReports = useMemo(() => {
    try { return ReportService.getPendingReports().length; } catch { return null; }
  }, []);

  if (denied) {
    return (
      <OwnerLayout title="Actividad">
        <div className="bg-bg-card border border-border rounded-xl p-8 text-center text-text-secondary">
          Acceso restringido al propietario de la plataforma.
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout title="Actividad y auditoría" subtitle={`${logs.length} eventos registrados · fuente: log de auditoría compartido`}>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar en detalles, actor u objetivo…"
            className="w-full bg-bg-card border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-primary placeholder:text-text-secondary" />
        </div>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
          className="bg-bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-primary">
          <option value="">Todas las acciones</option>
          {actions.map(a => <option key={a} value={a}>{AdminService.describeAuditAction(a)} ({a})</option>)}
        </select>
        <button onClick={exportCsv} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium bg-bg-card border border-border text-text-secondary hover:text-white transition-colors">
          <Download className="w-4 h-4" /> CSV <FeatureBadge kind="ok" />
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-text-muted flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5" /> Eventos totales</p>
          <p className="text-xl font-bold text-white mt-1">{logs.length.toLocaleString('es')}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-text-muted flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Tipos de acción</p>
          <p className="text-xl font-bold text-white mt-1">{actions.length}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-text-muted flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Reportes pendientes</p>
          <p className="text-xl font-bold text-white mt-1">{pendingReports ?? 'Datos no disponibles'}</p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl p-8 text-center text-sm text-text-secondary">
          Datos no disponibles: todavía no hay eventos que coincidan. La auditoría registra acciones reales a medida que ocurren.
        </div>
      ) : (
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-muted border-b border-border bg-bg-elevated">
                  <th className="px-4 py-2.5 font-medium whitespace-nowrap">Fecha</th>
                  <th className="px-4 py-2.5 font-medium whitespace-nowrap">Acción</th>
                  <th className="px-4 py-2.5 font-medium whitespace-nowrap">Actor</th>
                  <th className="px-4 py-2.5 font-medium whitespace-nowrap">Objetivo</th>
                  <th className="px-4 py-2.5 font-medium">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.slice(0, 200).map(l => (
                  <tr key={l.id} className="hover:bg-bg-elevated/50">
                    <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{fmt(l.createdAt)}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="text-white">{AdminService.describeAuditAction(l.action)}</span>
                      <span className="block text-[10px] font-mono text-text-muted">{l.action}</span>
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary font-mono text-xs whitespace-nowrap">{l.actorId.slice(0, 8)}</td>
                    <td className="px-4 py-2.5 text-text-secondary text-xs whitespace-nowrap">{l.targetType}: {l.targetId.slice(0, 8)}</td>
                    <td className="px-4 py-2.5 text-text-secondary max-w-[320px]"><span className="line-clamp-2">{l.details}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
}
