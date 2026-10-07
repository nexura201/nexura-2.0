import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as db from '../services/database';
import * as streaming from '../services/streaming';
import * as categoryService from '../services/category';
import * as videoService from '../services/video';
import * as clipService from '../services/clip';
import type { Category, CategoryContentCounts } from '../services/category';
import {
  Compass, Grid3X3, Heart, Library, Play, Radio,
  Users, TrendingUp, Search, Gamepad2, MessageCircle, Music,
  Trophy, Cpu, Globe, Drama, Palette, UtensilsCrossed,
  Sparkles, X, ArrowRight, Video, Send, Loader2, AlertTriangle, RotateCcw, Bot
} from 'lucide-react';
import { sendMessage as nexuraIASendMessage, NexuraIAError } from '../services/nexuraIA.service';

/**
 * Mapeo de slug de categoría -> icono Lucide + acento visual.
 * El fallback usa el emoji guardado en la categoría (compatible con
 * el servicio existente de categorías).
 */
const CATEGORY_ICON_MAP: Record<string, { icon: React.ComponentType<{ className?: string }>; accent: string }> = {
  gaming: { icon: Gamepad2, accent: 'from-primary/25 via-primary/10 to-transparent' },
  'just-chatting': { icon: MessageCircle, accent: 'from-accent/25 via-primary/10 to-transparent' },
  musica: { icon: Music, accent: 'from-primary-hover/25 via-accent/10 to-transparent' },
  deportes: { icon: Trophy, accent: 'from-success/20 via-primary/10 to-transparent' },
  tecnologia: { icon: Cpu, accent: 'from-accent/25 via-surface-2/40 to-transparent' },
  irl: { icon: Globe, accent: 'from-primary/20 via-surface-2/40 to-transparent' },
  entretenimiento: { icon: Drama, accent: 'from-warning/20 via-primary/10 to-transparent' },
  arte: { icon: Palette, accent: 'from-error/20 via-warning/10 to-transparent' },
  'arte-y-creatividad': { icon: Palette, accent: 'from-error/20 via-warning/10 to-transparent' },
  cocina: { icon: UtensilsCrossed, accent: 'from-warning/25 via-error/10 to-transparent' },
  educacion: { icon: Library, accent: 'from-primary/25 via-accent/10 to-transparent' },
  noticias: { icon: Compass, accent: 'from-surface-2/60 via-primary/10 to-transparent' },
};

