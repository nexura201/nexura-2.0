/**
 * StreamingSettingsService — NEXURA Control Center OWNER
 * ------------------------------------------------------
 * Configuración administrativa de streaming (sección Streaming de
 * "Configuración de plataforma"). Reutiliza el sistema de configuración
 * existente de NEXURA: persistencia local tipo `nexura_platform_settings`
 * (localStorage) + verificación `AuthorizationService.requireOwner` +
 * auditoría `db.createAuditLog` con la acción `CONFIG_CHANGED`.
 *
 * HONESTIDAD FUNCIONAL:
 *  - Estas opciones son una POLÍTICA/CONFIGURACIÓN guardada localmente por
 *    el OWNER. NO limitan físicamente servidores ni transmisiones todavía:
 *    no existe backend/media server que aplique capacidad, corte de live o
 *    calidad máxima. La UI lo indica explícitamente.
 *  - No se toca la configuración real de RTMP/HLS ni del media server.
 */
import * as db from './database';
import { AuthorizationService } from './authorization.service';

const STREAMING_SETTINGS_KEY = 'nexura_streaming_settings';

// ============================================================
// TIPOS Y OPCIONES
// ============================================================

export interface StreamingSettings {
  /** Capacidad máxima de espectadores por servidor. null = "Sin límite". */
  maxViewersPerServer: number | null;
  /** Duración máxima de una transmisión en minutos. null = "Sin límite". */
  maxLiveDurationMinutes: number | null;
  /** Calidad máxima permitida (etiqueta de resolución). */
  maxQuality: string;
  updatedAt: string;
}

export const MAX_VIEWERS_PRESETS: { value: number | null; label: string }[] = [
  { value: 100, label: '100' },
  { value: 500, label: '500' },
  { value: 1000, label: '1.000' },
  { value: 5000, label: '5.000' },
  { value: 10000, label: '10.000' },
  { value: 50000, label: '50.000' },
  { value: null, label: 'Sin límite' },
];

export const LIVE_DURATION_OPTIONS: { value: number | null; label: string }[] = [
  { value: 30, label: '30 minutos' },
  { value: 60, label: '1 hora' },
  { value: 120, label: '2 horas' },
  { value: 240, label: '4 horas' },
  { value: 480, label: '8 horas' },
  { value: 720, label: '12 horas' },
  { value: 1440, label: '24 horas' },
  { value: null, label: 'Sin límite' },
];

export const QUALITY_OPTIONS = ['480p', '720p', '1080p', '1440p', '2160p (4K)'];

const DEFAULT_STREAMING_SETTINGS: StreamingSettings = {
  maxViewersPerServer: 1000,
  maxLiveDurationMinutes: 240,
  maxQuality: '1080p',
  updatedAt: new Date(0).toISOString(),
};

// ============================================================
// CARGA / VALIDACIÓN
// ============================================================

function loadStreamingSettings(): StreamingSettings {
  try {
    const raw = localStorage.getItem(STREAMING_SETTINGS_KEY);
    if (raw) return { ...DEFAULT_STREAMING_SETTINGS, ...JSON.parse(raw) };
  } catch { /* defaults */ }
  return DEFAULT_STREAMING_SETTINGS;
}

/** Normaliza/valida la capacidad: null (Sin límite) o entero ≥ 1. */
function sanitizeCapacity(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) throw new Error('INVALID_CAPACITY');
  const int = Math.floor(n);
  if (int < 1) throw new Error('INVALID_CAPACITY');
  return int;
}

/** Normaliza/valida la duración en minutos: null (Sin límite) o entero ≥ 1. */
function sanitizeDuration(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) throw new Error('INVALID_DURATION');
  const int = Math.floor(n);
  if (int < 1) throw new Error('INVALID_DURATION');
  return int;
}

function sanitizeQuality(v: unknown): string {
  if (typeof v !== 'string' || !QUALITY_OPTIONS.includes(v)) {
    throw new Error('INVALID_QUALITY');
  }
  return v;
}

// ============================================================
// FORMATEADORES (visibles en el panel)
// ============================================================

export function formatLiveDuration(minutes: number | null): string {
  if (minutes === null) return 'Sin límite';
  if (minutes < 60) return `${minutes} minutos`;
  const h = minutes / 60;
  return Number.isInteger(h) ? `${h} hora${h === 1 ? '' : 's'}` : `${Math.floor(h)} h ${minutes % 60} min`;
}

export function formatMaxViewers(value: number | null): string {
  if (value === null) return 'Sin límite';
  return value.toLocaleString('es');
}

// ============================================================
// SERVICIO
// ============================================================

export class StreamingSettingsService {
  static getSettings(): StreamingSettings {
    return loadStreamingSettings();
  }

  /** Guarda la capacidad máxima de espectadores por servidor (null = Sin límite). */
  static setMaxViewersPerServer(ownerId: string, value: number | null): StreamingSettings {
    AuthorizationService.requireOwner(ownerId);
    const capacity = sanitizeCapacity(value);
    return saveStreamingSettings(ownerId, { maxViewersPerServer: capacity },
      `Capacidad por servidor: ${formatMaxViewers(capacity)}`);
  }

  /** Guarda la duración máxima de live en minutos (null = Sin límite). */
  static setMaxLiveDuration(ownerId: string, minutes: number | null): StreamingSettings {
    AuthorizationService.requireOwner(ownerId);
    const duration = sanitizeDuration(minutes);
    return saveStreamingSettings(ownerId, { maxLiveDurationMinutes: duration },
      `Duración máxima de live: ${formatLiveDuration(duration)}`);
  }

  /** Guarda la calidad máxima permitida (480p…2160p (4K)). */
  static setMaxQuality(ownerId: string, quality: string): StreamingSettings {
    AuthorizationService.requireOwner(ownerId);
    const q = sanitizeQuality(quality);
    return saveStreamingSettings(ownerId, { maxQuality: q },
      `Calidad máxima de transmisión: ${q}`);
  }
}

function saveStreamingSettings(
  ownerId: string,
  updates: Partial<StreamingSettings>,
  auditDetails: string
): StreamingSettings {
  const current = loadStreamingSettings();
  const next: StreamingSettings = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STREAMING_SETTINGS_KEY, JSON.stringify(next));
  db.createAuditLog(ownerId, 'CONFIG_CHANGED', 'platform', 'streaming-settings', auditDetails);
  return next;
}
