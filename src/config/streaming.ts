/**
 * NEXURA — Configuración centralizada de infraestructura de streaming (Etapa 4)
 *
 * Punto único donde el comprador/administrador define los endpoints de su propia
 * infraestructura de streaming. NEXURA NO incluye un servidor RTMP/HLS propio:
 * estas URLs apuntan a servidores externos (MediaMTX, nginx-rtmp, SRS u otro
 * compatible) que deben desplegarse y mantenerse por separado.
 *
 * Variables de entorno (Vite):
 *   VITE_RTMP_SERVER_URL → URL de ingestión mostrada en OBS/Streamlabs.
 *                          Ej: rtmp://mi-servidor.ejemplo/live
 *   VITE_HLS_BASE_URL    → Base pública de reproducción HLS.
 *                          Ej: https://stream.mi-dominio.ejemplo/hls
 *
 * SEGURIDAD: las variables VITE_* quedan disponibles en el bundle del frontend.
 * Solo colocar aquí URLs públicas de configuración. NUNCA contraseñas, tokens,
 * stream keys ni credenciales de ningún tipo.
 */

import { mediaServerService } from '../services/mediaServer.service';

/**
 * Estructura mínima de `import.meta.env` que necesita este módulo.
 * Se tipa a propósito (igual que src/services/supabase.ts) porque el proyecto
 * no posee un vite-env.d.ts global ni tipos de Vite en tsconfig.
 */
interface ViteEnvLike {
  VITE_RTMP_SERVER_URL?: string;
  VITE_HLS_BASE_URL?: string;
}

/** Lectura defensiva de env: funciona en navegador, tests o contextos sin Vite. */
function readEnv(): ViteEnvLike {
  try {
    return ((import.meta as unknown as { env?: ViteEnvLike })?.env ?? {}) as ViteEnvLike;
  } catch {
    return {};
  }
}

/**
 * Fallback de DEMOSTRACIÓN (no es infraestructura real).
 * Se usa únicamente cuando no hay configuración vía env ni servidores registrados
 * en el panel Owner → Servers. La UI debe etiquetarlo como demo/local y nunca
 * presentarlo como una conexión real en funcionamiento.
 */
export const DEMO_STREAMING_TARGETS = {
  rtmp: 'rtmp://localhost:1935/live',
  hlsBase: 'http://localhost:8888/hls',
} as const;

/** Resuelve la URL RTMP de ingestión (para configurar OBS/Streamlabs). */
export function getRtmpServerUrl(): string {
  const env = readEnv().VITE_RTMP_SERVER_URL ?? '';
  if (env) return env.replace(/\/+$/, '');
  // Compatibilidad: si el Owner registró servidores en el panel, usar el primero disponible.
  try {
    const servers = mediaServerService.getAllServers();
    const active = servers.find((s) => s.status !== 'DOWN');
    if (active?.rtmpUrl) return active.rtmpUrl.replace(/\/+$/, '');
  } catch {
    /* almacenamiento no disponible → fallback demo */
  }
  return DEMO_STREAMING_TARGETS.rtmp;
}

/** Resuelve la URL base de reproducción HLS (sin slash final). */
export function getHlsBaseUrl(): string {
  const env = readEnv().VITE_HLS_BASE_URL ?? '';
  if (env) return env.replace(/\/+$/, '');
  try {
    const servers = mediaServerService.getAllServers();
    const active = servers.find((s) => s.status !== 'DOWN');
    if (active?.hlsUrl) return active.hlsUrl.replace(/\/+$/, '');
  } catch {
    /* almacenamiento no disponible → fallback demo */
  }
  return DEMO_STREAMING_TARGETS.hlsBase;
}

/** Construye la URL HLS completa de playback para un stream dado. */
export function buildHlsPlaybackUrl(streamKeyOrSlug: string): string {
  return `${getHlsBaseUrl()}/${encodeURIComponent(streamKeyOrSlug)}/index.m3u8`;
}

/** true si la URL RTMP resuelta corresponde al endpoint de demostración local. */
export function isDemoRtmpUrl(url?: string): boolean {
  const candidate = (url ?? getRtmpServerUrl()).toLowerCase();
  return candidate.includes('localhost') || candidate.includes('127.0.0.1');
}

/** true si la base HLS resuelta corresponde al endpoint de demostración local. */
export function isDemoHlsUrl(url?: string): boolean {
  const candidate = (url ?? getHlsBaseUrl()).toLowerCase();
  return candidate.includes('localhost') || candidate.includes('127.0.0.1');
}

/** Estado de configuración de infraestructura (sin afirmar conectividad real). */
export interface StreamingConfigStatus {
  /** true si hay configuración vía env o servidores registrados por el Owner. */
  configured: boolean;
  /** true si la URL activa es el fallback de demo/localhost. */
  isDemo: boolean;
  rtmpUrl: string;
  hlsBaseUrl: string;
  /** Origen de la configuración activa. */
  source: 'env' | 'owner-panel' | 'demo-default';
}

/**
 * Informa cómo está configurada la infraestructura de streaming.
 * IMPORTANTE: "configurado" significa que existe una URL definida; NO afirma
 * que el servidor esté online o funcionando (no hay comprobación real de
 * conectividad en esta etapa).
 */
export function getStreamingConfigStatus(): StreamingConfigStatus {
  const envRtmp = readEnv().VITE_RTMP_SERVER_URL ?? '';
  const envHls = readEnv().VITE_HLS_BASE_URL ?? '';
  let ownerRegistered = false;
  try {
    ownerRegistered = mediaServerService.getAllServers().some((s) => !isDemoRtmpUrl(s.rtmpUrl) && !!s.rtmpUrl);
  } catch {
    ownerRegistered = false;
  }
  const source: StreamingConfigStatus['source'] = envRtmp || envHls ? 'env' : ownerRegistered ? 'owner-panel' : 'demo-default';
  const rtmpUrl = getRtmpServerUrl();
  const hlsBaseUrl = getHlsBaseUrl();
  return {
    configured: source !== 'demo-default',
    isDemo: source === 'demo-default' || (isDemoRtmpUrl(rtmpUrl) && isDemoHlsUrl(hlsBaseUrl)),
    rtmpUrl,
    hlsBaseUrl,
    source,
  };
}
