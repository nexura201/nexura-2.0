/**
 * NexuraIASettingsService — NEXURA Control Center OWNER (Etapa 3B)
 * ----------------------------------------------------------------
 * Configuración administrativa de NEXURA IA (sección "NEXURA IA" de
 * "Configuración de plataforma"). Reutiliza el sistema de configuración
 * existente de NEXURA: persistencia local en localStorage + verificación
 * `AuthorizationService.requireOwner` + auditoría `db.createAuditLog`
 * con la acción `CONFIG_CHANGED` (mismo patrón que streamingSettings).
 *
 * QUÉ SE APLICA REALMENTE HOY (en /api/ai/chat, server-side):
 *  - enabled: si se desactiva, el backend responde AI_DISABLED (503).
 *  - behavior: ajusta temperatura + estilo del system prompt.
 *  - maxResponseTokens: se pasa como maxOutputTokens a Gemini.
 *  - model: se usa cuando GEMINI_MODEL del entorno no está definido.
 *    (Prioridad: GEMINI_MODEL > panel > default. En serverless sin
 *    persistencia compartida, el valor del PANEL se aplica al re-desplegar
 *    o vía GET /api/ai/chat; el chat usa la resolución del propio servidor.)
 *
 * QUÉ QUEDA PREPARADO (pendiente de backend):
 *  - maxMessageLength dinámico y requestsPerHour (rate limiting real),
 *    porque requieren persistencia server-side que aún no existe.
 *  - Idiomas adicionales (hoy solo español fijo).
 *
 * SEGURIDAD: aquí NO se guardan ni se aceptan API keys. GEMINI_API_KEY vive
 * únicamente en process.env del servidor. Este archivo no contiene secretos.
 */
import * as db from './database';
import { AuthorizationService } from './authorization.service';
import {
  loadNexuraIASettings,
  saveNexuraIASettings,
  formatNexuraIABehavior,
  isKnownGeminiModel,
  NEXURA_IA_MODELS,
  BEHAVIOR_OPTIONS,
  type NexuraIASettings,
  type NexuraIABehavior,
} from '../config/nexuraIA.context';

export type { NexuraIASettings, NexuraIABehavior };
export { NEXURA_IA_MODELS, BEHAVIOR_OPTIONS, formatNexuraIABehavior };

// ============================================================
// ESTADO DE CONEXIÓN (verificación segura contra el backend)
// ============================================================

export type ConnectionStatus = 'connected' | 'not_configured' | 'error' | 'unknown';

export interface IAStatusInfo {
  status: ConnectionStatus;
  /** Modelo reportado por el servidor (nunca un secreto). */
  serverModel?: string;
  /** Si el servidor tiene GEMINI_API_KEY configurada (solo booleano). */
  configured?: boolean;
  endpointReady?: boolean;
  checkedAt?: string;
}

const STATUS_ENDPOINT = '/api/ai/chat';

/**
 * Consulta segura de estado: hace GET /api/ai/chat.
 * - JSON con ok:true → conectado / no configurado según `configured`.
 * - HTML u otro formato (build antigua o rewrite SPA) → error (no desplegado).
 * - Fallo de red → unknown.
 * Nunca envía ni recibe secretos; solo lee flags públicos.
 */
export async function checkConnection(signal?: AbortSignal): Promise<IAStatusInfo> {
  try {
    const res = await fetch(STATUS_ENDPOINT, { method: 'GET', signal });
    let data: { ok?: boolean; service?: string; configured?: boolean; model?: string; endpointReady?: boolean } | null = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (data && data.ok === true && data.service === 'nexura-ia') {
      return {
        status: data.configured ? 'connected' : 'not_configured',
        serverModel: typeof data.model === 'string' ? data.model : undefined,
        configured: Boolean(data.configured),
        endpointReady: true,
        checkedAt: new Date().toISOString(),
      };
    }
    // Respuesta que no es del endpoint (rewrite SPA / build anterior / 404 HTML)
    return { status: 'error', endpointReady: false, checkedAt: new Date().toISOString() };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    return { status: 'unknown', checkedAt: new Date().toISOString() };
  }
}

