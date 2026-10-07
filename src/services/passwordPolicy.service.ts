/**
 * PasswordPolicyService — NEXURA Control Center OWNER 2.0
 * ---------------------------------------------------------
 * Política de contraseñas configurable por el OWNER:
 *   - longitud mínima
 *   - requerir mayúsculas / minúsculas / números / caracteres especiales
 *
 * QUÉ ES REAL HOY (✅ dentro de la arquitectura frontend + localStorage):
 *   - La política se persiste de forma real y auditable (clave propia,
 *     sin tocar `nexura_*` existentes).
 *   - Se expone una función de validación (`validate`) que cualquier flujo
 *     de creación/cambio de contraseña puede consultar LOCALMENTE.
 *
 * QUÉ REQUIERE BACKEND (⚠️ — NO se simula):
 *   - La aplicación actual no tiene un punto único server-side donde las
 *     contraseñas son procesadas (registro/cambio ocurren en database.ts
 *     del navegador). Por eso esta política NO puede presentarse como
 *     "global y obligatoria": un cliente podría omitir la llamada local.
 *   - La validación DEFINITIVA debe ejecutarse en Supabase Auth (política
 *     de passwords) o en un Edge Function/backend propio junto con el
 *     hashing (bcrypt/argon2), nunca solo en el cliente.
 *   - Este servicio está diseñado para ser reemplazado/complementado por
 *     esa verificación server-side sin cambiar la interfaz del panel.
 *
 * SEGURIDAD:
 *   - Aquí NUNCA se almacenan contraseñas, hashes ni datos sensibles.
 *   - Solo se guarda la configuración de reglas (enteros y booleanos).
 */

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecial: boolean;
  updatedAt: string;
  updatedBy?: string;
}

const POLICY_KEY = 'nexura_password_policy';

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: false,
  requireLowercase: false,
  requireNumbers: false,
  requireSpecial: false,
  updatedAt: new Date(0).toISOString(),
};

export function loadPasswordPolicy(): PasswordPolicy {
  try {
    const raw = localStorage.getItem(POLICY_KEY);
    if (raw) return { ...DEFAULT_PASSWORD_POLICY, ...JSON.parse(raw) };
  } catch { /* defaults */ }
  return DEFAULT_PASSWORD_POLICY;
}

export function savePasswordPolicy(next: PasswordPolicy): PasswordPolicy {
  localStorage.setItem(POLICY_KEY, JSON.stringify(next));
  return next;
}

/** Normaliza/limita valores razonables antes de persistir. */
export function sanitizePolicyInput(current: PasswordPolicy, updates: Partial<PasswordPolicy>): PasswordPolicy {
  const rawLen = Number(updates.minLength ?? current.minLength);
  const minLength = Number.isFinite(rawLen) ? Math.min(Math.max(Math.round(rawLen), 6), 64) : current.minLength;
  return {
    minLength,
    requireUppercase: updates.requireUppercase ?? current.requireUppercase,
    requireLowercase: updates.requireLowercase ?? current.requireLowercase,
    requireNumbers: updates.requireNumbers ?? current.requireNumbers,
    requireSpecial: updates.requireSpecial ?? current.requireSpecial,
    updatedAt: new Date().toISOString(),
  };
}

export interface PolicyValidationResult {
  valid: boolean;
  /** Reglas incumplidas, en orden (vacío si todo cumple). */
  failures: string[];
}

/**
 * Validación LOCAL contra la política configurada.
 * IMPORTANTE: esta función es orientativa mientras no exista backend;
 * la validación segura debe replicarse server-side (⚠️ REQUIERE BACKEND).
 * El texto de entrada NO se almacena en ningún lado.
 */
export function validatePasswordAgainstPolicy(password: string, policy: PasswordPolicy = loadPasswordPolicy()): PolicyValidationResult {
  const failures: string[] = [];
  if (password.length < policy.minLength) failures.push(`Al menos ${policy.minLength} caracteres`);
  if (policy.requireUppercase && !/[A-ZÁÉÍÓÚÑ]/.test(password)) failures.push('Una letra mayúscula');
  if (policy.requireLowercase && !/[a-záéíóúñ]/.test(password)) failures.push('Una letra minúscula');
  if (policy.requireNumbers && !/\d/.test(password)) failures.push('Un número');
  if (policy.requireSpecial && !/[^A-Za-z0-9\s]/.test(password)) failures.push('Un carácter especial');
  return { valid: failures.length === 0, failures };
}

/** Resumen legible de la política vigente (para mostrar en la UI). */
export function describePolicy(policy: PasswordPolicy): string[] {
  const parts = [`Mínimo ${policy.minLength} caracteres`];
  if (policy.requireUppercase) parts.push('Mayúsculas (A-Z)');
  if (policy.requireLowercase) parts.push('Minúsculas (a-z)');
  if (policy.requireNumbers) parts.push('Números (0-9)');
  if (policy.requireSpecial) parts.push('Caracteres especiales (!@#$…)');
  return parts;
}
