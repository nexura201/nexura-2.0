/**
 * NexuraIAService — Cliente del frontend para NEXURA IA (Etapa 2)
 * ----------------------------------------------------------------
 * Conecta la interfaz de NEXURA IA con el endpoint serverless seguro:
 *
 *   POST /api/ai/chat   { message: string, behavior?: NexuraIaBehaviorId }
 *        → 200 { ok: true, reply, model, behavior, timestamp }
 *        → 4xx/5xx { ok: false, error: CODE }
 *
 *   GET  /api/ai/status → 200 { ok: true, configured, model }  (sin secretos)
 *
 * SEGURIDAD:
 *  - El frontend SOLO llama a /api/ai/chat. Jamás accede a Gemini directamente.
 *  - No existe ni se usa VITE_GEMINI_API_KEY: GEMINI_API_KEY vive únicamente
 *    del lado servidor (api/ai/chat.ts). Nada de esto se guarda en
 *    localStorage/sessionStorage.
 *  - Este servicio no imprime secretos; solo códigos de error públicos.
 *
 * ALCANCE Etapa 3 (producto/venta): chat con historial de SESIÓN (sin DB),
 * timeout con AbortController, reintento único manual y estado de conexión
 * real vía /api/ai/status. Sin imágenes, sin voz, sin herramientas externas.
 */

import {
  NEXURA_IA_DEFAULTS,
  type NexuraIaBehaviorId,
} from '../config/nexuraIA.context';

export interface NexuraIAChatResult {
  reply: string;
  model: string;
  /** Comportamiento REAL aplicado por el backend (concisa | equilibrada | detallada). */
  behavior?: NexuraIaBehaviorId;
  timestamp: string;
}

/** Estado público del servicio NEXURA IA (GET /api/ai/status — nunca contiene secretos). */
export interface NexuraIAStatus {
  /** true = endpoint accesible y Gemini configurado en el servidor. */
  configured: boolean;
  model: string;
}

/** Estado de conexión mostrado en el Control Center (nunca se inventa). */
export type NexuraIAConnectionState = 'connected' | 'not-configured' | 'error' | 'unknown';

/** Error público de NEXURA IA (código + mensaje amigable, nunca detalles internos). */
export class NexuraIAError extends Error {
  code: string;

  constructor(code: string, friendlyMessage: string) {
    super(friendlyMessage);
    this.name = 'NexuraIAError';
    this.code = code;
  }
}

const CHAT_ENDPOINT = '/api/ai/chat';
const STATUS_ENDPOINT = '/api/ai/status';
const MAX_MESSAGE_LENGTH = NEXURA_IA_DEFAULTS.maxMessageLength; // Coincide con la validación del backend.

/** Turno de historial que entiende el backend (api/ai/chat.ts): role 'user' | 'model'. */
export interface NexuraIAHistoryTurn {
  role: 'user' | 'model';
  text: string;
}

/** Traducción de códigos de error del backend a mensajes amigables. */
const FRIENDLY_ERRORS: Record<string, string> = {
  MESSAGE_REQUIRED: 'Escribí un mensaje para poder responder.',
  MESSAGE_TOO_LONG: 'Tu mensaje es demasiado largo. Probá con uno más corto (máximo 4.000 caracteres).',
  METHOD_NOT_ALLOWED: 'No se pudo procesar la solicitud. Intentá de nuevo.',
  AI_NOT_CONFIGURED: 'NEXURA IA no está configurada en el servidor. El administrador debe definir GEMINI_API_KEY en Vercel (Project → Settings → Environment Variables) y redeployar.',
  EMPTY_AI_RESPONSE: 'NEXURA IA no pudo generar una respuesta. Probá enviando el mensaje de nuevo.',
  AI_UPSTREAM_ERROR: 'Hubo un problema conectando con NEXURA IA. Revisá tu conexión e intentá otra vez.',
  AI_AUTH_ERROR: 'El servidor rechazó la configuración de NEXURA IA (API key inválida o sin permiso). Contactá al administrador.',
  AI_RATE_LIMIT: 'NEXURA IA recibió demasiadas solicitudes recientemente. Esperá unos segundos e intentá de nuevo.',
  NETWORK_ERROR: 'No se pudo conectar con el servidor de NEXURA IA. Verificá tu conexión e intentá de nuevo.',
  TIMEOUT: 'NEXURA IA tardó demasiado en responder. Intentá nuevamente.',
  ABORTED: 'La solicitud fue cancelada.',
};

export function friendlyErrorMessage(code: string): string {
  return FRIENDLY_ERRORS[code] ?? 'Ocurrió un error inesperado con NEXURA IA. Intentá nuevamente.';
}

/** Timeout defensivo del cliente: si el serverless tarda más, se cancela la espera. */
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Envía un mensaje de texto al backend seguro y devuelve la respuesta de Gemini.
 * Lanza NexuraIAError con código y mensaje amigable ante cualquier fallo.
 * - `history`: turnos previos de la sesión (el backend ya los acepta; ventana 12).
 * - `signal`: AbortControllextorno del llamante (cierre de modal/desmonte).
 * - Timeout interno: si excede REQUEST_TIMEOUT_MS → código TIMEOUT (reintentable).
 */
