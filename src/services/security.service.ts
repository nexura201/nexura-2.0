import { v4 as uuidv4 } from 'uuid';
import type { SecurityEvent, SecurityEventType, SecuritySeverity, AccountStatus } from '../types';
import * as db from './database';

/**
 * SecurityService - Maneja eventos de seguridad y protección de cuentas
 */

const SECURITY_KEYS = {
  events: 'nexura_security_events',
  failedAttempts: 'nexura_failed_login_attempts',
  lockedAccounts: 'nexura_locked_accounts',
};

export class SecurityService {
  // ========== EVENTOS DE SEGURIDAD ==========
  
  /**
   * Registra un evento de seguridad
   */
  static logSecurityEvent(
    type: SecurityEventType,
    severity: SecuritySeverity,
    userId?: string,
    metadata?: any,
    ipHash?: string,
    userAgentHash?: string
  ): SecurityEvent {
    const event: SecurityEvent = {
      id: uuidv4(),
      userId,
      type,
      severity,
      ipHash,
      userAgentHash,
      metadata,
      createdAt: new Date().toISOString(),
    };

    const events = this.getSecurityEvents();
    events.unshift(event);
    
    // Mantener solo los últimos 1000 eventos
    if (events.length > 1000) {
      events.splice(1000);
    }

    localStorage.setItem(SECURITY_KEYS.events, JSON.stringify(events));
    return event;
  }

  /**
   * Obtiene eventos de seguridad de un usuario
   */
  static getUserSecurityEvents(userId: string, limit: number = 50): SecurityEvent[] {
    const events = this.getSecurityEvents();
    return events
      .filter(e => e.userId === userId)
      .slice(0, limit);
  }

  /**
   * Obtiene eventos de seguridad globales (ADMIN/OWNER)
   */
  static getGlobalSecurityEvents(
    severity?: SecuritySeverity,
    limit: number = 100
  ): SecurityEvent[] {
    const events = this.getSecurityEvents();
    
    let filtered = events;
    if (severity) {
      filtered = events.filter(e => e.severity === severity);
    }
    
    return filtered.slice(0, limit);
  }

  /**
   * Obtiene eventos críticos
   */
  static getCriticalEvents(limit: number = 50): SecurityEvent[] {
    const events = this.getSecurityEvents();
    return events
      .filter(e => e.severity === 'HIGH' || e.severity === 'CRITICAL')
      .slice(0, limit);
  }

  // ========== INTENTOS FALLIDOS ==========
  
  /**
   * Registra un intento de login fallido
   */
  static recordFailedLogin(identifier: string, ipHash: string): void {
    const attempts = this.getFailedAttempts();
    
    if (!attempts[identifier]) {
      attempts[identifier] = [];
    }
    
    attempts[identifier].push({
      timestamp: Date.now(),
      ipHash,
    });
    
    // Mantener solo los últimos 10 intentos
    if (attempts[identifier].length > 10) {
      attempts[identifier] = attempts[identifier].slice(-10);
    }
    
    localStorage.setItem(SECURITY_KEYS.failedAttempts, JSON.stringify(attempts));
    
    // Verificar si debe bloquear
    this.checkAndLockAccount(identifier);
  }

  /**
   * Limpia los intentos fallidos después de un login exitoso
   */
  static clearFailedAttempts(identifier: string): void {
    const attempts = this.getFailedAttempts();
    delete attempts[identifier];
    localStorage.setItem(SECURITY_KEYS.failedAttempts, JSON.stringify(attempts));
  }

  /**
   * Obtiene el número de intentos fallidos recientes
   */
  static getFailedAttemptsCount(identifier: string, windowMs: number = 15 * 60 * 1000): number {
    const attempts = this.getFailedAttempts();
    const userAttempts = attempts[identifier] || [];
    const now = Date.now();
    
    return userAttempts.filter(a => now - a.timestamp < windowMs).length;
  }

  /**
   * Verifica y bloquea la cuenta si hay demasiados intentos fallidos
   */
  private static checkAndLockAccount(identifier: string): void {
    const recentAttempts = this.getFailedAttemptsCount(identifier, 15 * 60 * 1000);
    
    // 5 intentos fallidos en 15 minutos = bloqueo temporal
    if (recentAttempts >= 5) {
      this.lockAccount(identifier, 30 * 60 * 1000); // 30 minutos
      
      // Buscar usuario por email o username
      const users = db.getAllUsers();
      const user = users.find(u => 
        u.email.toLowerCase() === identifier.toLowerCase() ||
        u.username.toLowerCase() === identifier.toLowerCase()
      );
      
      if (user) {
        this.logSecurityEvent(
          'ACCOUNT_LOCKED',
          'HIGH',
          user.id,
          { reason: 'Too many failed login attempts', attempts: recentAttempts }
        );
      }
    }
  }

  // ========== BLOQUEO DE CUENTAS ==========
  
