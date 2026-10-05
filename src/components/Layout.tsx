import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SupportFloatingButton } from './SupportFloatingButton';
import {
  Home, Compass, Grid3X3, Heart, Library, LayoutDashboard,
  Settings, LogOut, Menu, X, Search, Bell, User, ChevronDown,
  Shield, Radio, LifeBuoy
} from 'lucide-react';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { icon: Home, label: 'Inicio', path: '/' },
    { icon: Compass, label: 'Explorar', path: '/explore' },
    { icon: Grid3X3, label: 'Categorías', path: '/categories' },
    ...(user ? [
      { icon: Heart, label: 'Siguiendo', path: '/following' },
      { icon: Library, label: 'Biblioteca', path: '/library' },
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    ] : []),
    { icon: LifeBuoy, label: 'Centro de Soporte', path: '/support' },
  ];

  const bottomItems = user ? [
    { icon: User, label: 'Perfil', path: `/u/${user.username}` },
    { icon: Settings, label: 'Configuración', path: '/settings' },
    ...(user.role === 'OWNER' ? [{ icon: Shield, label: 'Owner Panel', path: '/owner' }] : []),
    ...(user.role === 'ADMIN' || user.role === 'OWNER' ? [{ icon: Shield, label: 'Admin', path: '/admin' }] : []),
  ] : [];

  return (
    <div className="min-h-screen bg-surface-deep flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-surface border-r border-surface-2 fixed h-full z-40">
        <div className="p-4 border-b border-surface-2">
          <Link to="/" className="block">
            {/* Logo oficial: el PNG ya contiene la palabra NEXURA (no agregar texto duplicado) */}
            <img src="/brand/nexura-1nuevo-logo-original.png" alt="NEXURA" className="h-9 w-auto max-w-[176px]" />
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                location.pathname === item.path
                  ? 'bg-primary/20 text-primary-hover'
                  : 'text-text-secondary hover:bg-surface-2 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-surface-2 space-y-1">
          {bottomItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                location.pathname === item.path
                  ? 'bg-primary/20 text-primary-hover'
                  : 'text-text-secondary hover:bg-surface-2 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
          {user && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:bg-surface-2 hover:text-error w-full transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Cerrar sesión
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 h-full bg-surface flex flex-col animate-slide-in">
            <div className="p-4 border-b border-surface-2 flex items-center justify-between">
              <Link to="/" className="block" onClick={() => setSidebarOpen(false)}>
                {/* Logo oficial: el PNG ya contiene la palabra NEXURA (no agregar texto duplicado) */}
                <img src="/brand/nexura-1nuevo-logo-original.png" alt="NEXURA" className="h-9 w-auto max-w-[200px]" />
              </Link>
              <button onClick={() => setSidebarOpen(false)} className="text-text-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    location.pathname === item.path
                      ? 'bg-primary/20 text-primary-hover'
                      : 'text-text-secondary hover:bg-surface-2 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="p-3 border-t border-surface-2 space-y-1">
              {bottomItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:bg-surface-2 hover:text-white"
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
              {user && (
                <button
                  onClick={() => { handleLogout(); setSidebarOpen(false); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:bg-surface-2 hover:text-error w-full"
                >
                  <LogOut className="w-5 h-5" />
                  Cerrar sesión
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-lg border-b border-surface-2">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-text-secondary hover:text-white"
              >
                <Menu className="w-6 h-6" />
              </button>
              <Link to="/" className="lg:hidden block">
                {/* Logo oficial: el PNG ya contiene la palabra NEXURA (no agregar texto duplicado) */}
                <img src="/brand/nexura-1nuevo-logo-original.png" alt="NEXURA" className="h-8 w-auto max-w-[150px]" />
              </Link>
              <div className="hidden sm:flex items-center bg-surface-2 border border-border rounded-lg px-3 py-1.5 w-64 focus-within:border-primary-hover">
                <Search className="w-4 h-4 text-text-secondary mr-2" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-transparent text-sm text-white placeholder-text-secondary outline-none w-full"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 hover:bg-surface-2 rounded-lg px-2 py-1.5 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-medium">
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:block text-sm text-white">{user.displayName}</span>
                    <ChevronDown className="w-4 h-4 text-text-secondary hidden sm:block" />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-surface-2 border border-border rounded-lg shadow-xl py-1">
                      <Link
                        to={`/u/${user.username}`}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-border hover:text-white"
                      >
                        <User className="w-4 h-4" /> Mi perfil
                      </Link>
                      <Link
                        to="/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-border hover:text-white"
                      >
                        <LayoutDashboard className="w-4 h-4" /> Dashboard
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-border hover:text-white"
                      >
                        <Settings className="w-4 h-4" /> Configuración
                      </Link>
                      <hr className="border-border my-1" />
                      <button
                        onClick={() => { handleLogout(); setUserMenuOpen(false); }}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-error hover:bg-border w-full text-left"
                      >
                        <LogOut className="w-4 h-4" /> Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="text-sm text-text-secondary hover:text-white px-3 py-1.5"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    to="/register"
                    className="text-sm bg-primary hover:bg-primary-hover text-white px-4 py-1.5 rounded-lg transition-colors"
                  >
                    Registrarse
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>

      {/* Botón flotante de Soporte Técnico (reutiliza /support) */}
      <SupportFloatingButton />
    </div>
  );
}
