/**
 * NEXURA IA — Endpoint seguro de chat (Etapa 1)
 *
 * POST /api/ai/chat
 *
 * Flujo: Usuario → NEXURA IA (frontend) → este endpoint serverless → Google Gemini → respuesta.
 *
 * SEGURIDAD:
 *  - La API Key se lee ÚNICAMENTE del entorno del servidor: process.env.GEMINI_API_KEY.
 *  - NUNCA se envía la API Key al frontend, NUNCA se imprime en logs, NUNCA se incluye en respuestas de error.
 *  - El frontend NO debe recibir el objeto `process` ni ningún derivado del entorno.
 *
 * Esta función es una Serverless Function de Vercel (también ejecutable con `vercel dev`).
 * No forma parte del bundle de Vite (tsconfig solo incluye "src"), por lo que
 * GEMINI_API_KEY jamás queda embebida en el código público del navegador.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
// Contexto centralizado de NEXURA IA (Etapa 3A): identidad, funciones reales y reglas.
// Módulo .ts puro SIN secretos: la GEMINI_API_KEY sigue leyendo solo de process.env arriba.
import {
  buildNexuraIaSystemPrompt,
  BEHAVIOR_PARAMS,
} from '../../src/config/nexuraIA.context';

/** Modelo de Gemini usado por NEXURA IA (fallback si no hay configuración guardada). */
const DEFAULT_MODEL = 'gemini-2.5-flash';

/** Límite duro de longitud del mensaje entrante (validación básica, sin costo). */
const MAX_MESSAGE_LENGTH = 4000;

/** Tokens de salida usados en el runtime serverless (sin localStorage compartido). */
const SERVER_MAX_OUTPUT_TOKENS = 2048;

/**
 * Resolución del modelo REALMENTE aplicada por el servidor:
 * GEMINI_MODEL (entorno) > default de NEXURA.
 * El selector de modelo del panel es una preferencia administrativa que se
 * refleja en el servidor mediante la variable de entorno GEMINI_MODEL
 * (el runtime serverless no comparte el localStorage del navegador).
 */
function resolveModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

/** Comportamiento realmente aplicado: GEMINI_BEHAVIOR (entorno) > equilibrado. */
function resolveBehaviorSettings(): { behavior: keyof typeof BEHAVIOR_PARAMS; maxResponseTokens: number } {
  const b = process.env.GEMINI_BEHAVIOR?.trim().toLowerCase();
  const behavior: keyof typeof BEHAVIOR_PARAMS =
    b === 'concise' || b === 'balanced' || b === 'detailed' ? b : 'balanced';
  return { behavior, maxResponseTokens: SERVER_MAX_OUTPUT_TOKENS };
}

/**
 * GET /api/ai/chat — Verificación segura de estado (sin secretos).
 * Informa al Control Center si la función está desplegada y si el servidor
 * tiene configurada la variable GEMINI_API_KEY (solo booleanos; jamás valores).
 */
function handleStatus(req: VercelRequest, res: VercelResponse) {
  const envEnabled = process.env.GEMINI_AI_ENABLED?.trim().toLowerCase();
  res.status(200).json({
    ok: true,
    service: 'nexura-ia',
    endpointReady: true,
    configured: Boolean(process.env.GEMINI_API_KEY),
    model: resolveModel(),
    enabled: !(envEnabled === 'false' || envEnabled === '0'),
    timestamp: new Date().toISOString(),
  });
}

/** CORS mínimo para permitir llamadas desde el frontend desplegado. */
function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Solo cabeceras: no expone secretos.
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // GET → verificación segura de estado (usada por el Control Center).
  if (req.method === 'GET') {
    handleStatus(req, res);
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  try {
    // ── Pausa operativa del servicio (variable de entorno del servidor) ───
    // Honestidad: el toggle "Activa/Desactivada" del panel se guarda en el
    // navegador del OWNER; la pausa REAL del servicio en producción se hace
    // con GEMINI_AI_ENABLED=false en Vercel (sin redeploy de código).
    const envEnabled = process.env.GEMINI_AI_ENABLED?.trim().toLowerCase();
    if (envEnabled === 'false' || envEnabled === '0') {
      res.status(503).json({ ok: false, error: 'AI_DISABLED' });
      return;
    }

    // ── 1. Validación de la solicitud ─────────────────────────────────────
    const body = (req.body ?? {}) as { message?: unknown };
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!message) {
      res.status(400).json({ ok: false, error: 'MESSAGE_REQUIRED' });
      return;
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      res.status(400).json({ ok: false, error: 'MESSAGE_TOO_LONG' });
      return;
    }

    // ── 2. Secreto SOLO del lado servidor ─────────────────────────────────
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // No logueamos ni exponemos valores; solo el nombre de la variable faltante.
      console.error('[NEXURA IA] Config faltante: variable de entorno GEMINI_API_KEY no definida en el servidor.');
      res.status(500).json({ ok: false, error: 'AI_NOT_CONFIGURED' });
      return;
    }

    // Nota honesta sobre configuración: el runtime serverless NO comparte el
    // localStorage del navegador donde el panel OWNER guarda su configuración.
    // Por eso, en producción el modelo/behavior efectivos los define el
    // ENTORNO del servidor (GEMINI_MODEL, GEMINI_BEHAVIOR); si no están
    // definidos, se usan los defaults de NEXURA.
    const effectiveSettings = resolveBehaviorSettings();
    const model = resolveModel();

    // ── 3. Llamada a Google Gemini (SDK oficial @google/genai) ────────────
    const ai = new GoogleGenAI({ apiKey });

    const result = await ai.models.generateContent({
      model,
      contents: message,
      config: {
        // Comportamiento configurado (entorno > default serverless).
        temperature: BEHAVIOR_PARAMS[effectiveSettings.behavior].temperature,
        maxOutputTokens: effectiveSettings.maxResponseTokens,
        // Identidad + contexto oficial + reglas de comportamiento (Etapa 3A).
        // Fuente única: src/config/nexuraIA.context.ts (sin duplicar en el frontend).
        systemInstruction: buildNexuraIaSystemPrompt(effectiveSettings),
      },
    });

    const reply: string = result.text ?? '';

    if (!reply) {
      res.status(502).json({ ok: false, error: 'EMPTY_AI_RESPONSE' });
      return;
    }

    // ── 4. Respuesta JSON limpia al frontend (sin secretos ni metadatos sensibles) ─
    res.status(200).json({
      ok: true,
      reply,
      model,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    // Manejo defensivo: nunca reenviamos el detalle interno al navegador
    // (podría contener información de la cuenta/proveedor).
    const name = err && typeof err === 'object' && 'name' in err ? String((err as { name: unknown }).name) : 'Error';
    console.error(`[NEXURA IA] Error al procesar la solicitud (${name}).`);
    res.status(502).json({ ok: false, error: 'AI_UPSTREAM_ERROR' });
  }
}
