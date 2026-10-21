/**
 * demoData.ts — Provider centralizado de datos de DEMOSTRACIÓN de NEXURA.
 *
 * ⚠️ Todos los datos generados aquí son ficticios y locales (localStorage).
 * No representan usuarios reales, streams reales ni actividad compartida.
 * La UI debe etiquetarlos como "DEMO" cuando puedan confundirse con reales.
 *
 * Reglas:
 *  - Idempotente: nunca pisa datos existentes; solo agrega lo que falta.
 *  - Solo toca entidades cuyo username empieza con "demo_" (identificables).
 *  - NUNCA genera datos financieros (balances, ingresos, transacciones).
 *  - Coherencia cruzada: canales ↔ streams ↔ reels ↔ clips ↔ chat ↔
 *    notificaciones ↔ actividad usan siempre los mismos canales demo.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  User, Channel, Follow, Stream, ViewerCount,
  ChatMessage, Notification, ChannelActivity, Reel, Clip, Video,
} from '../types';
import { createCategory, getAllCategories } from './category';
import { isDemoMode } from '../config/demoMode';

// ============ KEYS (mismas que usan los servicios reales) ============
const KEYS = {
  users: 'nexura_users',
  channels: 'nexura_channels',
  follows: 'nexura_follows',
  streams: 'nexura_streams',
  streamSessions: 'nexura_stream_sessions',
  viewerCounts: 'nexura_viewer_counts',
  chatMessages: 'nexura_chat_messages',
  notifications: 'nexura_notifications',
  activity: 'nexura_channel_activity',
  reels: 'nexura_reels',
  clips: 'nexura_clips',
  videos: 'nexura_videos',
};

export const DEMO_SEED_VERSION_KEY = 'nexura_demo_seed_version';
export const DEMO_SEED_VERSION = '1';

/** Prefijo que identifica a TODAS las entidades demo (no se usa en producción). */
export const DEMO_USERNAME_PREFIX = 'demo_';

function get<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function set<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

// ============ DEFINICIÓN COHERENTE DEL UNIVERSO DEMO ============

interface DemoChannelDef {
  username: string;
  displayName: string;
  bio: string;
  category: string;      // slug/nombre de categoría demo
  followers: number;     // seguidores ficticios (marcados como demo)
  live?: { title: string; viewers: number };
  offline?: boolean;
}

const DEMO_CHANNELS: DemoChannelDef[] = [
  {
    username: 'demo_nexuragaming',
    displayName: 'Nexura Gaming',
    bio: 'Canales de demostración · Speedruns y partidas comentadas. Este canal es ficticio.',
    category: 'Gaming',
    followers: 1284,
    live: { title: 'Speedrun solidario — intento #42', viewers: 1230 },
  },
  {
    username: 'demo_codetalk',
    displayName: 'CodeTalk',
    bio: 'Demostración de streaming de desarrollo en vivo. Contenido ficticio de ejemplo.',
    category: 'Ciencia y Tecnología',
    followers: 742,
    live: { title: 'Refactorizando el reproductor HLS en vivo', viewers: 356 },
  },
  {
    username: 'demo_lofi_studio',
    displayName: 'Lo-Fi Studio',
    bio: 'Música ambiental de ejemplo para concentrarse. Canal ficticio de demostración.',
    category: 'Música',
    followers: 2109,
    live: { title: '24/7 Lo-Fi · beats para programar', viewers: 2411 },
  },
  {
    username: 'demo_artisans',
    displayName: 'Artisans del Dibujo',
    bio: 'Tutoriales de ilustración digital. Perfil de demostración, no es un artista real.',
    category: 'Arte',
    followers: 517,
  },
  {
    username: 'demo_travellog',
    displayName: 'TravelLog',
    bio: 'Crónicas de viaje editadas. Canal OFFLINE de ejemplo para mostrar estados mixtos.',
    category: 'Viajes',
    followers: 389,
    offline: true,
  },
];

const DEMO_CATEGORIES = ['Gaming', 'Música', 'Ciencia y Tecnología', 'Arte', 'Viajes'];

