import React, { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  Settings, Radio, AlertCircle, Loader2
} from 'lucide-react';
import { isDemoHlsUrl } from '../config/streaming';

interface VideoPlayerProps {
  src: string;
  channelName: string;
  isLive?: boolean;
}

export function VideoPlayer({ src, channelName, isLive = true }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  // Contador de requests para que solo el último intento activo pueda setear estado.
  const attemptRef = useRef(0);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNotConfigured, setIsNotConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const attempt = ++attemptRef.current;
    const isCurrent = () => attempt === attemptRef.current;

    // Cleanup previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // ETAPA 4: sin infraestructura HLS configurada no intentamos reproducir
    // contra localhost. Mostramos un estado claro y elegante, no un error técnico.
    if (isDemoHlsUrl(src)) {
      setIsNotConfigured(true);
      setError(null);
      setIsLoading(false);
      return () => { /* nothing attached */ };
    }
    if (isCurrent()) setIsNotConfigured(false);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
      });

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!isCurrent()) return;
        setIsLoading(false);
        video.play().catch(() => {
          // Autoplay might be blocked
          if (isCurrent()) setIsPlaying(false);
        });
      });

      hls.on(Hls.Events.ERROR, (event: any, data: any) => {
        console.error('[HLS] Error:', data);
        if (!isCurrent()) return;
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError('No se pudo conectar al servidor de streaming. Verificá que la infraestructura HLS esté en línea y que el canal esté transmitiendo.');
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError('Error de media al reproducir el stream. Intentá nuevamente en unos segundos.');
              hls.recoverMediaError();
              break;
            default:
              setError('Error al cargar el stream. Verifica que el canal esté en vivo.');
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        if (!isCurrent()) return;
        setIsLoading(false);
        video.play().catch(() => setIsPlaying(false));
      });
      video.addEventListener('error', () => {
        if (!isCurrent()) return;
        setError('No se pudo conectar al servidor de streaming. Verificá que la infraestructura HLS esté en línea y que el canal esté transmitiendo.');
        setIsLoading(false);
      });
    } else {
      setError('Tu navegador no soporta reproducción HLS.');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    setTimeout(() => setShowControls(false), 3000);
  };

  if (isNotConfigured) {
    return (
      <div className="aspect-video bg-bg-elevated rounded-xl flex items-center justify-center border border-border">
        <div className="text-center max-w-sm px-6">
          <Radio className="w-14 h-14 text-text-muted mx-auto mb-4" />
          <p className="text-white font-semibold mb-1">Streaming no configurado</p>
          <p className="text-text-secondary text-sm leading-relaxed">
            El servidor de streaming todavía no está configurado. Esta instalación está preparada
            para conectar una infraestructura RTMP/HLS externa (por ejemplo MediaMTX).
          </p>
          <span className="inline-block mt-3 text-[10px] font-bold uppercase tracking-wider bg-warning/15 text-warning px-2 py-0.5 rounded-full">
            Demo — Infraestructura no configurada
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="aspect-video bg-bg-elevated rounded-xl flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <AlertCircle className="w-14 h-14 text-danger mx-auto mb-4" />
          <p className="text-white font-semibold mb-1">No se pudo cargar el stream</p>
          <p className="text-text-secondary text-sm mb-3 leading-relaxed">{error}</p>
          <button
            onClick={() => {
              // Reintento sin recargar la página completa: dispara un nuevo attempt.
              setError(null);
              setIsLoading(true);
              attemptRef.current++;
              const video = videoRef.current;
              if (video && src && Hls.isSupported()) {
                if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
                const attempt = ++attemptRef.current;
                const hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 30 });
                hls.loadSource(src);
                hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, () => { if (attempt === attemptRef.current) setIsLoading(false); });
                hls.on(Hls.Events.ERROR, (_e: any, data: any) => {
                  if (attempt !== attemptRef.current) return;
                  if (data.fatal) { setError('Error al cargar el stream. Verifica que el canal esté en vivo.'); hls.destroy(); setIsLoading(false); }
                });
                hlsRef.current = hls;
              } else if (video) {
                video.load();
              }
            }}
            className="text-primary-light hover:text-primary text-sm"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black rounded-xl overflow-hidden group"
      onMouseMove={handleMouseMove}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        playsInline
        onClick={togglePlay}
      />

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="w-12 h-12 text-primary-light animate-spin" />
        </div>
      )}

      {/* LIVE Indicator */}
      {isLive && (
        <div className="absolute top-4 left-4 bg-danger text-white text-sm font-medium px-3 py-1 rounded flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          EN VIVO
        </div>
      )}

      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute bottom-0 left-0 right-0 p-4">
          {/* Progress bar (for VOD, hidden for live) */}
          {!isLive && (
            <div className="mb-4">
              <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-0" />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="text-white hover:text-primary-light transition-colors"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-primary-light transition-colors"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                />
              </div>

              {/* Channel Name */}
              <span className="text-white text-sm font-medium">{channelName}</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Settings (for quality selection in future) */}
              <button className="text-white hover:text-primary-light transition-colors">
                <Settings className="w-5 h-5" />
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-primary-light transition-colors"
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
