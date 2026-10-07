/**
 * NEXURA IA — Endpoint de estado seguro (Etapa 4)
 *
 * GET /api/ai/status
 *
 * Devuelve ÚNICAMENTE información pública de estado del servicio NEXURA IA:
 *   { ok, configured, model }
 *
 * SEGURIDAD:
 *  - La presencia de GEMINI_API_KEY se comprueba como booleano; el valor del
 *    secreto NUNCA se lee en la respuesta, NUNCA se loguea, NUNCA se expone.
 *  - No requiere sesión ni roles: la información devuelta es no sensible
 *    (configurada sí/no + nombre del modelo público).
 *  - Lo consume el Control Center (Configuración de plataforma → NEXURA IA)
 *    para mostrar un estado REAL de conexión, sin inventarlo.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const DEFAULT_MODEL = 'gemini-2.5-flash';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Solo cabeceras: no expone secretos.
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  // Booleano únicamente: jamás el valor del secreto.
  const configured = Boolean(process.env.GEMINI_API_KEY);
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;

  res.status(200).json({ ok: true, configured, model });
}
