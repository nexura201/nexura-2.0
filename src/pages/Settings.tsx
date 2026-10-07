import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import * as db from '../services/database';
import {
  User, Shield, Bell, Lock, Eye, EyeOff, Loader2,
  Camera, Upload, Check
} from 'lucide-react';

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();
  const [activeSection, setActiveSection] = useState('profile');

  if (!user) return null;

  const sections = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'account', label: 'Cuenta', icon: Shield },
    { id: 'security', label: 'Seguridad', icon: Lock },
    { id: 'privacy', label: 'Privacidad', icon: Eye },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Configuración</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-56 flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeSection === section.id
                  ? 'bg-primary/10 text-primary-light'
                  : 'text-text-secondary hover:bg-bg-elevated hover:text-white'
              }`}
            >
              <section.icon className="w-4 h-4" />
              {section.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeSection === 'profile' && <ProfileSettings user={user} refreshUser={refreshUser} addToast={addToast} />}
          {activeSection === 'account' && <AccountSettings user={user} refreshUser={refreshUser} addToast={addToast} />}
          {activeSection === 'security' && <SecuritySettings user={user} addToast={addToast} />}
          {activeSection === 'privacy' && <PrivacySettings />}
          {activeSection === 'notifications' && <NotificationSettings />}
        </div>
      </div>
    </div>
  );
}

function ProfileSettings({ user, refreshUser, addToast }: any) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [bannerUrl, setBannerUrl] = useState(user.bannerUrl);
  const [loading, setLoading] = useState(false);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('error', 'Solo se permiten imágenes.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('error', 'La imagen no puede superar 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('error', 'Solo se permiten imágenes.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      addToast('error', 'La imagen no puede superar 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setBannerUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      db.updateUser(user.id, { displayName, bio, avatarUrl, bannerUrl });
      refreshUser();
      addToast('success', 'Perfil actualizado correctamente.');
    } catch (err: any) {
      addToast('error', 'Error al actualizar el perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Avatar</h2>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-white overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              user.displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <label className="flex items-center gap-2 px-4 py-2 bg-bg-elevated border border-border rounded-lg text-sm text-text-secondary hover:text-white cursor-pointer transition-colors">
              <Camera className="w-4 h-4" />
              Subir avatar
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
            <p className="text-xs text-text-muted mt-1">PNG, JPG hasta 5MB</p>
          </div>
        </div>
      </div>

      <div className="bg-bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Banner</h2>
        <div className="space-y-3">
          <div className="h-32 rounded-lg bg-gradient-to-r from-primary/20 to-primary-light/10 overflow-hidden">
            {bannerUrl && <img src={bannerUrl} alt="" className="w-full h-full object-cover" />}
          </div>
          <label className="flex items-center gap-2 px-4 py-2 bg-bg-elevated border border-border rounded-lg text-sm text-text-secondary hover:text-white cursor-pointer transition-colors w-fit">
            <Upload className="w-4 h-4" />
            Subir banner
            <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
          </label>
          <p className="text-xs text-text-muted">PNG, JPG hasta 10MB. Recomendado: 1500x500px</p>
        </div>
      </div>

      <div className="bg-bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white mb-4">Información</h2>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Nombre visible</label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-white placeholder-text-muted outline-none focus:border-primary transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Biografía</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            rows={4}
            maxLength={300}
            className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-white placeholder-text-muted outline-none focus:border-primary transition-colors resize-none"
            placeholder="Cuéntanos sobre ti..."
          />
          <p className="text-xs text-text-muted mt-1">{bio.length}/300</p>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex items-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Guardar cambios
      </button>
    </form>
  );
}

function AccountSettings({ user, refreshUser, addToast }: any) {
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      db.updateUser(user.id, { username, email, displayName });
      refreshUser();
      addToast('success', 'Cuenta actualizada correctamente.');
    } catch (err: any) {
      if (err.message === 'USERNAME_TAKEN') {
        addToast('error', 'Este nombre de usuario ya está en uso.');
      } else if (err.message === 'EMAIL_TAKEN') {
        addToast('error', 'Este email ya está registrado.');
      } else if (err.message === 'INVALID_USERNAME') {
        addToast('error', 'Username inválido. 3-24 caracteres: letras, números y _.');
      } else {
        addToast('error', 'Error al actualizar la cuenta.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-bg-card border border-border rounded-xl p-6 space-y-4">
      <h2 className="text-lg font-semibold text-white mb-4">Información de cuenta</h2>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Username</label>
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-white placeholder-text-muted outline-none focus:border-primary transition-colors"
        />
        <p className="text-xs text-text-muted mt-1">3-24 caracteres. Letras, números y _</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-white placeholder-text-muted outline-none focus:border-primary transition-colors"
        />
        <div className="flex items-center gap-2 mt-1">
          {user.emailVerified ? (
            <span className="flex items-center gap-1 text-xs text-success"><Check className="w-3 h-3" /> Verificado</span>
          ) : (
            <span className="text-xs text-warning">No verificado</span>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Nombre visible</label>
        <input
          type="text"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-white placeholder-text-muted outline-none focus:border-primary transition-colors"
        />
      </div>

      <div className="pt-2">
        <p className="text-xs text-text-muted">
          Rol: <span className="text-white font-medium">{user.role}</span> • 
          Estado: <span className={`font-medium ${user.status === 'ACTIVE' ? 'text-success' : 'text-danger'}`}>{user.status}</span>
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex items-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Guardar cambios
      </button>
    </form>
  );
}

function SecuritySettings({ user, addToast }: any) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast('error', 'Las contraseñas no coinciden.');
      return;
    }
    if (newPassword.length < 8) {
      addToast('error', 'La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setLoading(true);
    try {
      // Cambio real y persistente de contraseña. El rol del usuario
      // (incluido OWNER) se conserva intacto; solo se actualiza el hash.
      db.changeUserPassword(user.id, currentPassword, newPassword);
      addToast('success', 'Contraseña actualizada correctamente. Tu rol se mantiene sin cambios. Debes iniciar sesión nuevamente.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err?.message === 'INVALID_CREDENTIALS'
        ? 'La contraseña actual es incorrecta.'
        : err?.message === 'PASSWORD_TOO_SHORT'
          ? 'La nueva contraseña debe tener al menos 8 caracteres.'
          : 'No se pudo actualizar la contraseña.';
      addToast('error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAll = () => {
    db.logoutAllSessions(user.id);
    addToast('success', 'Todas las sesiones han sido cerradas.');
  };

  return (
    <div className="space-y-6">
      <div className="bg-bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Cambiar contraseña</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Contraseña actual</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-white placeholder-text-muted outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Nueva contraseña</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-white placeholder-text-muted outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Confirmar nueva contraseña</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-white placeholder-text-muted outline-none focus:border-primary transition-colors"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showPasswords}
              onChange={e => setShowPasswords(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-bg-input text-primary"
            />
            <span className="text-sm text-text-secondary">Mostrar contraseñas</span>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Cambiar contraseña
          </button>
        </form>
      </div>

      <div className="bg-bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Sesiones activas</h2>
        <p className="text-text-secondary text-sm mb-4">Cierra sesión en todos los dispositivos.</p>
        <button
          onClick={handleLogoutAll}
          className="flex items-center gap-2 bg-danger/10 border border-danger/20 text-danger hover:bg-danger/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Cerrar todas las sesiones
        </button>
      </div>

      <div className="bg-bg-card border border-border rounded-xl p-6 opacity-60">
        <h2 className="text-lg font-semibold text-white mb-2">Autenticación de dos factores (2FA)</h2>
        <p className="text-text-secondary text-sm">Disponible próximamente para mayor seguridad.</p>
      </div>
    </div>
  );
}

function PrivacySettings() {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Privacidad</h2>
      <p className="text-text-secondary text-sm mb-6">Configura las opciones de privacidad de tu cuenta.</p>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-bg-elevated rounded-lg">
          <div>
            <p className="text-white text-sm font-medium">Perfil público</p>
            <p className="text-text-muted text-xs">Tu perfil es visible para todos</p>
          </div>
          <div className="w-10 h-6 bg-primary rounded-full relative cursor-pointer">
            <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1" />
          </div>
        </div>
        <div className="flex items-center justify-between p-4 bg-bg-elevated rounded-lg">
          <div>
            <p className="text-white text-sm font-medium">Mostrar actividad</p>
            <p className="text-text-muted text-xs">Muestra cuando estás en línea</p>
          </div>
          <div className="w-10 h-6 bg-bg-input border border-border rounded-full relative cursor-pointer">
            <div className="w-4 h-4 bg-text-muted rounded-full absolute left-1 top-1" />
          </div>
        </div>
      </div>
      <p className="text-xs text-text-muted mt-4">Más opciones de privacidad disponibles próximamente.</p>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Notificaciones</h2>
      <p className="text-text-secondary text-sm mb-6">Configura cómo quieres recibir notificaciones.</p>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-bg-elevated rounded-lg">
          <div>
            <p className="text-white text-sm font-medium">Email - Nuevos seguidores</p>
            <p className="text-text-muted text-xs">Recibe un email cuando alguien te sigue</p>
          </div>
          <div className="w-10 h-6 bg-primary rounded-full relative cursor-pointer">
            <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1" />
          </div>
        </div>
        <div className="flex items-center justify-between p-4 bg-bg-elevated rounded-lg">
          <div>
            <p className="text-white text-sm font-medium">Email - Streams en vivo</p>
            <p className="text-text-muted text-xs">Notificaciones cuando canales que sigues transmiten</p>
          </div>
          <div className="w-10 h-6 bg-bg-input border border-border rounded-full relative cursor-pointer">
            <div className="w-4 h-4 bg-text-muted rounded-full absolute left-1 top-1" />
          </div>
        </div>
      </div>
      <p className="text-xs text-text-muted mt-4">Más opciones de notificaciones disponibles próximamente.</p>
    </div>
  );
}
