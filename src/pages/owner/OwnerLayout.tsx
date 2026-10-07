/**
 * Control Center OWNER — Layout de navegación lateral exclusiva.
 * Reutiliza la identidad visual de NEXURA (logo actual, paleta, tipografía).
 */
import React, { useState } from 'react';
import { Link, useLocation, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Home, Users, Radio, Film, CalendarDays, LifeBuoy, Settings, Shield,
  Activity, Menu, X, LogOut, Video, LayoutGrid, ChevronLeft,
} from 'lucide-react';

interface OwnerLayoutProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { to: '/owner', label: 'Dashboard', icon: Home, end: true },
  { to: '/owner/users', label: 'Usuarios', icon: Users, end: false },
  { to: '/owner/channels', label: 'Canales', icon: Video, end: false },
  { to: '/owner/lives', label: 'Lives', icon: Radio, end: false },
  { to: '/owner/reels', label: 'Reels', icon: Film, end: false },
  { to: '/owner/calendar', label: 'Calendario', icon: CalendarDays, end: false },
  { to: '/owner/support', label: 'Soporte', icon: LifeBuoy, end: false },
  { to: '/owner/settings', label: 'Configuración de plataforma', icon: Settings, end: false },
  { to: '/owner/security', label: 'Seguridad', icon: Shield, end: false },
  { to: '/owner/activity', label: 'Actividad', icon: Activity, end: false },
];

export function OwnerLayout({ title, subtitle, icon, children }: OwnerLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isItemActive = (item: { to: string; end: boolean }, pathname: string) => {
    if (item.end) return pathname === item.to;
    return pathname === item.to || pathname.startsWith(item.to + '/');
  };

  const sidebarContent = (onNavigate?: () => void) => (
    <>
      <div className="p-4 border-b border-surface-2 flex items-center justify-between">
        <Link to="/" className="block" onClick={onNavigate}>
          {/* Logo oficial: el PNG ya contiene la palabra NEXURA (no agregar texto duplicado) */}
          <img src="/brand/nexura-1nuevo-logo-original.png" alt="NEXURA" className="h-8 w-auto max-w-[160px]" />
        </Link>
        {onNavigate && (
          <button onClick={onNavigate} className="text-text-secondary lg:hidden" aria-label="Cerrar menú">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      <div className={`px-4 py-3 border-b border-surface-2 ${collapsed ? 'lg:hidden' : ''}`}>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-danger bg-danger/10 px-2.5 py-1 rounded-full">
          <Shield className="w-3 h-3" /> Control Center · OWNER
        </span>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={() =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isItemActive(item, location.pathname)
                  ? 'bg-primary/20 text-primary-hover'
                  : 'text-text-secondary hover:bg-surface-2 hover:text-white'
              } ${collapsed ? 'lg:justify-center' : ''}`
            }
            title={item.label}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className={collapsed ? 'hidden lg:inline' : ''}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-surface-2 space-y-1">
        <Link
          to="/"
          onClick={onNavigate}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:bg-surface-2 hover:text-white transition-colors ${collapsed ? 'lg:justify-center' : ''}`}
        >
          <LayoutGrid className="w-5 h-5 shrink-0" /> <span className={collapsed ? 'hidden lg:inline' : ''}>Volver a NEXURA</span>
        </Link>
        <button
          onClick={logout}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:bg-surface-2 hover:text-error w-full transition-colors ${collapsed ? 'lg:justify-center' : ''}`}
        >
          <LogOut className="w-5 h-5 shrink-0" /> <span className={collapsed ? 'hidden lg:inline' : ''}>Cerrar sesión</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-surface-deep flex">
      {/* Sidebar desktop exclusiva del OWNER */}
      <aside
        className={`hidden lg:flex flex-col bg-surface border-r border-surface-2 fixed h-full z-40 transition-all ${
          collapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        {sidebarContent()}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute -right-3 top-20 w-6 h-6 bg-surface-2 border border-border rounded-full flex items-center justify-center text-text-muted hover:text-white transition-colors"
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          <ChevronLeft className={`w-3.5 h-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </aside>

      {/* Drawer móvil */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
          <aside className="relative w-72 h-full bg-surface flex flex-col animate-slide-in">
            {sidebarContent(() => setDrawerOpen(false))}
          </aside>
        </div>
      )}

      {/* Contenido */}
      <main className={`flex-1 min-w-0 transition-all ${collapsed ? 'lg:ml-[76px]' : 'lg:ml-64'}`}>
        {/* Topbar móvil */}
        <div className="lg:hidden sticky top-0 z-30 bg-surface/95 backdrop-blur border-b border-surface-2 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setDrawerOpen(true)} className="text-white" aria-label="Abrir menú">
            <Menu className="w-6 h-6" />
          </button>
          <img src="/brand/nexura-1nuevo-logo-original.png" alt="NEXURA" className="h-7 w-auto max-w-[140px]" />
          <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-danger bg-danger/10 px-2 py-1 rounded-full">
            OWNER
          </span>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              {icon ?? <Shield className="w-5 h-5 text-primary-light" />}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">{title}</h1>
              {subtitle && <p className="text-text-secondary text-sm mt-0.5">{subtitle}</p>}
            </div>
            {user?.role === 'OWNER' && (
              <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 text-xs text-text-muted bg-bg-elevated border border-border rounded-full px-3 py-1.5 whitespace-nowrap">
                @{user.username}
              </span>
            )}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

/** Badge de honestidad funcional: ✅ FUNCIONAL / ⚠️ REQUIERE BACKEND / 🚧 PRÓXIMAMENTE */
export function FeatureBadge({ kind, note }: { kind: 'ok' | 'backend' | 'soon'; note?: string }) {
  const styles = {
    ok: 'bg-success/10 text-success border-success/30',
    backend: 'bg-warning/10 text-warning border-warning/30',
    soon: 'bg-bg-elevated text-text-muted border-border',
  };
  const labels = {
    ok: '✅ Funcional',
    backend: '⚠️ Requiere backend',
    soon: '🚧 Próximamente',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold border rounded-full px-2 py-0.5 ${styles[kind]}`}
      title={note}
    >
      {labels[kind]}
    </span>
  );
}

/** Aviso informativo sobre limitaciones de arquitectura actual. */
export function BackendNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-warning/5 border border-warning/30 rounded-xl p-3.5 flex items-start gap-2.5">
      <Activity className="w-4 h-4 text-warning mt-0.5 shrink-0" />
      <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">{children}</p>
    </div>
  );
}

