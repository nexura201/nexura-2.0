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
import { buildNexuraIaSystemPrompt } from '../../src/config/nexuraIA.context';

/** Modelo de Gemini usado por NEXURA IA (configurable vía entorno de servidor). */
const DEFAULT_MODEL = 'gemini-2.5-flash';

/** Límite de longitud del mensaje entrante (validación básica, sin costo). */
const MAX_MESSAGE_LENGTH = 4000;

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

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  try {
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

    const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;

    // ── 3. Llamada a Google Gemini (SDK oficial @google/genai) ────────────
    const ai = new GoogleGenAI({ apiKey });

    const result = await ai.models.generateContent({
      model,
      contents: message,
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        // Identidad + contexto oficial + reglas de comportamiento (Etapa 3A).
        // Fuente única: src/config/nexuraIA.context.ts (sin duplicar en el frontend).
        systemInstruction: buildNexuraIaSystemPrompt(),
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