export async function sendMessage(
  message: string,
  opts: {
    signal?: AbortSignal;
    behavior?: NexuraIaBehaviorId;
    history?: NexuraIAHistoryTurn[];
  } = {}
): Promise<NexuraIAChatResult> {
  const trimmed = message.trim();

  if (!trimmed) {
    throw new NexuraIAError('MESSAGE_REQUIRED', friendlyErrorMessage('MESSAGE_REQUIRED'));
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new NexuraIAError('MESSAGE_TOO_LONG', friendlyErrorMessage('MESSAGE_TOO_LONG'));
  }

  // Historial de sesión: solo turnos válidos no vacíos, ventana últimos 12 (igual que el backend).
  const history: NexuraIAHistoryTurn[] = (opts.history ?? [])
    .filter(t => t && typeof t.text === 'string' && t.text.trim().length > 0 && (t.role === 'user' || t.role === 'model'))
    .slice(-12);

  // Combinamos el signal externo con un timeout propio sin depender de AbortSignal.any
  // (compatibilidad con navegadores objetivo).
  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();
  if (opts.signal) {
    if (opts.signal.aborted) {
      throw new NexuraIAError('ABORTED', friendlyErrorMessage('ABORTED'));
    }
    opts.signal.addEventListener('abort', onExternalAbort);
  }
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: trimmed,
        ...(history.length > 0 ? { history } : {}),
        ...(opts.behavior ? { behavior: opts.behavior } : {}),
      }),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      if (timedOut) throw new NexuraIAError('TIMEOUT', friendlyErrorMessage('TIMEOUT'));
      throw new NexuraIAError('ABORTED', friendlyErrorMessage('ABORTED'));
    }
    throw new NexuraIAError('NETWORK_ERROR', friendlyErrorMessage('NETWORK_ERROR'));
  } finally {
    clearTimeout(timer);
    if (opts.signal) opts.signal.removeEventListener('abort', onExternalAbort);
  }

  let data: { ok?: boolean; reply?: string; model?: string; behavior?: string; timestamp?: string; error?: string } = {};
  try {
    data = await res.json();
  } catch {
    // Respuesta no JSON (por ejemplo rewrite de SPA o proxy): error genérico amigable.
    throw new NexuraIAError(
      res.ok ? 'EMPTY_AI_RESPONSE' : `HTTP_${res.status}`,
      friendlyErrorMessage('AI_UPSTREAM_ERROR')
    );
  }

  if (!res.ok || !data.ok || typeof data.reply !== 'string' || !data.reply.trim()) {
    // Mapeo defensivo por status HTTP cuando el backend no envía código explícito:
    // 401/403 → problema de configuración del servidor (NO reintentar en bucle);
    // 429 → rate limit (temporal, reintento manual tras espera);
    // 5xx → upstream.
    let code = typeof data.error === 'string' && data.error ? data.error : `HTTP_${res.status}`;
    if (code.startsWith('HTTP_')) {
      if (res.status === 401 || res.status === 403) code = 'AI_AUTH_ERROR';
      else if (res.status === 429) code = 'AI_RATE_LIMIT';
      else if (res.status >= 500) code = 'AI_UPSTREAM_ERROR';
    }
    throw new NexuraIAError(code, friendlyErrorMessage(code));
  }

  return {
    reply: data.reply,
    model: data.model ?? '',
    behavior: isBehaviorId(data.behavior) ? data.behavior : undefined,
    timestamp: data.timestamp ?? new Date().toISOString(),
  };
}

function isBehaviorId(v: unknown): v is NexuraIaBehaviorId {
  return v === 'concisa' || v === 'equilibrada' || v === 'detallada';
}

/**
 * Consulta el estado REAL del servicio NEXURA IA en el backend (GET /api/ai/status).
 * No envía ni recibe secretos: solo booleano `configured` + nombre público del modelo.
 * - endpoint accesible y Gemini configurado → 'connected'
 * - endpoint accesible pero sin GEMINI_API_KEY → 'not-configured'
 * - HTTP error / respuesta no JSON → 'error'
 * - fallo de red (fetch lanza) → 'unknown' (no se inventa el estado)
 */
export async function getNexuraIAStatus(opts: { signal?: AbortSignal } = {}): Promise<{
  state: NexuraIAConnectionState;
  status: NexuraIAStatus | null;
}> {
  let res: Response;
  try {
    res = await fetch(STATUS_ENDPOINT, { method: 'GET', signal: opts.signal });
  } catch {
    return { state: 'unknown', status: null };
  }

  if (!res.ok) return { state: 'error', status: null };

  let data: { ok?: boolean; configured?: boolean; model?: string } = {};
  try {
    data = await res.json();
  } catch {
    // HTML (rewrite de SPA) u otra respuesta inesperada: la función no está desplegada.
    return { state: 'error', status: null };
  }

  if (data.ok !== true || typeof data.configured !== 'boolean') {
    return { state: 'error', status: null };
  }

  return {
    state: data.configured ? 'connected' : 'not-configured',
    status: { configured: data.configured, model: typeof data.model === 'string' ? data.model : '' },
  };
}

/** Códigos de error que NO conviene reintentar automáticamente (configuración/validación). */
export const NON_RETRYABLE_ERROR_CODES = new Set([
  'AI_NOT_CONFIGURED',
  'AI_AUTH_ERROR',
  'MESSAGE_REQUIRED',
  'MESSAGE_TOO_LONG',
  'METHOD_NOT_ALLOWED',
]);

export function isRetryableError(code: string): boolean {
  return !NON_RETRYABLE_ERROR_CODES.has(code);
}

export const NexuraIAService = { sendMessage, friendlyErrorMessage, getNexuraIAStatus, isRetryableError };
export default NexuraIAService;