export const CONNECTION_STATUS_LABEL: Record<ConnectionStatus, string> = {
  connected: '🟢 Gemini conectado',
  not_configured: '🟡 Gemini no configurado (falta GEMINI_API_KEY en Vercel)',
  error: '🔴 Error de conexión (endpoint no disponible / build antigua)',
  unknown: '⚪ Estado desconocido (sin respuesta del servidor)',
};

// ============================================================
// GUARDADO (OWNER + auditoría)
// ============================================================

function saveWithAudit(ownerId: string, updates: Partial<NexuraIASettings>, auditDetails: string): NexuraIASettings {
  AuthorizationService.requireOwner(ownerId);
  const next = saveNexuraIASettings(updates);
  db.createAuditLog(ownerId, 'CONFIG_CHANGED', 'platform', 'nexura-ia-settings', auditDetails);
  return next;
}

export class NexuraIASettingsService {
  static getSettings(): NexuraIASettings {
    return loadNexuraIASettings();
  }

  /** Activa/desactiva NEXURA IA (aplicado realmente por /api/ai/chat). */
  static setEnabled(ownerId: string, enabled: boolean): NexuraIASettings {
    return saveWithAudit(ownerId, { enabled }, `NEXURA IA ${enabled ? 'activada' : 'desactivada'}`);
  }

  /** Selecciona el modelo Gemini (validado contra patrones conocidos). */
  static setModel(ownerId: string, model: string): NexuraIASettings {
    const m = model.trim();
    if (!isKnownGeminiModel(m)) throw new Error('INVALID_MODEL');
    return saveWithAudit(ownerId, { model: m }, `Modelo de NEXURA IA: ${m}`);
  }

  /** Comportamiento: concisa / equilibrada / detallada. */
  static setBehavior(ownerId: string, behavior: NexuraIABehavior): NexuraIASettings {
    if (!BEHAVIOR_OPTIONS.some(o => o.value === behavior)) throw new Error('INVALID_BEHAVIOR');
    return saveWithAudit(ownerId, { behavior }, `Comportamiento de NEXURA IA: ${formatNexuraIABehavior(behavior)}`);
  }

  /** Longitud máxima de respuesta en tokens (256–8192). Se aplica vía maxOutputTokens. */
  static setMaxResponseTokens(ownerId: string, tokens: number): NexuraIASettings {
    const n = Math.floor(Number(tokens));
    if (!Number.isFinite(n) || n < 256 || n > 8192) throw new Error('INVALID_MAX_TOKENS');
    return saveWithAudit(ownerId, { maxResponseTokens: n }, `Longitud máxima de respuesta (tokens): ${n}`);
  }

  /** Longitud máxima de mensaje (chars, 200–4000). Preparada — aplicación dinámica pendiente. */
  static setMaxMessageLength(ownerId: string, chars: number): NexuraIASettings {
    const n = Math.floor(Number(chars));
    if (!Number.isFinite(n) || n < 200 || n > 4000) throw new Error('INVALID_MAX_MESSAGE');
    return saveWithAudit(ownerId, { maxMessageLength: n }, `Longitud máxima de mensaje (chars): ${n} [preparada]`);
  }

  /** Límite de solicitudes por usuario/hora (1–1000). Preparado — rate limiting pendiente. */
  static setRequestsPerHour(ownerId: string, value: number): NexuraIASettings {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n) || n < 1 || n > 1000) throw new Error('INVALID_RATE_LIMIT');
    return saveWithAudit(ownerId, { requestsPerHour: n }, `Límite de solicitudes/hora: ${n} [preparado]`);
  }
}

export default NexuraIASettingsService;
