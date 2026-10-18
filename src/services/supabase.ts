/**
 * NEXURA 2.0 — Cliente Supabase (Etapa 1B.1: preparación segura)
 * -----------------------------------------------------------------------------
 * Fuente ÚNICA de configuración e instancia de Supabase para todo el frontend.
 *
 * REGLAS DE ESTA CAPA:
 *  - Lee SOLO variables públicas de Vite (`VITE_SUPABASE_URL`,
 *    `VITE_SUPABASE_ANON_KEY`). La anon key es pública por diseño; los
 *    privilegios reales se garantizan con RLS en el servidor (Etapa 1C).
 *  - NUNCA lee ni importa `SUPABASE_SERVICE_ROLE_KEY` (u otro secreto) en
 *    código del navegador. Los secretos server-side viven únicamente en
 *    funciones `/api/*` vía `process.env` (igual que `GEMINI_API_KEY`).
 *  - NO hardcodea URL ni claves: si las variables no están configuradas,
 *    el módulo NO lanza errores ni rompe el arranque de la app.
 *  - Es una capa PREPARADA pero INERTE en esta subetapa: ningún flujo de
 *    login/register/perfiles la consume todavía. El sistema local
 *    (`src/services/database.ts`) sigue siendo la fuente de verdad hasta
 *    la Etapa 1B.2.
 *
 * Patrón singleton: cualquier módulo debe importar `getSupabase()` /
 * `supabase` desde este archivo; bajo ningún punto crear clientes con
 * `createClient(...)` en otro lugar (evita múltiples instancias y sesiones
 * duplicadas en localStorage de supabase-js).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Claves de almacenamiento usadas por supabase-js (prefijo propio de NEXURA). */
const SUPABASE_STORAGE_PREFIX = 'nexura-supabase';

/**
 * Estructura mínima de `import.meta.env` que necesita este módulo.
 * Se tipa a propósito en lugar de depender de un `vite-env.d.ts` global
 * (el proyecto hoy no lo tiene; tsconfig no incluye tipos de Vite).
 */
interface ViteEnvLike {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

/** Lectura defensiva de env: funciona en navegador, tests o contextos sin Vite. */
function readEnv(): ViteEnvLike {
  try {
    return ((import.meta as unknown as { env?: ViteEnvLike })?.env ?? {}) as ViteEnvLike;
  } catch {
    return {};
  }
}

/** Configuración resuelta una sola vez al cargar el módulo (nunca falla). */
const env = readEnv();
const url = typeof env.VITE_SUPABASE_URL === 'string' ? env.VITE_SUPABASE_URL.trim() : '';
const anonKey = typeof env.VITE_SUPABASE_ANON_KEY === 'string' ? env.VITE_SUPABASE_ANON_KEY.trim() : '';

/**
 * True solo si URL y anon key están presentes Y la URL parece válida.
 * No valida credenciales contra el servidor: eso sería un side-effect
 * indebido en el arranque.
 */
export const isSupabaseConfigured: boolean = (() => {
  if (!url || !anonKey) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
})();

/** Instancia única compartida (lazy). `null` si Supabase no está configurado. */
let clientSingleton: SupabaseClient | null = null;

/**
 * Devuelve el cliente Supabase compartido, o `null` si el entorno todavía
 * no provee `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
 *
 * Contrato para los consumidores futuros (Etapa 1B.2+):
 *   const supabase = getSupabase();
 *   if (!supabase) { /* fallback local existente *\/ }
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (clientSingleton) return clientSingleton;
  try {
    clientSingleton = createClient(url, anonKey, {
      auth: {
        // Persistencia estándar de supabase-js; prefijo propio para no
        // colisionar con las claves locales `nexura_*` ya existentes.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: `${SUPABASE_STORAGE_PREFIX}-auth`,
      },
      global: { headers: { 'x-application-name': 'nexura' } },
    });
  } catch {
    // Configuración presente pero inválida (p. ej. key corrupta): la app
    // debe seguir funcionando con el sistema local. Nunca romper el arranque.
    console.warn('[supabase] No se pudo inicializar el cliente; NEXURA continúa en modo local.');
    return null;
  }
  return clientSingleton;
}

/**
 * Acceso directo a la singleton (evaluada al importar). Mantiene tipo
 * `SupabaseClient | null` para obligar a los consumidores a verificarla.
 * Recomendado para legibilidad: `import { supabase } ...` + chequeo nulo.
 */
export const supabase: SupabaseClient | null = getSupabase();

/** Estado de configuración para diagnósticos/UI futura (sin exponer valores). */
export function getSupabaseStatus(): {
  configured: boolean;
  reason?: 'missing_url' | 'missing_anon_key' | 'invalid_url';
} {
  if (isSupabaseConfigured) return { configured: true };
  if (!url) return { configured: false, reason: 'missing_url' };
  if (!anonKey) return { configured: false, reason: 'missing_anon_key' };
  return { configured: false, reason: 'invalid_url' };
}