export function ExplorePage() {
  const channels = db.getAllChannels();
  const users = db.getAllUsers().filter(u => u.status === 'ACTIVE' && u.role === 'USER');
  const activeStreams = streaming.getAllActiveStreams();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Explorar</h1>
        <p className="text-text-secondary">Descubre canales y creadores en NEXURA</p>
      </div>

      {/* Search */}
      <div className="flex items-center bg-bg-input border border-border rounded-lg px-4 py-3 mb-8 max-w-md">
        <Search className="w-5 h-5 text-text-muted mr-3" />
        <input
          type="text"
          placeholder="Buscar canales, categorías..."
          className="bg-transparent text-white placeholder-text-muted outline-none w-full"
        />
      </div>

      {/* Live Channels */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Radio className="w-5 h-5 text-danger" />
          Canales en vivo ({activeStreams.length})
        </h2>
        {activeStreams.length === 0 ? (
          <div className="bg-bg-card border border-border rounded-xl p-8 text-center">
            <Radio className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary">No hay canales en vivo en este momento.</p>
            <p className="text-text-muted text-sm mt-1">Los streams en vivo aparecerán aquí.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeStreams.map(stream => {
              const channel = db.getAllChannels().find(c => c.id === stream.channelId);
              const user = channel ? db.getUserById(channel.userId) : null;
              const viewerCount = streaming.getViewerCount(stream.channelId);
              
              if (!channel || !user) return null;
              
              return (
                <Link
                  key={stream.id}
                  to={`/channel/${channel.slug}`}
                  className="bg-bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all group"
                >
                  <div className="aspect-video bg-gradient-to-br from-danger/20 to-primary/10 flex items-center justify-center relative">
                    <div className="absolute top-2 left-2 bg-danger/90 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      LIVE
                    </div>
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {viewerCount.current}
                    </div>
                    <Play className="w-10 h-10 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-white truncate">
                      {stream.title || `${user.displayName} está en vivo`}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white">
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-xs text-text-muted truncate">{user.displayName}</p>
                    </div>
                    {stream.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {stream.tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="text-[10px] bg-bg-elevated text-text-muted px-1.5 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recommended Channels */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-light" />
          Canales recomendados
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map(u => (
            <Link
              key={u.id}
              to={`/u/${u.username}`}
              className="bg-bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-lg font-bold text-white">
                  {u.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{u.displayName}</p>
                  <p className="text-xs text-text-muted">@{u.username}</p>
                </div>
              </div>
              {u.bio && <p className="text-xs text-text-secondary mt-3 line-clamp-2">{u.bio}</p>}
              <div className="flex items-center gap-3 mt-3 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {db.getFollowerCount(u.id)} seguidores
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FollowingPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <Heart className="w-16 h-16 text-text-muted mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Inicia sesión</h1>
        <p className="text-text-secondary mb-4">Inicia sesión para ver los canales que sigues.</p>
        <Link to="/login" className="text-primary-light hover:text-primary">Iniciar sesión</Link>
      </div>
    );
  }

  const following = db.getFollowing(user.id);
  const followedUsers = following.map(f => db.getUserById(f.followingId)).filter(Boolean);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Siguiendo</h1>
        <p className="text-text-secondary">Canales que sigues ({followedUsers.length})</p>
      </div>

      {followedUsers.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
          <Heart className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary text-lg">Aún no sigues a nadie</p>
          <p className="text-text-muted text-sm mt-1">Explora canales y comienza a seguir a tus creadores favoritos.</p>
          <Link to="/explore" className="inline-block mt-4 text-primary-light hover:text-primary text-sm">
            Explorar canales →
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {followedUsers.map(u => u && (
            <Link
              key={u.id}
              to={`/u/${u.username}`}
              className="bg-bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-lg font-bold text-white">
                  {u.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{u.displayName}</p>
                  <p className="text-xs text-text-muted">@{u.username}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

interface CategoryCardProps {
  category: Category;
  counts?: CategoryContentCounts;
}

function CategoryCard({ category, counts }: CategoryCardProps) {
  const mapped = CATEGORY_ICON_MAP[category.slug];
  const Icon = mapped?.icon;

  const liveCount = counts?.liveStreams ?? 0;
  const channelCount = counts?.channels ?? 0;
  const contentCount = counts?.total ?? 0;

  return (
    <Link
      to={`/category/${category.slug}`}
      aria-label={`Ver categoría ${category.name}`}
      className="group relative block overflow-hidden rounded-2xl border border-border bg-bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_16px_48px_-16px_rgba(22,119,255,0.4)]"
    >
      {/* Acento visual superior */}
      <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br opacity-60 transition-opacity duration-300 group-hover:opacity-100 ${mapped?.accent ?? 'from-primary/20 via-surface-2/40 to-transparent'}`} />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative p-5 sm:p-6">
        {/* Icono + estado en vivo */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-2 text-primary transition-all duration-300 group-hover:scale-105 group-hover:border-primary/40 group-hover:text-primary-hover">
            {Icon ? (
              <Icon className="h-6 w-6" />
            ) : (
              <span className="text-2xl leading-none" aria-hidden>{category.icon}</span>
            )}
          </div>
          {liveCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger/10 px-2.5 py-1 text-[11px] font-semibold text-error">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
              </span>
              {liveCount} EN VIVO
            </span>
          )}
        </div>

        {/* Nombre y descripcion */}
        <h3 className="text-base font-semibold text-white mb-1 transition-colors duration-200 group-hover:text-primary-hover">
          {category.name}
        </h3>
        <p className="text-sm text-secondary line-clamp-2 min-h-[2.5rem]">
          {category.description}
        </p>

        {/* Estadisticas */}
        <div className="mt-4 flex items-center gap-4 text-xs text-secondary">
          <span className="flex items-center gap-1.5">
            <Video className="h-3.5 w-3.5 text-text-muted" />
            {contentCount.toLocaleString('es')} videos y clips
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-text-muted" />
            {channelCount.toLocaleString('es')} canales
          </span>
        </div>

        {/* CTA al hacer hover */}
        <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary opacity-0 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0">
          Explorar categoría
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </Link>
  );
}

/**
 * Chat de NEXURA IA (Etapa 2)
 * ---------------------------
 * Conectado al endpoint serverless seguro POST /api/ai/chat
 * (Usuario → NEXURA IA → Backend → Gemini → respuesta).
 * La API Key nunca toca el navegador: vive solo en el servidor.
 * Sin memoria/historial persistente: el chat vive mientras el modal está abierto.
 */
interface NexuraIAChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

function NexuraIAChatModal({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<NexuraIAChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastUserMessageRef = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    inputRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    // Autoscroll al último mensaje
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending, error]);

  const handleSend = async (rawText?: string) => {
    const text = (rawText ?? input).trim();
    if (!text || sending) return;

    setError(null);
    lastUserMessageRef.current = text;
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', text }]);
    setInput('');
    setSending(true);

    try {
      const result = await nexuraIASendMessage(text);
      setMessages(prev => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', text: result.reply },
      ]);
    } catch (err: unknown) {
      const message =
        err instanceof NexuraIAError
          ? err.message
          : 'Ocurrió un error inesperado con NEXURA IA. Intentá nuevamente.';
      setError(message);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleRetry = () => {
    const last = lastUserMessageRef.current;
    if (last) void handleSend(last);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nexura-ia-chat-title"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex w-full sm:max-w-2xl h-[85vh] sm:h-[70vh] max-h-[720px] flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl border border-primary/30 bg-surface-2 shadow-[0_24px_80px_-24px_rgba(22,119,255,0.5)]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border bg-bg-card px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/15 text-primary-hover">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h4 id="nexura-ia-chat-title" className="text-sm font-bold text-white truncate">
                NEXURA IA
              </h4>
              <p className="text-xs text-text-muted truncate">
                Asistente oficial — conectado de forma segura por el backend
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar NEXURA IA"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text-muted transition-colors hover:text-white hover:border-primary/40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mensajes */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 space-y-3">
          {messages.length === 0 && !sending && (
            <div className="flex h-full flex-col items-center justify-center text-center px-4">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/40 bg-primary/15 text-primary-hover">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-white mb-1">Hola, soy NEXURA IA</p>
              <p className="text-xs text-text-secondary max-w-sm">
                Escribí un mensaje y te respondo a través del backend seguro de NEXURA.
              </p>
            </div>
          )}

          {messages.map(m => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={
                  m.role === 'user'
                    ? 'max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-white whitespace-pre-wrap break-words'
                    : 'max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-bl-md border border-border bg-bg-card px-4 py-2.5 text-sm text-white whitespace-pre-wrap break-words'
                }
              >
                {m.text}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-border bg-bg-card px-4 py-2.5 text-sm text-text-secondary">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                NEXURA IA está pensando…
              </div>
            </div>
          )}

          {error && !sending && (
            <div className="flex justify-start">
              <div className="flex max-w-[90%] items-start gap-2 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm text-warning">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={handleRetry}
                    disabled={!lastUserMessageRef.current}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-warning/40 bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning transition-colors hover:bg-warning/20 disabled:opacity-40"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reenviar mensaje
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border bg-bg-card px-4 py-3 sm:px-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="flex items-end gap-2"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              maxLength={4000}
              placeholder="Escribí un mensaje para NEXURA IA…"
              aria-label="Mensaje para NEXURA IA"
              className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm text-white placeholder-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Enviar mensaje"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
          <p className="mt-2 text-[11px] text-text-muted">
            Enter para enviar · Shift+Enter para salto de línea · Respuestas generadas por IA a través del backend seguro de NEXURA
          </p>
        </div>
      </div>
    </div>
  );
}

function NexuraIACard() {
  const [showChat, setShowChat] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowChat(true)}
        aria-label="NEXURA IA — Abrir asistente"
        className="group relative block w-full overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-surface-2 via-bg-card to-surface-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-300 hover:-translate-y-1 hover:border-primary/70 hover:shadow-[0_16px_48px_-16px_rgba(22,119,255,0.55)]"
      >
        {/* Resplandor sutil */}
        <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl transition-opacity duration-500 group-hover:opacity-100 opacity-70" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

        <div className="relative p-5 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/40 bg-primary/15 text-primary-hover transition-transform duration-300 group-hover:scale-105">
              <Sparkles className="h-6 w-6" />
            </div>
            <span className="rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-success">
              Beta
            </span>
          </div>

          <h3 className="text-base font-bold text-white mb-1">
            NEXURA IA
          </h3>
          <p className="text-sm text-secondary line-clamp-2 min-h-[2.5rem]">
            El asistente oficial de NEXURA. Preguntá lo que necesites sobre la plataforma, streaming y creación de contenido.
          </p>

          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary">
            Abrir asistente
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        </div>
      </button>

      {showChat && <NexuraIAChatModal onClose={() => setShowChat(false)} />}
    </>
  );
}

export function CategoriesPage() {
  // Asegurar categorias base sin duplicar las existentes (servicio actual)
  useEffect(() => {
    categoryService.ensureDefaultCategories();
  }, []);

  const categories = useMemo(() => categoryService.getAllCategories(), []);
  const countsByCategory = useMemo(
    () =>
      categoryService.getContentCountsByCategory({
        categories,
        channels: db.getAllChannels(),
        streams: streaming.getAllActiveStreams(),
        videos: videoService.getAllVideos(),
        clips: clipService.getAllClips(),
      }),
    [categories]
  );

  const totalLive = Object.values(countsByCategory).reduce((acc, c) => acc + c.liveStreams, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Grid3X3 className="w-6 h-6 text-primary" />
          Categorías
        </h1>
        <p className="text-text-secondary">
          Explora el contenido de NEXURA por categoría
          {totalLive > 0 && (
            <span className="ml-2 inline-flex items-center gap-1.5 text-error text-sm font-medium">
              <Radio className="w-3.5 h-3.5" />
              {totalLive} en vivo ahora
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {/* Tarjeta destacada NEXURA IA — Proximamente */}
        <NexuraIACard />

        {categories.map(cat => (
          <CategoryCard key={cat.id} category={cat} counts={countsByCategory[cat.id]} />
        ))}
      </div>

      {categories.length === 0 && (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center mt-2">
          <TrendingUp className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary">No hay categorías disponibles en este momento.</p>
        </div>
      )}
    </div>
  );
}

export function LibraryPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <Library className="w-16 h-16 text-text-muted mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Inicia sesión</h1>
        <p className="text-text-secondary mb-4">Inicia sesión para acceder a tu biblioteca.</p>
        <Link to="/login" className="text-primary-light hover:text-primary">Iniciar sesión</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Biblioteca</h1>
        <p className="text-text-secondary">Tu historial y contenido guardado</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-bg-card border border-border rounded-xl p-8 text-center">
          <Play className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary">Historial de visualización</p>
          <p className="text-text-muted text-sm mt-1">Aún no has visto ningún stream.</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-8 text-center">
          <Grid3X3 className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary">Videos guardados</p>
          <p className="text-text-muted text-sm mt-1">Los videos que guardes aparecerán aquí.</p>
        </div>
      </div>
    </div>
  );
}
