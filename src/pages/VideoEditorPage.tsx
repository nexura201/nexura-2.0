import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  Scissors, Film, Video as VideoIcon, Play, Pause, Loader2, AlertTriangle,
  Volume2, VolumeX, Maximize, ArrowLeft, Save, Eye, UploadCloud, FileVideo,
  Type, RotateCcw, CheckCircle2, Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import * as db from '../services/database';
import * as contentService from '../services/content';
import type { UnifiedContentItem, ContentKind } from '../services/content';
import { useLocalMediaUrl } from '../hooks/useLocalMediaUrl';
import { hasMedia } from '../services/mediaLocal';
import { getEditByContent, saveEdit, formatEditTime, parseEditTime } from '../services/videoEdit';
import type { EditTextPosition } from '../services/videoEdit';
import { ContentStateChip } from '../components/ContentStateChip';
import { DemoBadge } from '../components/DemoBadge';

/**
 * ETAPA 7D — EDITOR BÁSICO DE VIDEO (/dashboard/editor y /dashboard/editor/:id)
 *
 * Editor sencillo y HONESTO para Reel / VOD / Clip, integrado en Creator Studio.
 * Reutiliza íntegramente la arquitectura de multimedia local de 7A/7B:
 *  - Selección de contenido → contentService.getCreatorContent (capa unificada).
 *  - Reproducción → useLocalMediaUrl (Blob desde IndexedDB vía mediaLocal).
 *    Los contenidos DEMO nunca tienen blob: se listan separados y NO editables
 *    (nunca se generan archivos demo automáticamente).
 *  - Guardado → services/videoEdit.ts: la edición queda como CONFIGURACIÓN
 *    local (recorte + texto + formato). No hay re-render ni backend.
 *
 * Exportación: NO se simula. Un recorte real requiere re-codificación
 * (ffmpeg/servidor o pipelines MediaSource frágiles entre codecs), así que la
 * página declara honestamente que la exportación llegará en una etapa posterior.
 */

// ============ HELPERS ============

const KIND_ICON: Record<ContentKind, React.ReactNode> = {
  reel: <Film className="w-4 h-4" />,
  video: <VideoIcon className="w-4 h-4" />,
  clip: <Scissors className="w-4 h-4" />,
};

type PlayerError = 'no-file' | 'invalid' | 'deleted' | 'load-failed' | null;

/** Traduce eventos <video> a estados visibles claros (nunca spinner eterno). */
function mapVideoError(err: MediaError | null): PlayerError {
  if (!err) return null;
  switch (err.code) {
    case MediaError.MEDIA_ERR_ABORTED: return null; // cancelación del usuario: no es error
    case MediaError.MEDIA_ERR_NETWORK: return 'load-failed';
    case MediaError.MEDIA_ERR_DECODE: return 'invalid';
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: return 'deleted';
    default: return 'load-failed';
  }
}

const ERROR_MESSAGES: Record<Exclude<PlayerError, null>, string> = {
  'no-file': 'Este contenido todavía no tiene archivo multimedia disponible.',
  invalid: 'El navegador no pudo decodificar este archivo (codec no soportado o archivo dañado).',
  deleted: 'El archivo local ya no existe en IndexedDB (pudo haber sido eliminado). Volvé a subirlo si hace falta.',
  'load-failed': 'No se pudo cargar el video desde el almacenamiento local. Verificá que IndexedDB esté disponible (el modo privado puede bloquearlo).',
};

// ============ SELECTOR DE CONTENIDO ============

function ContentPickCard({ item, selected, onSelect }: {
  item: UnifiedContentItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`text-left rounded-lg border p-3 flex items-center gap-3 transition-colors ${
        selected
          ? 'border-primary bg-primary/10'
          : 'border-border bg-bg-elevated hover:border-primary/50'
      }`}
    >
      <div className="w-9 h-9 rounded-md bg-bg-card border border-border flex items-center justify-center text-text-secondary shrink-0">
        {KIND_ICON[item.kind]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white truncate">{item.title}</p>
          {item.isDemo && <DemoBadge />}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted">
          <span>{contentService.getKindLabel(item.kind)}</span>
          <ContentStateChip state={item.state} />
          <span>{formatEditTime(item.duration)}</span>
        </div>
      </div>
    </button>
  );
}