// ============ PUBLIC API ============

/**
 * Siembra el universo demo de forma idempotente. Se llama al arrancar la app
 * únicamente si `isDemoMode()` es true. No lanza errores fatales: si algo
 * falla, la app sigue funcionando sin contenido demo.
 */
export function seedDemoData(): void {
  if (!isDemoMode()) return;
  try {
    doSeed();
    localStorage.setItem(DEMO_SEED_VERSION_KEY, DEMO_SEED_VERSION);
  } catch (err) {
    console.warn('[DEMO] No se pudo completar la semilla demo:', (err as Error)?.message ?? err);
  }
}

/** Estado del seed (para /demo-info). */
export function getDemoStatus() {
  const users = get<User>(KEYS.users).filter(u => u.username.startsWith(DEMO_USERNAME_PREFIX));
  const streams = get<Stream>(KEYS.streams);
  const liveStreams = streams.filter(s => s.status === 'LIVE');
  return {
    active: isDemoMode(),
    channels: users.length,
    liveStreams: liveStreams.length,
    reels: get<Reel>(KEYS.reels).length,
    clips: get<Clip>(KEYS.clips).length,
    version: (() => { try { return localStorage.getItem(DEMO_SEED_VERSION_KEY); } catch { return null; } })(),
  };
}

/**
 * Restaura los datos demo originales: elimina ÚNICAMENTE entidades creadas
 * por el seed demo (usuarios `demo_*` y todo lo que cuelga de ellos) y
 * vuelve a sembrar. No toca cuentas reales/locales del propietario del
 * navegador ni datos financieros (nunca existen en demo).
 */
export function resetDemoData(): { removed: number } {
  let removed = 0;

  const users = get<User>(KEYS.users);
  const demoUsers = users.filter(u => u.username.startsWith(DEMO_USERNAME_PREFIX));
  const demoUserIds = new Set(demoUsers.map(u => u.id));
  removed += demoUsers.length;

  const channels = get<Channel>(KEYS.channels);
  const demoChannels = channels.filter(c => demoUserIds.has(c.userId));
  const demoChannelIds = new Set(demoChannels.map(c => c.id));
  removed += demoChannels.length;

  const streams = get<Stream>(KEYS.streams);
  const demoStreamIds = new Set(streams.filter(s => demoChannelIds.has(s.channelId)).map(s => s.id));
  removed += demoStreamIds.size;

  set(KEYS.users, users.filter(u => !demoUserIds.has(u.id)));
  set(KEYS.channels, channels.filter(c => !demoChannelIds.has(c.id)));
  set(KEYS.follows, get<Follow>(KEYS.follows).filter(f => !demoUserIds.has(f.followerId) && !demoUserIds.has(f.followingId)));
  set(KEYS.streams, streams.filter(s => !demoChannelIds.has(s.channelId)));
  set(KEYS.streamSessions, get<any>(KEYS.streamSessions).filter(ss => !demoStreamIds.has(ss.streamId)));
  set(KEYS.viewerCounts, get<ViewerCount>(KEYS.viewerCounts).filter(v => !demoChannelIds.has(v.channelId)));
  set(KEYS.chatMessages, get<ChatMessage>(KEYS.chatMessages).filter(m => !demoChannelIds.has(m.channelId)));
  set(KEYS.notifications, get<Notification>(KEYS.notifications).filter(n => !(n.data?.demo === true && demoUserIds.has(n.userId))));
  set(KEYS.activity, get<ChannelActivity>(KEYS.activity).filter(a => !demoChannelIds.has(a.channelId)));
  set(KEYS.reels, get<Reel>(KEYS.reels).filter(r => !demoChannelIds.has(r.channelId)));
  set(KEYS.clips, get<Clip>(KEYS.clips).filter(c => !demoChannelIds.has(c.channelId)));
  set(KEYS.videos, get<Video>(KEYS.videos).filter(v => !demoChannelIds.has(v.channelId)));

  // Volver a sembrar con valores originales
  doSeed(true);
  return { removed };
}

