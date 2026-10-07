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
 * ALCANCE Etapa 2: un mensaje → una respuesta. Sin memoria, sin historial
 * persistente, sin imágenes, sin voz, sin herramientas externas.
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

/** Traducción de códigos de error del backend a mensajes amigables. */
const FRIENDLY_ERRORS: Record<string, string> = {
  MESSAGE_REQUIRED: 'Escribí un mensaje para poder responder.',
  MESSAGE_TOO_LONG: 'Tu mensaje es demasiado largo. Probá con uno más corto (máximo 4.000 caracteres).',
  METHOD_NOT_ALLOWED: 'No se pudo procesar la solicitud. Intentá de nuevo.',
  AI_NOT_CONFIGURED: 'NEXURA IA todavía no está configurada en el servidor. Volvé a intentar más tarde.',
  EMPTY_AI_RESPONSE: 'NEXURA IA no pudo generar una respuesta. Probá enviando el mensaje de nuevo.',
  AI_UPSTREAM_ERROR: 'Hubo un problema conectando con NEXURA IA. Revisá tu conexión e intentá otra vez.',
  NETWORK_ERROR: 'No se pudo conectar con el servidor de NEXURA IA. Verificá tu conexión e intentá de nuevo.',
  TIMEOUT: 'NEXURA IA tardó demasiado en responder. Intentá nuevamente.',
};

export function friendlyErrorMessage(code: string): string {
  return FRIENDLY_ERRORS[code] ?? 'Ocurrió un error inesperado con NEXURA IA. Intentá nuevamente.';
}

/**
 * Envía un mensaje de texto al backend seguro y devuelve la respuesta de Gemini.
 * Lanza NexuraIAError con código y mensaje amigable ante cualquier fallo.
 */
export async function sendMessage(
  message: string,
  opts: { signal?: AbortSignal; behavior?: NexuraIaBehaviorId } = {}
): Promise<NexuraIAChatResult> {
  const trimmed = message.trim();

  if (!trimmed) {
    throw new NexuraIAError('MESSAGE_REQUIRED', friendlyErrorMessage('MESSAGE_REQUIRED'));
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new NexuraIAError('MESSAGE_TOO_LONG', friendlyErrorMessage('MESSAGE_TOO_LONG'));
  }

  let res: Response;
  try {
    res = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: trimmed, ...(opts.behavior ? { behavior: opts.behavior } : {}) }),
      signal: opts.signal,
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new NexuraIAError('NETWORK_ERROR', friendlyErrorMessage('NETWORK_ERROR'));
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
    const code = typeof data.error === 'string' ? data.error : `HTTP_${res.status}`;
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

export const NexuraIAService = { sendMessage, friendlyErrorMessage, getNexuraIAStatus };
export default NexuraIAService;