// ============ COMPONENTE PRINCIPAL ============

export function VideoEditorPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id?: string }>();

  const channel = useMemo(() => (user ? db.getChannelByUserId(user.id) : null), [user]);

  // ---- Selección de contenido (capa unificada; nada crudo de localStorage) ----
  const allItems = useMemo(
    () => (user ? contentService.getCreatorContent(user.id) : []),
    [user]
  );
  const editableItems = useMemo(
    () => allItems.filter(i => !i.isDemo && !!i.storageKey && i.state !== 'eliminado'),
    [allItems]
  );
  const demoItemsCount = useMemo(() => allItems.filter(i => i.isDemo).length, [allItems]);

  const [selectedId, setSelectedId] = useState<string | null>(routeId ?? null);
  // La ruta /dashboard/editor/:id también acepta kind implícito buscando en los 3 tipos
  const selectedItem: UnifiedContentItem | undefined = useMemo(
    () => editableItems.find(i => i.id === selectedId),
    [editableItems, selectedId]
  );

  // ---- Media local (IndexedDB vía hook existente de 7A/7B) ----
  const { url: mediaUrl, loading: mediaLoading } = useLocalMediaUrl(
    selectedItem?.mediaUrl || '',
    selectedItem?.storageKey ?? null
  );
  // Verificación adicional honesta: clave presente pero blob borrado → "archivo eliminado"
  const [blobMissing, setBlobMissing] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setBlobMissing(false);
    if (selectedItem?.storageKey && !mediaLoading && !mediaUrl) {
      hasMedia(selectedItem.storageKey)
        .then(ok => { if (!cancelled && !ok) setBlobMissing(true); })
        .catch(() => { if (!cancelled) setBlobMissing(true); });
    }
    return () => { cancelled = true; };
  }, [selectedItem?.storageKey, mediaLoading, mediaUrl]);

  // ---- Reproductor ----
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playerError, setPlayerError] = useState<PlayerError>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Reset total al cambiar de contenido (nunca estado residual / spinner eterno)
  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(selectedItem?.duration && selectedItem.duration > 0 ? selectedItem.duration : 0);
    setPlayerError(null);
  }, [selectedId, selectedItem?.duration]);

  // ---- Recorte (trim) ----
  const [startStr, setStartStr] = useState('00:00');
  const [endStr, setEndStr] = useState('00:30');
  const trimStart = parseEditTime(startStr) ?? 0;
  const trimEnd = parseEditTime(endStr) ?? 0;
  const [previewing, setPreviewing] = useState(false);
  const previewStopRef = useRef<number | null>(null);

  // Sincronizar fin por defecto cuando se conoce la duración real
  useEffect(() => {
    if (duration > 0) {
      setEndStr(prev => (prev === '00:30' && duration > 30 ? formatEditTime(duration) : prev));
    }
  }, [duration]);

  // ---- Guardado ----
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ---- Texto sobre el video (§7): se guarda como CONFIGURACIÓN, no incrustado ----
  const [editText, setEditText] = useState('');
  const [editTextPos, setEditTextPos] = useState<EditTextPosition>('bottom');

  // ---- Formato (§6): 9:16 solo previsualización CSS; sin conversión destructiva ----
  const [format, setFormat] = useState<'16:9' | '9:16'>('16:9');

  // Sincronizador Reel → 9:16 al cambiar de contenido seleccionado.
  useEffect(() => {
    if (!selectedItem) return;
    setFormat(selectedItem.kind === 'reel' ? '9:16' : '16:9');
  }, [selectedId, selectedItem?.kind]);

  // Cargar edición guardada previa (si existe) al seleccionar contenido.
  // Se declara acá para que el estado `savedAt` ya exista cuando corre el efecto.
  useEffect(() => {
    if (!selectedItem) return;
    const saved = getEditByContent(selectedItem.id);
    if (saved) {
      setStartStr(formatEditTime(saved.startTime));
      setEndStr(formatEditTime(saved.endTime));
      setEditText(saved.text ?? '');
      setEditTextPos(saved.textPosition ?? 'bottom');
      setSavedAt(saved.updatedAt);
      if (saved.contentKind === 'reel') setFormat('9:16');
    } else {
      setSavedAt(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const stopPreview = useCallback(() => {
    if (previewStopRef.current) {
      window.clearInterval(previewStopRef.current);
      previewStopRef.current = null;
    }
    setPreviewing(false);
  }, []);

  useEffect(() => () => stopPreview(), [stopPreview]); // desmontaje: nunca timer colgado

  // Reglas de recorte: inicio >= 0, fin <= duración, inicio < fin
  const trimValid =
    duration > 0 &&
    trimStart >= 0 &&
    trimEnd <= duration + 0.05 &&
    trimStart < trimEnd;

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v || !mediaUrl) return;
    if (v.paused) {
      v.play().then(() => setPlaying(true)).catch(() => {
        setPlayerError('load-failed');
        setPlaying(false);
      });
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const handleSeek = (t: number) => {
    const v = videoRef.current;
    if (!v || !(duration > 0)) return;
    const clamped = Math.min(Math.max(t, 0), duration);
    v.currentTime = clamped;
    setCurrentTime(clamped);
  };

  /** §5 Vista previa del recorte: arranca en inicio, se corta en el fin. */
  const handleTrimPreview = () => {
    const v = videoRef.current;
    if (!v || !mediaUrl || !trimValid) return;
    stopPreview();
    setPlayerError(null);
    v.currentTime = trimStart;
    v.play()
      .then(() => {
        setPlaying(true);
        setPreviewing(true);
        previewStopRef.current = window.setInterval(() => {
          const vid = videoRef.current;
          if (!vid) return stopPreview();
          if (vid.currentTime >= trimEnd || vid.ended) {
            vid.pause();
            setPlaying(false);
            setPreviewing(false);
            if (previewStopRef.current) window.clearInterval(previewStopRef.current);
            previewStopRef.current = null;
          }
        }, 100);
      })
      .catch(() => setPlayerError('load-failed'));
  };

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    const d = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
    if (d > 0) {
      setDuration(d);
      // Si el fin guardado/excedido supera el medio real, ajustarlo (regla fin <= duración)
      setEndStr(prev => ((parseEditTime(prev) ?? 0) > d || prev === '00:30' ? formatEditTime(d) : prev));
    }
    setPlayerError(null);
  };

  const handleVolume = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    v.muted = val === 0;
    setVolume(val);
    setMuted(val === 0);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => addToast('info', 'Pantalla completa no disponible en este navegador.'));
  };

  /** §8 Guardar edición como configuración local (IndexedDB conserva el blob). */
  const handleSave = async () => {
    if (!selectedItem || !channel) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (!(await hasMedia(selectedItem.storageKey ?? ''))) {
        throw new Error('El archivo multimedia no está disponible en IndexedDB; recargá la página o volvé a subirlo.');
      }
      const cfg = saveEdit(
        {
          contentId: selectedItem.id,
          contentKind: selectedItem.kind,
          channelId: channel.id,
          mediaId: selectedItem.storageKey ?? '',
          startTime: trimStart,
          endTime: trimEnd,
          format,
          text: editText,
          textPosition: editTextPos,
        },
        duration
      );
      setSavedAt(cfg.updatedAt);
      addToast('success', 'Edición guardada localmente');
    } catch (err: any) {
      const msg = err?.message ?? 'No se pudo guardar la edición.';
      setSaveError(msg);
      addToast('error', msg);
    } finally {
      setSaving(false); // en todos los caminos: nunca botón eternamente cargando
    }
  };

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const startPct = duration > 0 ? Math.min(100, (trimStart / duration) * 100) : 0;
  const endPct = duration > 0 ? Math.min(100, (trimEnd / duration) * 100) : 0;

  // ---- Guards de render ----
  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <FileVideo className="w-14 h-14 text-text-muted mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Iniciá sesión para usar el Editor</h1>
        <Link to="/login" className="text-primary-light hover:text-primary">Ir a iniciar sesión</Link>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <AlertTriangle className="w-14 h-14 text-warning mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Necesitás un canal</h1>
        <p className="text-text-secondary mb-4">El Editor trabaja sobre tu propio contenido.</p>
        <Link to="/dashboard" className="text-primary-light hover:text-primary">Volver a Creator Studio</Link>
      </div>
    );
  }

  // Empty state §2: sin videos locales disponibles
  if (editableItems.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="bg-bg-card border border-border rounded-xl p-10 text-center">
          <FileVideo className="w-14 h-14 text-text-muted mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            <Scissors className="w-6 h-6 text-primary" /> Editor de video
          </h1>
          <p className="text-text-secondary font-medium">Primero cargá un video desde Creator Studio.</p>
          <p className="text-text-muted text-sm mt-2 max-w-md mx-auto">
            El editor trabaja con tus Reels, VOD y Clips subidos localmente (IndexedDB).
            {demoItemsCount > 0
              ? ` Tenés ${demoItemsCount} contenido(s) demo: no tienen archivo multimedia real y no son editables.`
              : ''}
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <Link
              to="/dashboard/upload"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium"
            >
              <UploadCloud className="w-4 h-4" /> Subir contenido
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-text-secondary hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" /> Volver a Creator Studio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const showSpinner = !!selectedItem && mediaLoading;
  const showError: PlayerError =
    blobMissing ? 'deleted' : playerError ?? (selectedItem && !mediaLoading && !mediaUrl ? 'no-file' : null);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* ===== Header ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Scissors className="w-6 h-6 text-primary" /> Editor básico de video
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Recorte, texto y formato sobre tu contenido local. Todo queda guardado en este navegador.
          </p>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Creator Studio
        </Link>
      </div>

      <div className="grid lg:grid-cols-[300px_1fr] gap-6">
        {/* ===== Columna: selección de contenido ===== */}
        <aside className="bg-bg-card border border-border rounded-xl p-4 h-fit">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-3">
            Tu contenido local
          </h2>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {editableItems.map(item => (
              <ContentPickCard
                key={`${item.kind}:${item.id}`}
                item={item}
                selected={item.id === selectedId}
                onSelect={() => {
                  stopPreview();
                  setSelectedId(item.id);
                  navigate(`/dashboard/editor/${item.id}`, { replace: true });
                }}
              />
            ))}
          </div>
          {demoItemsCount > 0 && (
            <p className="text-xs text-text-muted mt-3 pt-3 border-t border-border">
              {demoItemsCount} contenido(s) demo no aparecen acá: no tienen archivo multimedia real
              (los videos demo nunca se generan localmente).
            </p>
          )}
        </aside>

        {/* ===== Columna principal: editor ===== */}
        <main className="space-y-6 min-w-0">
          {!selectedItem ? (
            <div className="bg-bg-card border border-border rounded-xl p-10 text-center">
              <Film className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary font-medium">Elegí un video para empezar</p>
              <p className="text-text-muted text-sm mt-1">
                Seleccioná uno de tus Reels, VOD o Clips con archivo local disponible.
              </p>
            </div>
          ) : (
            <>
              {/* --- Reproductor --- */}
              <section className="bg-bg-card border border-border rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {KIND_ICON[selectedItem.kind]}
                    <h3 className="font-semibold text-white truncate">{selectedItem.title}</h3>
                    <ContentStateChip state={selectedItem.state} />
                  </div>
                  <Link
                    to={contentService.getContentPath(selectedItem)}
                    className="text-xs text-primary-light hover:text-primary"
                  >
                    Ver publicación
                  </Link>
                </div>

                <div
                  ref={containerRef}
                  className={`relative bg-black rounded-lg overflow-hidden mx-auto ${
                    format === '9:16' ? 'aspect-[9/16] max-w-[300px]' : 'aspect-video w-full'
                  }`}
                >
                  {showSpinner ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-text-muted">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="text-sm">Cargando desde IndexedDB…</span>
                    </div>
                  ) : showError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
                      <AlertTriangle className="w-10 h-10 text-warning" />
                      <p className="text-sm text-text-secondary max-w-md">{ERROR_MESSAGES[showError]}</p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setBlobMissing(false);
                            setPlayerError(null);
                            videoRef.current?.load();
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-text-secondary hover:text-white"
                        >
                          <RotateCcw className="w-4 h-4" /> Reintentar
                        </button>
                        <Link
                          to="/dashboard"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm"
                        >
                          Volver a Creator Studio
                        </Link>
                      </div>
                    </div>
                  ) : mediaUrl ? (
                    <video
                      ref={videoRef}
                      src={mediaUrl}
                      className="w-full h-full object-contain"
                      onLoadedMetadata={handleLoadedMetadata}
                      onTimeUpdate={e => {
                        setCurrentTime(e.currentTarget.currentTime);
                        // seguridad extra: aunque el usuario le dé play normal, respetar corte en vista previa
                        if (previewing && e.currentTarget.currentTime >= trimEnd) {
                          e.currentTarget.pause();
                          setPlaying(false);
                          stopPreview();
                        }
                      }}
                      onError={() => setPlayerError(mapVideoError(videoRef.current?.error ?? null))}
                      onEnded={() => { setPlaying(false); stopPreview(); }}
                      playsInline
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm px-6 text-center">
                      {ERROR_MESSAGES['no-file']}
                    </div>
                  )}

                  {/* Texto sobre el video (§7) — overlay CSS; se guarda como configuración */}
                  {editText.trim() && !showSpinner && !showError && (
                    <div
                      className={`absolute inset-x-0 px-4 pointer-events-none ${
                        editTextPos === 'top' ? 'top-3' : editTextPos === 'center' ? 'top-1/2 -translate-y-1/2' : 'bottom-3'
                      }`}
                    >
                      <p className="text-center text-white font-bold text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] break-words">
                        {editText}
                      </p>
                    </div>
                  )}
                </div>

                {/* Controles */}
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlay}
                      disabled={!mediaUrl || !!showError || showSpinner}
                      className="w-10 h-10 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center disabled:opacity-40"
                      aria-label={playing ? 'Pausar' : 'Reproducir'}
                    >
                      {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>
                    <span className="text-xs text-text-secondary tabular-nums w-24 shrink-0">
                      {formatEditTime(currentTime)} / {duration > 0 ? formatEditTime(duration) : '—'}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(duration, 0.1)}
                      step={0.1}
                      value={Math.min(currentTime, duration || 0)}
                      onChange={e => handleSeek(parseFloat(e.target.value))}
                      disabled={!mediaUrl || !(duration > 0)}
                      className="flex-1 accent-[#1677FF]"
                      aria-label="Progreso"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={toggleMute} disabled={!mediaUrl} className="text-text-secondary hover:text-white" aria-label="Silenciar">
                        {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={muted ? 0 : volume}
                        onChange={e => handleVolume(parseFloat(e.target.value))}
                        disabled={!mediaUrl}
                        className="w-16 accent-[#1677FF]"
                        aria-label="Volumen"
                      />
                      <button
                        onClick={toggleFullscreen}
                        className="text-text-secondary hover:text-white"
                        aria-label="Pantalla completa"
                      >
                        <Maximize className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* --- Recorte básico (§4) --- */}
              <section className="bg-bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-primary" /> Recorte
                </h3>
                <div className="grid sm:grid-cols-2 gap-3 mb-3">
                  <label className="block">
                    <span className="text-xs text-text-muted uppercase tracking-wide">Inicio</span>
                    <input
                      value={startStr}
                      onChange={e => setStartStr(e.target.value)}
                      placeholder="00:00"
                      inputMode="numeric"
                      className="mt-1 w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary tabular-nums"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-text-muted uppercase tracking-wide">Fin</span>
                    <input
                      value={endStr}
                      onChange={e => setEndStr(e.target.value)}
                      placeholder={duration > 0 ? formatEditTime(duration) : '00:30'}
                      inputMode="numeric"
                      className="mt-1 w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary tabular-nums"
                    />
                  </label>
                </div>
                <p className="text-xs text-text-muted mb-2">Formato mm:ss (ej. 00:05 – 00:30)</p>

                {/* Timeline simple con rango seleccionado */}
                <div className="relative h-8 rounded-md bg-bg-elevated border border-border overflow-hidden select-none">
                  <div
                    className="absolute inset-y-0 bg-primary/30 border-x-2 border-primary"
                    style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
                  />
                  <div className="absolute inset-y-0 w-0.5 bg-warning" style={{ left: `${progressPct}%` }} title="Tiempo actual" />
                  <div className="absolute inset-0 flex">
                    <button
                      className="flex-1 cursor-pointer"
                      onClick={e => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const pct = (e.clientX - rect.left) / rect.width;
                        handleSeek(pct * duration);
                      }}
                      disabled={!(duration > 0)}
                      aria-label="Buscar posición"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs tabular-nums">
                  <span className="text-text-muted">{formatEditTime(trimStart)}</span>
                  <span className={trimValid ? 'text-success' : 'text-error'}>
                    {trimValid
                      ? `Selección: ${formatEditTime(trimEnd - trimStart)}`
                      : duration > 0
                        ? 'Reglas: inicio ≥ 0 · fin ≤ duración · inicio < fin'
                        : 'Cargá el video para conocer la duración'}
                  </span>
                  <span className="text-text-muted">{duration > 0 ? formatEditTime(duration) : '—'}</span>
                </div>

                <div className="flex flex-wrap gap-3 mt-4">
                  <button
                    onClick={handleTrimPreview}
                    disabled={!mediaUrl || !trimValid || !!showError}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium disabled:opacity-40"
                  >
                    {previewing ? <Pause className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    Vista previa del recorte
                  </button>
                  {previewing && (
                    <button
                      onClick={() => {
                        stopPreview();
                        videoRef.current?.pause();
                        setPlaying(false);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-text-secondary hover:text-white text-sm"
                    >
                      <RotateCcw className="w-4 h-4" /> Detener vista previa
                    </button>
                  )}
                </div>
              </section>

              {/* --- Formato del Reel (§6) --- */}
              {selectedItem.kind === 'reel' && (
                <section className="bg-bg-card border border-border rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white mb-1">Formato del Reel</h3>
                  <p className="text-xs text-text-muted mb-3">
                    Previsualización vertical por CSS. No se realiza conversión destructiva del archivo
                    (el navegador no puede recodificar de forma fiable sin un motor de render).
                  </p>
                  <div className="flex gap-2">
                    {(['9:16', '16:9'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setFormat(f)}
                        className={`px-4 py-2 rounded-lg text-sm border ${
                          format === f
                            ? 'border-primary bg-primary/15 text-white font-medium'
                            : 'border-border text-text-secondary hover:text-white'
                        }`}
                      >
                        {f === '9:16' ? '9:16 — Vertical' : '16:9 — Horizontal'}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* --- Texto sobre el video (§7) --- */}
              <section className="bg-bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Type className="w-4 h-4 text-primary" /> Texto sobre el video
                </h3>
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value.slice(0, 140))}
                  rows={2}
                  placeholder="Texto opcional (se muestra sobre la previsualización)"
                  className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary resize-none"
                />
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-text-muted">Posición:</span>
                  {([
                    ['top', 'Arriba'],
                    ['center', 'Centro'],
                    ['bottom', 'Abajo'],
                  ] as const).map(([pos, label]) => (
                    <button
                      key={pos}
                      onClick={() => setEditTextPos(pos)}
                      className={`px-3 py-1 rounded-md text-xs border ${
                        editTextPos === pos
                          ? 'border-primary bg-primary/15 text-white'
                          : 'border-border text-text-secondary hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <span className="text-xs text-text-muted ml-auto tabular-nums">{editText.length}/140</span>
                </div>
                <p className="text-xs text-text-muted mt-2">
                  El texto se guarda como configuración de edición (no se incrusta en el archivo de video).
                </p>
              </section>

              {/* --- Guardar + exportación honesta (§8/§9) --- */}
              <section className="bg-bg-card border border-border rounded-xl p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleSave}
                    disabled={!trimValid || saving || !!showError || !mediaUrl}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium text-sm disabled:opacity-40"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Guardando…' : 'Guardar edición'}
                  </button>
                  {savedAt && !saving && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-success">
                      <CheckCircle2 className="w-4 h-4" />
                      Guardada {new Date(savedAt).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                {saveError && (
                  <p className="text-xs text-error mt-2 flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {saveError}
                  </p>
                )}
                {!trimValid && duration > 0 && (
                  <p className="text-xs text-warning mt-2">Ajustá el recorte antes de guardar (inicio &lt; fin).</p>
                )}
                <div className="mt-3 flex items-start gap-2 text-xs text-text-muted bg-bg-elevated rounded-lg p-3">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary-light" />
                  <span>
                    Edición guardada localmente. La exportación de video se incorporará en una etapa
                    posterior (requiere re-codificación; no se simula aquí). Lo que sí funciona hoy:
                    recorte, vista previa, texto y formato quedan guardados como configuración lista
                    para ese futuro pipeline.
                  </span>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default VideoEditorPage;