  /**
   * Bloquea una cuenta temporalmente
   */
  static lockAccount(identifier: string, durationMs: number): void {
    const locked = this.getLockedAccounts();
    
    locked[identifier] = {
      lockedAt: Date.now(),
      expiresAt: Date.now() + durationMs,
      reason: 'Too many failed attempts',
    };
    
    localStorage.setItem(SECURITY_KEYS.lockedAccounts, JSON.stringify(locked));
  }

  /**
   * Verifica si una cuenta está bloqueada
   */
  static isAccountLocked(identifier: string): boolean {
    const locked = this.getLockedAccounts();
    const lockInfo = locked[identifier];
    
    if (!lockInfo) return false;
    
    // Verificar si el bloqueo ha expirado
    if (Date.now() > lockInfo.expiresAt) {
      // Remover bloqueo expirado
      delete locked[identifier];
      localStorage.setItem(SECURITY_KEYS.lockedAccounts, JSON.stringify(locked));
      return false;
    }
    
    return true;
  }

  /**
   * Desbloquea una cuenta manualmente (ADMIN/OWNER)
   */
  static unlockAccount(identifier: string, unlockedBy: string): void {
    const locked = this.getLockedAccounts();
    delete locked[identifier];
    localStorage.setItem(SECURITY_KEYS.lockedAccounts, JSON.stringify(locked));
    
    // Buscar usuario
    const users = db.getAllUsers();
    const user = users.find(u => 
      u.email.toLowerCase() === identifier.toLowerCase() ||
      u.username.toLowerCase() === identifier.toLowerCase()
    );
    
    if (user) {
      this.logSecurityEvent(
        'ACCOUNT_UNLOCKED',
        'MEDIUM',
        user.id,
        { unlockedBy }
      );
    }
  }

  /**
   * Obtiene el tiempo restante de bloqueo
   */
  static getLockTimeRemaining(identifier: string): number {
    const locked = this.getLockedAccounts();
    const lockInfo = locked[identifier];
    
    if (!lockInfo) return 0;
    
    const remaining = lockInfo.expiresAt - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  // ========== DETECCIÓN DE ACTIVIDAD SOSPECHOSA ==========
  
  /**
   * Detecta login sospechoso basado en patrones
   */
  static detectSuspiciousLogin(
    userId: string,
    ipHash: string,
    userAgentHash: string
  ): { suspicious: boolean; reasons: string[] } {
    const reasons: string[] = [];
    const events = this.getUserSecurityEvents(userId, 20);
    
    // Verificar cambios bruscos de IP
    const recentLogins = events.filter(e => e.type === 'LOGIN_SUCCESS');
    if (recentLogins.length > 0) {
      const lastLogin = recentLogins[0];
      if (lastLogin.ipHash && lastLogin.ipHash !== ipHash) {
        reasons.push('IP address changed suddenly');
      }
    }
    
    // Verificar cambios de dispositivo
    if (recentLogins.length > 0) {
      const lastLogin = recentLogins[0];
      if (lastLogin.userAgentHash && lastLogin.userAgentHash !== userAgentHash) {
        reasons.push('Device/browser changed');
      }
    }
    
    // Verificar múltiples ubicaciones en poco tiempo
    const recentIPs = new Set(recentLogins.slice(0, 5).map(e => e.ipHash).filter(Boolean));
    if (recentIPs.size > 3) {
      reasons.push('Multiple locations in short time');
    }
    
    return {
      suspicious: reasons.length > 0,
      reasons,
    };
  }

  /**
   * Registra un login exitoso con detección de suspicious activity
   */
  static recordSuccessfulLogin(
    userId: string,
    ipHash: string,
    userAgentHash: string
  ): void {
    // Detectar actividad sospechosa
    const { suspicious, reasons } = this.detectSuspiciousLogin(userId, ipHash, userAgentHash);
    
    if (suspicious) {
      this.logSecurityEvent(
        'SUSPICIOUS_LOGIN',
        'MEDIUM',
        userId,
        { reasons },
        ipHash,
        userAgentHash
      );
    }
    
    // Registrar login exitoso
    this.logSecurityEvent(
      'LOGIN_SUCCESS',
      'LOW',
      userId,
      null,
      ipHash,
      userAgentHash
    );
    
    // Limpiar intentos fallidos
    const user = db.getUserById(userId);
    if (user) {
      this.clearFailedAttempts(user.email);
      this.clearFailedAttempts(user.username);
    }
  }

  // ========== HELPERS ==========
  
  private static getSecurityEvents(): SecurityEvent[] {
    const events = localStorage.getItem(SECURITY_KEYS.events);
    return events ? JSON.parse(events) : [];
  }

  private static getFailedAttempts(): Record<string, Array<{ timestamp: number; ipHash: string }>> {
    const attempts = localStorage.getItem(SECURITY_KEYS.failedAttempts);
    return attempts ? JSON.parse(attempts) : {};
  }

  private static getLockedAccounts(): Record<string, { lockedAt: number; expiresAt: number; reason: string }> {
    const locked = localStorage.getItem(SECURITY_KEYS.lockedAccounts);
    return locked ? JSON.parse(locked) : {};
  }
}