// ============ IMPLEMENTACIÓN DEL SEED ============

function ensureCategories(): Map<string, string> {
  const byName = new Map<string, string>();
  for (const c of getAllCategories()) byName.set(c.name.toLowerCase(), c.id);

  for (const name of DEMO_CATEGORIES) {
    if (!byName.has(name.toLowerCase())) {
      try {
        const cat = createCategory({ name, description: `Categoría de demostración: ${name}.` });
        byName.set(cat.name.toLowerCase(), cat.id);
      } catch { /* ya existe o fallo menor: continuar */ }
    }
  }
  return byName;
}

function doSeed(force = false): void {
  if (!force && localStorage.getItem(DEMO_SEED_VERSION_KEY) === DEMO_SEED_VERSION) {
    // Ya sembrado en esta versión; solo asegurar coherencia mínima de LIVE flags.
    return;
  }

  const categories = ensureCategories();
  const now = new Date().toISOString();

  const users = get<User>(KEYS.users);
  const channels = get<Channel>(KEYS.channels);
  const follows = get<Follow>(KEYS.follows);

  const created: Array<{ def: DemoChannelDef; user: User; channel: Channel }> = [];

  for (const def of DEMO_CHANNELS) {
    let user = users.find(u => u.username === def.username);
    if (!user) {
      user = {
        id: uuidv4(),
        username: def.username,
        email: `${def.username}@demo.nexura.local`,
        passwordHash: '', // SIN contraseña: cuenta demo no autenticable
        displayName: def.displayName,
        bio: def.bio,
        avatarUrl: '',
        bannerUrl: '',
        createdAt: ago(60 * 24 * 30),
        updatedAt: now,
        lastLoginAt: now,
        emailVerified: true,
        role: 'USER',
        status: 'ACTIVE',
      };
      users.push(user);
    }

    let channel = channels.find(c => c.userId === user!.id);
    if (!channel) {
      channel = {
        id: uuidv4(),
        userId: user.id,
        slug: user.username.replace(/^demo_/, ''),
        title: `${def.displayName} · canal de demostración`,
        description: def.bio,
        categoryId: categories.get(def.category.toLowerCase()) ?? null,
        avatarUrl: '',
        bannerUrl: '',
        isLive: !!def.live,
        createdAt: ago(60 * 24 * 30),
        updatedAt: now,
      };
      channels.push(channel);
    } else {
      channel.isLive = !!def.live;
    }

    created.push({ def, user, channel });
  }

  // Seguidores ficticios entre canales demo (coherentes y visibles como demo)
  for (const entry of created) {
    for (const other of created) {
      if (entry === other) continue;
      const exists = follows.some(f => f.followerId === other.user.id && f.followingId === entry.user.id);
      if (!exists) {
        follows.push({ id: uuidv4(), followerId: other.user.id, followingId: entry.user.id, createdAt: ago(Math.floor(Math.random() * 20000) + 60) });
      }
    }
  }

  set(KEYS.users, users);
  set(KEYS.channels, channels);
  set(KEYS.follows, follows);

  // ---- Streams demo (metadatos ficticios, NO transmisiones reales) ----
  const streams = get<Stream>(KEYS.streams);
  const sessions = get<any>(KEYS.streamSessions);
  const viewerCounts = get<ViewerCount>(KEYS.viewerCounts);

  for (const { def, channel } of created) {
    if (!def.live) continue;
    const existing = streams.find(s => s.channelId === channel.id);
    if (existing) continue;

    const started = ago(45 + Math.floor(Math.random() * 90));
    const stream: Stream = {
      id: uuidv4(),
      channelId: channel.id,
      title: def.live.title,
      categoryId: channel.categoryId,
      tags: ['demo'],
      thumbnailUrl: '',
      status: 'LIVE',
      // Los streams demo son metadatos ficticios: no se emiten contra ninguna
      // Stream Key real (la gestión de Stream Key de la Etapa 2 permanece intacta).
      streamKeyId: '',
      startedAt: started,
      endedAt: null,
      lastHeartbeatAt: now,
      viewerCount: def.live.viewers,
      peakViewerCount: Math.round(def.live.viewers * 1.35),
      createdAt: started,
      updatedAt: now,
    };
    streams.push(stream);
    sessions.push({
      id: uuidv4(),
      streamId: stream.id,
      startedAt: started,
      endedAt: null,
      lastHeartbeatAt: now,
      sourceIp: 'demo',
      ingestServer: 'demo',
      status: 'LIVE',
      createdAt: started,
      updatedAt: now,
    });
    viewerCounts.push({ channelId: channel.id, current: def.live.viewers, peak: stream.peakViewerCount, updatedAt: now });
  }
  set(KEYS.streams, streams);
  set(KEYS.streamSessions, sessions);
  set(KEYS.viewerCounts, viewerCounts);

  // ---- Chat demo (mensajes claramente ficticios, userId 'demo_bot') ----
  const messages = get<ChatMessage>(KEYS.chatMessages);
  for (const { def, channel } of created) {
    if (!def.live) continue;
    const has = messages.some(m => m.channelId === channel.id && m.userId === 'demo_bot');
    if (has) continue;
    const conversation = [
      '¡Bienvenidos al chat de DEMOSTRACIÓN! Estos mensajes son ficticios.',
      'Este canal es un ejemplo local: no hay espectadores reales.',
      'Podés escribir acá para probar el chat igual que en producción.',
      'El modo demo muestra cómo se vería una sala activa 🎬',
    ];
    conversation.forEach((text, i) => {
      messages.push({
        id: uuidv4(),
        channelId: channel.id,
        streamId: '',
        userId: 'demo_bot',
        username: 'nexura_demo_bot',
        displayName: 'NEXURA Demo Bot',
        avatarUrl: '',
        role: 'USER',
        message: text,
        createdAt: ago(30 - i * 2),
      });
    });
  }
  set(KEYS.chatMessages, messages);

  // ---- Notificaciones demo (solo para usuarios demo) ----
  const notifications = get<Notification>(KEYS.notifications);
  for (const { def, user, channel } of created) {
    const has = notifications.some(n => n.userId === user.id && n.data?.demo === true);
    if (has) continue;
    const items: Array<Pick<Notification, 'type' | 'title' | 'body'>> = [
      { type: 'STREAM_STARTED', title: 'Tu stream está activo (DEMO)', body: `${def.displayName}: "${def.live?.title ?? 'stream de ejemplo'}". Es contenido de demostración.` },
      { type: 'NEW_FOLLOWER', title: 'Nuevo seguidor (DEMO)', body: 'Un usuario ficticio comenzó a seguir tu canal de demostración.' },
      { type: 'SYSTEM', title: 'Modo demo de NEXURA', body: 'Esta instalación usa datos locales de demostración. Ver /demo-info.' },
    ];
    items.forEach((it, i) => {
      notifications.unshift({
        id: uuidv4(),
        userId: user.id,
        type: it.type,
        title: it.title,
        body: it.body,
        data: { demo: true, channelId: channel.id },
        read: i > 0,
        createdAt: ago(10 + i * 55),
      });
    });
  }
  set(KEYS.notifications, notifications);

  // ---- Actividad demo coherente por canal ----
  const activities = get<ChannelActivity>(KEYS.activity);
  for (const { def, channel } of created) {
    const has = activities.some(a => a.channelId === channel.id && a.metadata?.demo === true);
    if (has) continue;
    const entries: Array<{ type: ChannelActivity['type']; title: string; description: string; mins: number }> = [
      { type: 'STREAM_STARTED', title: 'Stream iniciado (DEMO)', description: def.live?.title ?? 'Stream de ejemplo', mins: 60 },
      { type: 'CLIP_CREATED', title: 'Nuevo clip publicado (DEMO)', description: 'Mejor momento del stream de ejemplo', mins: 180 },
      { type: 'NEW_FOLLOWER', title: 'Seguidores ficticios alcanzaron una meta', description: `Hito simulado: ${def.followers.toLocaleString('es')} seguidores demo`, mins: 300 },
    ];
    for (const e of entries) {
      activities.unshift({
        id: uuidv4(),
        channelId: channel.id,
        type: e.type,
        title: e.title,
        description: e.description,
        metadata: { demo: true },
        createdAt: ago(e.mins),
      });
    }
  }
  set(KEYS.activity, activities);

  // ---- Clips demo (metadatos; video placeholder interno) ----
  const clips = get<Clip>(KEYS.clips);
  if (clips.filter(c => c.storageKey?.startsWith('clips/demo/')).length === 0) {
    const clipDefs = [
      { ch: 0, title: 'Clip demo: final épico del speedrun', dur: 38 },
      { ch: 1, title: 'Clip demo: bug encontrado en vivo', dur: 25 },
      { ch: 2, title: 'Clip demo: drop lo-fi favorito del chat', dur: 45 },
      { ch: 0, title: 'Clip demo: reacción del momento', dur: 18 },
      { ch: 3, title: 'Clip demo: timelapse de ilustración', dur: 52 },
    ];
    for (const cd of clipDefs) {
      const entry = created[cd.ch];
      if (!entry) continue;
      clips.push({
        id: uuidv4(),
        channelId: entry.channel.id,
        videoId: null,
        streamId: null,
        creatorId: entry.user.id,
        title: cd.title,
        description: 'Clip de demostración (contenido ficticio, almacenamiento local).',
        startTime: 0,
        endTime: cd.dur,
        duration: cd.dur,
        status: 'READY',
        thumbnailUrl: '',
        videoUrl: '',
        storageKey: `clips/demo/${uuidv4()}`,
        views: 200 + Math.floor(Math.random() * 4000),
        createdAt: ago(120 + Math.floor(Math.random() * 5000)),
        updatedAt: now,
      });
    }
    set(KEYS.clips, clips);
  }

  // ---- VOD demo (metadatos; el comprador conecta su storage/CDN) ----
  const videos = get<Video>(KEYS.videos);
  if (videos.filter(v => v.storageKey?.startsWith('videos/demo/')).length === 0) {
    const vodDefs = [
      { ch: 0, title: 'VOD demo: Speedrun completo (ejemplo)' },
      { ch: 1, title: 'VOD demo: Arquitectura de NEXURA (charla)' },
      { ch: 3, title: 'VOD demo: Proceso de ilustración completo' },
    ];
    for (const vd of vodDefs) {
      const entry = created[vd.ch];
      if (!entry) continue;
      videos.push({
        id: uuidv4(),
        channelId: entry.channel.id,
        streamId: null,
        title: vd.title,
        description: 'VOD de demostración. El video real requiere conectar almacenamiento/CDN propio.',
        status: 'READY',
        visibility: 'PUBLIC',
        duration: 1800 + Math.floor(Math.random() * 3000),
        thumbnailUrl: '',
        videoUrl: '',
        storageKey: `videos/demo/${uuidv4()}`,
        views: 500 + Math.floor(Math.random() * 9000),
        processingStartedAt: null,
        processingCompletedAt: now,
        publishedAt: ago(60 * 24 * 3),
        createdAt: ago(60 * 24 * 4),
        updatedAt: now,
      });
    }
    set(KEYS.videos, videos);
  }

  // ---- Reels demo ----
  // El feed de reels usa videos de muestra públicos ya presentes en el repo
  // (seed heredado de reel.ts). Acá se re-anclan a canales DEMO para que la
  // actividad demo sea coherente y el reset pueda eliminarlos sin tocar reels
  // creados localmente por el propietario del navegador.
  const reels = get<Reel>(KEYS.reels);
  if (reels.length > 0) {
    let changed = false;
    for (const r of reels) {
      if (!r.storageKey?.startsWith('reels/demo/')) continue;
      const anchor = created[r.title.length % created.length];
      if (anchor && r.channelId !== anchor.channel.id) {
        r.channelId = anchor.channel.id;
        changed = true;
      }
    }
    if (changed) set(KEYS.reels, reels);
  }
}