/** Modal genérico con confirmación (doble confirmación opcional). */
export function ConfirmModal({
  open,
  title,
  danger,
  children,
  confirmLabel,
  requireTyped,
  typedValue,
  onTypedChange,
  onCancel,
  onConfirm,
  confirming,
}: {
  open: boolean;
  title: string;
  danger?: boolean;
  children: React.ReactNode;
  confirmLabel: string;
  requireTyped?: string;
  typedValue?: string;
  onTypedChange?: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  confirming?: boolean;
}) {
  if (!open) return null;
  const blocked = !!requireTyped && (typedValue ?? '') !== requireTyped;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />
      <div className="relative bg-surface border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <h3 className={`text-lg font-bold mb-2 ${danger ? 'text-danger' : 'text-white'}`}>{title}</h3>
        <div className="text-sm text-text-secondary space-y-3 mb-5">{children}</div>
        {requireTyped && (
          <div className="mb-5">
            <label className="block text-xs text-text-muted mb-1.5">
              Escribí <span className="font-mono font-bold text-white">{requireTyped}</span> para confirmar:
            </label>
            <input
              value={typedValue ?? ''}
              onChange={e => onTypedChange?.(e.target.value)}
              className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary"
              autoComplete="off"
            />
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-bg-elevated text-text-secondary hover:text-white border border-border transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={blocked || confirming}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              danger ? 'bg-danger text-white hover:bg-red-500' : 'bg-primary text-white hover:bg-primary-hover'
            }`}
          >
            {confirming ? 'Ejecutando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
