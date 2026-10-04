import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import * as db from '../services/database';
import type { User } from '../types';
import {
  Users, Shield, Activity, Radio, Heart, BarChart3,
  Search, Eye, Ban, CheckCircle, AlertTriangle,
  ChevronRight, Clock, Database, Server, HardDrive, LifeBuoy
} from 'lucide-react';

export function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    if (user && user.role !== 'ADMIN' && user.role !== 'OWNER') {
      navigate('/');
      addToast('error', 'No tienes permisos para acceder a esta página.');
    }
  }, [user, navigate, addToast]);

  if (!user || (user.role !== 'ADMIN' && user.role !== 'OWNER')) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <Shield className="w-16 h-16 text-danger mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Acceso denegado</h1>
        <p className="text-text-secondary">No tienes permisos de administrador.</p>
      </div>
    );
  }

  const stats = db.getPlatformStats();
  const allUsers = db.getAllUsers();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary-light" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Panel de Administración</h1>
          <p className="text-text-secondary text-sm">Gestiona la plataforma NEXURA</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Usuarios totales" value={stats.totalUsers} color="text-primary-light" />
        <StatCard icon={CheckCircle} label="Usuarios activos" value={stats.activeUsers} color="text-success" />
        <StatCard icon={AlertTriangle} label="Suspendidos" value={stats.suspendedUsers} color="text-warning" />
        <StatCard icon={Ban} label="Baneados" value={stats.bannedUsers} color="text-danger" />
        <StatCard icon={Radio} label="Canales" value={stats.totalChannels} color="text-primary-light" />
        <StatCard icon={Activity} label="Canales en vivo" value={stats.liveChannels} color="text-success" />
        <StatCard icon={Heart} label="Seguidores totales" value={stats.totalFollows} color="text-pink-400" />
        <StatCard icon={Shield} label="Moderadores" value={stats.moderators} color="text-warning" />
      </div>

      {/* Users Table */}
      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Usuarios registrados</h2>
          <span className="text-sm text-text-muted">{allUsers.length} usuarios</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Usuario</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Rol</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Registro</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map(u => (
                <tr key={u.id} className="border-b border-border hover:bg-bg-elevated/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white">
                        {u.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{u.displayName}</p>
                        <p className="text-xs text-text-muted">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      u.role === 'OWNER' ? 'bg-danger/10 text-danger' :
                      u.role === 'ADMIN' ? 'bg-primary/10 text-primary-light' :
                      u.role === 'MODERATOR' ? 'bg-warning/10 text-warning' :
                      'bg-bg-elevated text-text-muted'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      u.status === 'ACTIVE' ? 'bg-success/10 text-success' :
                      u.status === 'SUSPENDED' ? 'bg-warning/10 text-warning' :
                      'bg-danger/10 text-danger'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {new Date(u.createdAt).toLocaleDateString('es')}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/u/${u.username}`}
                      className="text-primary-light hover:text-primary text-sm flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function OwnerPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user && user.role !== 'OWNER') {
      navigate('/');
      addToast('error', 'Acceso restringido al propietario de la plataforma.');
    }
  }, [user, navigate, addToast]);

  if (!user || user.role !== 'OWNER') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <Shield className="w-16 h-16 text-danger mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Acceso restringido</h1>
        <p className="text-text-secondary">Solo el propietario de la plataforma puede acceder aquí.</p>
      </div>
    );
  }

  const stats = db.getPlatformStats();
  const allUsers = db.getAllUsers();
  const auditLogs = db.getAuditLogs(20);

  const filteredUsers = searchQuery
    ? allUsers.filter(u =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allUsers;

  const handleSuspendUser = (targetId: string) => {
    try {
      db.updateUser(targetId, { status: 'SUSPENDED' });
      db.createAuditLog(user.id, 'SUSPENDED_USER', 'user', targetId, 'Usuario suspendido desde panel OWNER');
      addToast('success', 'Usuario suspendido.');
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleActivateUser = (targetId: string) => {
    try {
      db.updateUser(targetId, { status: 'ACTIVE' });
      db.createAuditLog(user.id, 'ACTIVATED_USER', 'user', targetId, 'Usuario reactivado desde panel OWNER');
      addToast('success', 'Usuario reactivado.');
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleBanUser = (targetId: string) => {
    try {
      db.updateUser(targetId, { status: 'BANNED' });
      db.createAuditLog(user.id, 'BANNED_USER', 'user', targetId, 'Usuario baneado desde panel OWNER');
      addToast('success', 'Usuario baneado.');
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleUnbanUser = (targetId: string) => {
    try {
      db.updateUser(targetId, { status: 'ACTIVE' });
      db.createAuditLog(user.id, 'UNBANNED_USER', 'user', targetId, 'Usuario desbaneado desde panel OWNER');
      addToast('success', 'Usuario desbaneado.');
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleChangeRole = (targetId: string, newRole: User['role']) => {
    const targetUser = db.getUserById(targetId);
    if (!targetUser) return;
    if (targetUser.role === 'OWNER') {
      addToast('error', 'No se puede modificar el rol del OWNER.');
      return;
    }
    try {
      db.updateUser(targetId, { role: newRole });
      db.createAuditLog(user.id, 'ROLE_CHANGED', 'user', targetId, `Rol cambiado a ${newRole}`);
      addToast('success', `Rol cambiado a ${newRole}.`);
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-danger/10 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-danger" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Panel del Propietario</h1>
          <p className="text-text-secondary text-sm">Control total de la plataforma NEXURA</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard icon={Users} label="Usuarios" value={stats.totalUsers} color="text-primary-light" />
        <StatCard icon={CheckCircle} label="Activos" value={stats.activeUsers} color="text-success" />
        <StatCard icon={Radio} label="Canales" value={stats.totalChannels} color="text-primary-light" />
        <StatCard icon={Heart} label="Seguidores" value={stats.totalFollows} color="text-pink-400" />
        <StatCard icon={Shield} label="Admins" value={stats.admins} color="text-warning" />
      </div>

      {/* System Status */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Server className="w-4 h-4 text-success" />
            <span className="text-sm font-medium text-white">Servidores</span>
          </div>
          <p className="text-success text-sm">Operativo</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-success" />
            <span className="text-sm font-medium text-white">Base de datos</span>
          </div>
          <p className="text-success text-sm">Conectada</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="w-4 h-4 text-success" />
            <span className="text-sm font-medium text-white">Almacenamiento</span>
          </div>
          <p className="text-success text-sm">Operativo</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-success" />
            <span className="text-sm font-medium text-white">Streams activos</span>
          </div>
          <p className="text-white text-sm">{stats.liveChannels}</p>
        </div>
      </div>

      {/* User Management */}
      <div className="bg-bg-card border border-border rounded-xl overflow-hidden mb-8">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Administración de usuarios</h2>
          <div className="flex items-center gap-3">
            {/* Acceso al módulo de Soporte Técnico del Control Center */}
            <Link
              to="/owner/support"
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
            >
              <LifeBuoy className="w-3.5 h-3.5" /> Soporte Técnico
            </Link>
            <div className="flex items-center bg-bg-input border border-border rounded-lg px-3 py-1.5 w-full sm:w-64">
              <Search className="w-4 h-4 text-text-muted mr-2" />
              <input
                type="text"
                placeholder="Buscar usuario..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm text-white placeholder-text-muted outline-none w-full"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Usuario</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Rol</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Última actividad</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id} className="border-b border-border hover:bg-bg-elevated/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white">
                        {u.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{u.displayName}</p>
                        <p className="text-xs text-text-muted">@{u.username} • {u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.role !== 'OWNER' ? (
                      <select
                        value={u.role}
                        onChange={e => handleChangeRole(u.id, e.target.value as User['role'])}
                        className="bg-bg-input border border-border rounded px-2 py-1 text-xs text-white outline-none"
                      >
                        <option value="USER">USER</option>
                        <option value="MODERATOR">MODERATOR</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-danger/10 text-danger font-medium">OWNER</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      u.status === 'ACTIVE' ? 'bg-success/10 text-success' :
                      u.status === 'SUSPENDED' ? 'bg-warning/10 text-warning' :
                      'bg-danger/10 text-danger'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {new Date(u.lastLoginAt).toLocaleDateString('es')}
                  </td>
                  <td className="px-4 py-3">
                    {u.role !== 'OWNER' && (
                      <div className="flex items-center gap-1">
                        {u.status === 'ACTIVE' ? (
                          <>
                            <button
                              onClick={() => handleSuspendUser(u.id)}
                              className="text-xs px-2 py-1 bg-warning/10 text-warning rounded hover:bg-warning/20 transition-colors"
                              title="Suspender"
                            >
                              Suspender
                            </button>
                            <button
                              onClick={() => handleBanUser(u.id)}
                              className="text-xs px-2 py-1 bg-danger/10 text-danger rounded hover:bg-danger/20 transition-colors"
                              title="Banear"
                            >
                              Banear
                            </button>
                          </>
                        ) : u.status === 'SUSPENDED' ? (
                          <button
                            onClick={() => handleActivateUser(u.id)}
                            className="text-xs px-2 py-1 bg-success/10 text-success rounded hover:bg-success/20 transition-colors"
                          >
                            Reactivar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnbanUser(u.id)}
                            className="text-xs px-2 py-1 bg-success/10 text-success rounded hover:bg-success/20 transition-colors"
                          >
                            Desbanear
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log */}
      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-text-muted" />
            Registro de auditoría
          </h2>
        </div>
        <div className="divide-y divide-border">
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-text-muted">
              <p>No hay registros de auditoría todavía.</p>
            </div>
          ) : (
            auditLogs.map(log => (
              <div key={log.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center">
                    <Activity className="w-4 h-4 text-text-muted" />
                  </div>
                  <div>
                    <p className="text-sm text-white">
                      <span className="font-medium">{log.action}</span>
                      <span className="text-text-muted ml-2">→ {log.targetType}:{log.targetId.slice(0, 8)}...</span>
                    </p>
                    <p className="text-xs text-text-muted">{log.details}</p>
                  </div>
                </div>
                <span className="text-xs text-text-muted whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString('es')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-text-muted">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
