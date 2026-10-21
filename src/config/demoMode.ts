/**
 * demoMode.ts — Única fuente de verdad del MODO DEMO de NEXURA.
 *
 * El modo demo permite mostrar la plataforma con contenido de ejemplo
 * (canales, streams, reels, clips, chat, notificaciones, actividad)
 * sin base de datos real. Todos los datos demo son locales al navegador
 * y están claramente identificados como demostración.
 *
 * Activación:
 *   - VITE_DEMO_MODE=true  (variable de entorno de build; recomendado)
 *   - localStorage nexura_demo_mode = 'true' | 'false' (override manual,
 *     útil para activar/desactivar sin recompilar)
 *
 * Valor por defecto SEGURO: ON en desarrollo local, OFF en producción
 * salvo que el comprador active explícitamente VITE_DEMO_MODE=true.
 */

const DEMO_FLAG_KEY = 'nexura_demo_mode';

function readEnvFlag(): boolean | null {
  try {
    const env = (import.meta as any)?.env ?? {};
    const raw = typeof env.VITE_DEMO_MODE === 'string' ? env.VITE_DEMO_MODE.trim().toLowerCase() : '';
    if (raw === 'true' || raw === '1') return true;
    if (raw === 'false' || raw === '0') return false;
  } catch {
    /* import.meta no disponible */
  }
  return null;
}

function readStorageOverride(): boolean | null {
  try {
    const raw = localStorage.getItem(DEMO_FLAG_KEY);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
  } catch {
    /* almacenamiento no disponible */
  }
  return null;
}

/** ¿El modo demo está activo? (única consulta autorizada en toda la app) */
export function isDemoMode(): boolean {
  const override = readStorageOverride();
  if (override !== null) return override;
  const env = readEnvFlag();
  if (env !== null) return env;
  // Default seguro: demo ON en dev local, OFF en builds de producción.
  return !!(import.meta as any)?.env?.DEV;
}

/** Cambiar el modo demo desde la UI (persiste override local). */
export function setDemoMode(enabled: boolean): void {
  try {
    localStorage.setItem(DEMO_FLAG_KEY, String(enabled));
  } catch {
    /* almacenamiento no disponible */
  }
}

/** Etiqueta corta reutilizable para UI ("DEMO"). */
export const DEMO_BADGE_LABEL = 'DEMO';
