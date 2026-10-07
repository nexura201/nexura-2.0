/**
 * NexuraIAService — Cliente del frontend para NEXURA IA (Etapa 2)
 * ----------------------------------------------------------------
 * Conecta la interfaz de NEXURA IA con el endpoint serverless seguro:
 *
 *   POST /api/ai/chat   { message: string }
 *        → 200 { ok: true, reply, model, timestamp }
 *        → 4xx/5xx { ok: false, error: CODE }
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

export interface NexuraIAChatResult {
  reply: string;
  model: string;
  timestamp: string;
}

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
const MAX_MESSAGE_LENGTH = 4000; // Coincide con la validación del backend.

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
  opts: { signal?: AbortSignal } = {}
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
      body: JSON.stringify({ message: trimmed }),
      signal: opts.signal,
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new NexuraIAError('NETWORK_ERROR', friendlyErrorMessage('NETWORK_ERROR'));
  }

  let data: { ok?: boolean; reply?: string; model?: string; timestamp?: string; error?: string } = {};
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
    timestamp: data.timestamp ?? new Date().toISOString(),
  };
}

export const NexuraIAService = { sendMessage, friendlyErrorMessage };
export default NexuraIAService;
