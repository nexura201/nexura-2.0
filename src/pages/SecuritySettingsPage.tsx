import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { SecurityService } from '../services/security.service';
import { AuthorizationService } from '../services/authorization.service';
import type { SecurityEvent, UserSession } from '../types';
import {
  Shield, Lock, Key, Smartphone, Globe, Clock, AlertTriangle,
  CheckCircle, XCircle, Trash2, Eye, EyeOff
} from 'lucide-react';

export function SecuritySettingsPage() {
  const { user } = useAuth();
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  useEffect(() => {
    if (user) {
      loadSecurityData();
    }
  }, [user]);

  const loadSecurityData = () => {
    if (!user) return;
    
    const events = SecurityService.getUserSecurityEvents(user.id, 20);
    setSecurityEvents(events);
    
    // TODO: Cargar estado de 2FA desde backend
    setTwoFactorEnabled(false);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'LOGIN_SUCCESS':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'LOGIN_FAILED':
        return <XCircle className="w-5 h-5 text-danger" />;
      case 'PASSWORD_CHANGED':
        return <Key className="w-5 h-5 text-warning" />;
      case 'SUSPICIOUS_LOGIN':
        return <AlertTriangle className="w-5 h-5 text-danger" />;
      case 'ACCOUNT_LOCKED':
        return <Lock className="w-5 h-5 text-danger" />;
      default:
        return <Shield className="w-5 h-5 text-text-muted" />;
    }
  };

  const getEventDescription = (event: SecurityEvent) => {
    switch (event.type) {
      case 'LOGIN_SUCCESS':
        return 'Inicio de sesión exitoso';
      case 'LOGIN_FAILED':
        return 'Intento de inicio de sesión fallido';
      case 'PASSWORD_CHANGED':
        return 'Contraseña cambiada';
      case 'PASSWORD_RESET_REQUESTED':
        return 'Solicitud de recuperación de contraseña';
      case 'EMAIL_CHANGED':
        return 'Email cambiado';
      case 'SUSPICIOUS_LOGIN':
        return 'Inicio de sesión sospechoso detectado';
      case 'ACCOUNT_LOCKED':
        return 'Cuenta bloqueada temporalmente';
      case 'SESSION_CREATED':
        return 'Nueva sesión iniciada';
      case 'SESSION_REVOKED':
        return 'Sesión cerrada';
      default:
        return event.type;
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <Shield className="w-16 h-16 text-text-muted mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Acceso denegado</h1>
        <p className="text-text-secondary">Debes iniciar sesión para ver la configuración de seguridad.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Seguridad de la Cuenta</h1>
        <p className="text-text-secondary">Gestiona la seguridad de tu cuenta y revisa la actividad reciente</p>
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-primary-light" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-white mb-2">Autenticación de Dos Factores (2FA)</h2>
            <p className="text-text-secondary">
              Agrega una capa adicional de seguridad a tu cuenta usando una aplicación de autenticación.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-bg-elevated rounded-lg">
          <div>
            <p className="text-white font-medium">
              {twoFactorEnabled ? '2FA Activado' : '2FA Desactivado'}
            </p>
            <p className="text-sm text-text-muted mt-1">
              {twoFactorEnabled
                ? 'Tu cuenta está protegida con autenticación de dos factores'
                : 'Activa 2FA para mayor seguridad'}
            </p>
          </div>
          <button
            onClick={() => setShow2FASetup(!show2FASetup)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              twoFactorEnabled
                ? 'bg-danger/10 text-danger hover:bg-danger/20'
                : 'bg-primary hover:bg-primary-hover text-white'
            }`}
          >
            {twoFactorEnabled ? 'Desactivar' : 'Activar'}
          </button>
        </div>

        {show2FASetup && !twoFactorEnabled && (
          <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-text-secondary">
              <strong>Nota:</strong> La configuración completa de 2FA requiere un backend con soporte TOTP.
              Esta interfaz está preparada para la integración.
            </p>
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div className="bg-bg-card border border-border rounded-xl p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Sesiones Activas</h2>
        <p className="text-text-secondary mb-4">
          Estas son las sesiones activas en tu cuenta. Cierra las sesiones que no reconozcas.
        </p>

        <div className="space-y-3">
          {/* Sesión actual */}
          <div className="flex items-center justify-between p-4 bg-success/10 border border-success/20 rounded-lg">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-success" />
              <div>
                <p className="text-white font-medium">Sesión Actual</p>
                <p className="text-sm text-text-muted">
                  {navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Navegador'} •{' '}
                  {navigator.platform || 'Dispositivo desconocido'}
                </p>
              </div>
            </div>
            <span className="text-xs text-success font-medium">ACTIVA</span>
          </div>

          {/* TODO: Cargar sesiones reales desde backend */}
          <div className="text-center py-4 text-text-muted text-sm">
            Las sesiones adicionales se mostrarán aquí cuando estén disponibles
          </div>
        </div>

        <button className="mt-4 w-full px-4 py-2 bg-bg-elevated hover:bg-bg-input border border-border text-text-secondary hover:text-white rounded-lg transition-colors">
          Cerrar todas las demás sesiones
        </button>
      </div>

      {/* Security Events */}
      <div className="bg-bg-card border border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Actividad de Seguridad Reciente</h2>
        <p className="text-text-secondary mb-4">
          Revisa la actividad reciente de tu cuenta
        </p>

        {securityEvents.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary">No hay eventos de seguridad recientes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {securityEvents.map(event => (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 bg-bg-elevated rounded-lg"
              >
                <div className="flex-shrink-0 mt-1">
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">
                    {getEventDescription(event)}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    {new Date(event.createdAt).toLocaleString('es', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
