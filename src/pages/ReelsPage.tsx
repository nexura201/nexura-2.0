import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import * as reelService from '../services/reel';
import * as db from '../services/database';
import type { Reel, Channel, User } from '../types';
import {
  Play, Pause, Volume2, VolumeX, Heart, Share2, Eye,
  ChevronUp, ChevronDown, Loader2, Film
} from 'lucide-react';

/**
 * ReelsPage - Feed vertical de videos cortos (9:16)
 *
 * - Scroll-snap vertical con autoplay por IntersectionObserver
 * - Play/pause táctil y con teclado (flechas ↑↓, espacio, M)
 * - Silenciar/activar sonido global
 * - Contador de visualizaciones, me gusta y compartir
 * - Responsive: escritorio (columna centrada 9:16) y móvil (pantalla completa)
 */

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

interface ReelCardProps {
  reel: Reel;
  channel: Channel | null;
  creator: User | null;
  isMuted: boolean;
  onToggleMute: () => void;
  likedByMe: boolean;
  onToggleLike: (reelId: string) => void;
  onShare: (reel: Reel) => void;
  onVisible: (reelId: string) => void;
  registerVideo: (reelId: string, el: HTMLVideoElement | null) => void;
  active: boolean;
}

function ReelCard({
  reel, channel, creator, isMuted, onToggleMute, likedByMe,
  onToggleLike, onShare, onVisible, registerVideo, active,
}: ReelCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    registerVideo(reel.id, el);
  }, [registerVideo, reel.id]);

  // Autoplay / pausa según estado activo
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) {
      onVisible(reel.id);
      video.muted = isMuted;
      const playPromise = video.play();
      if (playPromise) {
        playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [active, isMuted, onVisible, reel.id]);

  // Loop infinito como en los reels reales
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnded = () => { video.currentTime = 0; video.play().catch(() => undefined); };
    video.addEventListener('ended', onEnded);
    return () => video.removeEventListener('ended', onEnded);
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => undefined);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const displayName = channel?.title || creator?.displayName || creator?.username || 'Creador NEXURA';
  const profilePath = creator ? `/u/${creator.username}` : undefined;

  return (
    <section
      className="relative w-full h-full snap-start snap-always flex items-center justify-center bg-black overflow-hidden"
      data-reel-id={reel.id}
      aria-label={`Reel: ${reel.title}`}
    >
      {/* Video 9:16 */}
      <video
        ref={setVideoRef}
        src={reel.videoUrl}
        poster={reel.thumbnailUrl || undefined}
        className="h-full w-auto max-w-full object-contain aspect-[9/16]"
        style={{ aspectRatio: '9 / 16' }}
        muted={isMuted}
        loop
        playsInline
        preload="metadata"
        onClick={togglePlay}
        onLoadedData={() => { setIsLoading(false); setHasStarted(true); }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (v.duration > 0) setProgress((v.currentTime / v.duration) * 100);
        }}
      />

      {/* Overlay superior: degradado + info del creador */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent" />
      <div className="absolute top-4 left-4 right-20 flex items-center gap-3 z-10">
        {creator && (
          profilePath ? (
            <Link to={profilePath} className="pointer-events-auto shrink-0">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm ring-2 ring-white/30">
                {(creator.displayName || creator.username).charAt(0).toUpperCase()}
              </div>
            </Link>
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm ring-2 ring-white/30 shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )
        )}
        <div className="min-w-0">
          {profilePath ? (
            <Link to={profilePath} className="pointer-events-auto block truncate text-sm font-semibold text-white hover:underline">
              @{creator?.username || displayName}
            </Link>
          ) : (
            <span className="block truncate text-sm font-semibold text-white">@{creator?.username || displayName}</span>
          )}
          <span className="block text-xs text-white/70">{formatCount(reel.views)} visualizaciones</span>
        </div>
      </div>

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      )}

      {/* Botón central play/pause al tocar */}
      {!isPlaying && hasStarted && (
        <button
          onClick={togglePlay}
          aria-label="Reproducir"
          className="absolute inset-0 z-10 flex items-center justify-center"
        >
          <span className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </span>
        </button>
      )}

      {/* Barra de progreso */}
      <div className="absolute bottom-0 inset-x-0 h-1 bg-white/10 z-20">
        <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${progress}%` }} />
      </div>

      {/* Columna de acciones (derecha) */}
      <div className="absolute right-3 bottom-24 sm:bottom-28 flex flex-col items-center gap-4 z-20">
        <button
          onClick={onToggleMute}
          aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
          className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        <button
          onClick={() => onToggleLike(reel.id)}
          aria-label={likedByMe ? 'Quitar me gusta' : 'Me gusta'}
          className="flex flex-col items-center gap-1 group"
        >
          <span className={`w-11 h-11 rounded-full backdrop-blur-sm border flex items-center justify-center transition-all ${
            likedByMe
              ? 'bg-error/20 border-error/50 text-error scale-110'
              : 'bg-black/40 border-white/10 text-white group-hover:bg-black/60'
          }`}>
            <Heart className={`w-5 h-5 ${likedByMe ? 'fill-error text-error' : ''}`} />
          </span>
          <span className="text-xs font-medium text-white drop-shadow">{formatCount(reel.likes)}</span>
        </button>

        <button
          onClick={() => onShare(reel)}
          aria-label="Compartir"
          className="flex flex-col items-center gap-1 group"
        >
          <span className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-colors">
            <Share2 className="w-5 h-5" />
          </span>
          <span className="text-xs font-medium text-white drop-shadow">Compartir</span>
        </button>

        <div className="flex flex-col items-center gap-1">
          <span className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white">
            <Eye className="w-5 h-5" />
          </span>
          <span className="text-xs font-medium text-white drop-shadow">{formatCount(reel.views)}</span>
        </div>
      </div>

      {/* Pie: título y descripción */}
      <div className="absolute bottom-4 left-4 right-20 z-10">
        <h2 className="text-sm sm:text-base font-semibold text-white line-clamp-1 drop-shadow">{reel.title}</h2>
        <p
          className={`text-xs sm:text-sm text-white/80 mt-1 cursor-pointer ${showInfo ? '' : 'line-clamp-1'}`}
          onClick={() => setShowInfo(s => !s)}
        >
          {reel.description}
        </p>
      </div>
    </section>
  );
}

export function ReelsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [reels, setReels] = useState<Reel[]>([]);
  const [channelMap, setChannelMap] = useState<Record<string, { channel: Channel | null; creator: User | null }>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videosRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Cargar feed y datos de canales/creadores
  useEffect(() => {
    const feed = reelService.getReelsFeed();
    setReels(feed);

    const map: Record<string, { channel: Channel | null; creator: User | null }> = {};
    for (const r of feed) {
      if (map[r.channelId]) continue;
      const channel = db.getAllChannels().find(c => c.id === r.channelId) || null;
      const creator = channel ? db.getUserById(channel.userId) : null;
      map[r.channelId] = { channel, creator };
    }
    setChannelMap(map);

    // Estado de likes del usuario actual
    if (user) {
      const liked = new Set<string>();
      for (const r of feed) {
        if (r.likedBy.includes(user.id)) liked.add(r.id);
      }
      setLikedIds(liked);
    } else {
      setLikedIds(new Set());
    }
  }, [user]);

  const registerVideo = useCallback((reelId: string, el: HTMLVideoElement | null) => {
    if (el) videosRef.current.set(reelId, el);
    else videosRef.current.delete(reelId);
  }, []);

  // IntersectionObserver para detectar el reel visible
  useEffect(() => {
    const container = containerRef.current;
    if (!container || reels.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const id = (entry.target as HTMLElement).dataset.reelId;
            const idx = reels.findIndex(r => r.id === id);
            if (idx !== -1) setActiveIndex(idx);
          }
        }
      },
      { root: container, threshold: [0.6] }
    );

    const sections = container.querySelectorAll('[data-reel-id]');
    sections.forEach(s => observer.observe(s));
    return () => observer.disconnect();
  }, [reels]);

  const handleVisible = useCallback((reelId: string) => {
    reelService.incrementReelViews(reelId);
  }, []);

  const scrollToReel = (index: number) => {
    const container = containerRef.current;
    if (!container) return;
    const clamped = Math.max(0, Math.min(index, reels.length - 1));
    container.scrollTo({ top: clamped * container.clientHeight, behavior: 'smooth' });
    setActiveIndex(clamped);
  };

  // Navegación con teclado: flechas ↑↓, espacio (play/pause), M (mute)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); scrollToReel(activeIndex + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); scrollToReel(activeIndex - 1); }
      else if (e.key === 'm' || e.key === 'M') { setIsMuted(m => !m); }
      else if (e.key === ' ') {
        e.preventDefault();
        const video = videosRef.current.get(reels[activeIndex]?.id);
        if (video) { video.paused ? video.play().catch(() => undefined) : video.pause(); }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, reels]);

  const handleToggleLike = (reelId: string) => {
    if (!user) {
      addToast('info', 'Inicia sesión para darle me gusta a los Reels');
      return;
    }
    try {
      const { liked } = reelService.toggleReelLike(reelId, user.id);
      setLikedIds(prev => {
        const next = new Set(prev);
        liked ? next.add(reelId) : next.delete(reelId);
        return next;
      });
      // Refrescar contadores
      setReels(reelService.getReelsFeed());
    } catch {
      addToast('error', 'No se pudo actualizar el me gusta');
    }
  };

  const handleShare = async (reel: Reel) => {
    const url = `${window.location.origin}/reels?r=${reel.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: reel.title, text: reel.description, url });
        return;
      } catch { /* cancelado: continuar con fallback */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      addToast('success', 'Enlace del Reel copiado al portapapeles');
    } catch {
      addToast('error', 'No se pudo copiar el enlace');
    }
  };

  if (reels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Film className="w-16 h-16 text-primary mb-4" />
        <h1 className="text-2xl font-bold text-primary-light mb-2">Reels</h1>
        <p className="text-text-secondary max-w-md">
          Todavía no hay Reels disponibles. Crea una cuenta y un canal para ver los Reels demo.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100dvh-0px)] sm:h-[calc(100dvh-0px)] bg-black overflow-hidden">
      {/* Feed vertical con scroll-snap */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        {reels.map((reel, index) => {
          const info = channelMap[reel.channelId];
          return (
            <div key={reel.id} className="h-full w-full flex items-center justify-center">
              {/* Marco 9:16 centrado en escritorio, full-bleed en móvil */}
              <div className="relative w-full h-full sm:w-auto sm:aspect-[9/16] sm:h-full sm:max-w-[min(100%,calc(100dvh*9/16))] sm:rounded-xl sm:overflow-hidden sm:border sm:border-border">
                <ReelCard
                  reel={reel}
                  channel={info?.channel ?? null}
                  creator={info?.creator ?? null}
                  isMuted={isMuted}
                  onToggleMute={() => setIsMuted(m => !m)}
                  likedByMe={likedIds.has(reel.id)}
                  onToggleLike={handleToggleLike}
                  onShare={handleShare}
                  onVisible={handleVisible}
                  registerVideo={registerVideo}
                  active={index === activeIndex}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Flechas de navegación (solo escritorio) */}
      <div className="hidden sm:flex flex-col gap-2 absolute right-6 top-1/2 -translate-y-1/2 z-30">
        <button
          onClick={() => scrollToReel(activeIndex - 1)}
          disabled={activeIndex === 0}
          aria-label="Reel anterior"
          className="w-10 h-10 rounded-full bg-surface/70 backdrop-blur border border-border flex items-center justify-center text-text-primary hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
        <span className="text-center text-xs text-text-secondary tabular-nums">
          {activeIndex + 1}/{reels.length}
        </span>
        <button
          onClick={() => scrollToReel(activeIndex + 1)}
          disabled={activeIndex === reels.length - 1}
          aria-label="Reel siguiente"
          className="w-10 h-10 rounded-full bg-surface/70 backdrop-blur border border-border flex items-center justify-center text-text-primary hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      {/* Indicador de mute global accesible también desde fuera del video */}
      <div className="sm:hidden absolute left-4 bottom-4 z-30 flex items-center gap-2">
        <button
          onClick={() => setIsMuted(m => !m)}
          aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur border border-white/10 flex items-center justify-center text-white"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        <button
          onClick={() => {
            const video = videosRef.current.get(reels[activeIndex]?.id);
            if (video) { video.paused ? video.play().catch(() => undefined) : video.pause(); }
          }}
          aria-label="Reproducir o pausar"
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur border border-white/10 flex items-center justify-center text-white"
        >
          <PlayPauseIcon playing={!videosRef.current.get(reels[activeIndex]?.id)?.paused} />
        </button>
      </div>
    </div>
  );
}

function PlayPauseIcon({ playing }: { playing: boolean }) {
  return playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />;
}
