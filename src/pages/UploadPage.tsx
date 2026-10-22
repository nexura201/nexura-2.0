import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import {
  UploadCloud, Film, Video as VideoIcon, Scissors, Loader2,
  CheckCircle2, AlertTriangle, X, Library, HardDriveDownload,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import * as db from '../services/database';
import * as categoryService from '../services/category';
import * as videoService from '../services/video';
import * as clipService from '../services/clip';
import * as reelService from '../services/reel';
import {
  saveMedia, deleteMedia, getMediaBlob, formatBytes, describeMediaError, buildMediaKey,
} from '../services/mediaLocal';
import { reelExistsWithKey } from '../services/reel';
import type { ContentKind } from '../services/content';

/**
 * UploadPage — ETAPA 7B (/dashboard/upload)
 *
 * Subida LOCAL de contenido (Reel / VOD / Clip) sin URLs externas:
 *  1. Seleccionar archivo de video desde la PC
 *  2. Validar tipo (MIME de video; además el <video> de preview debe cargarlo)
 *  3. Validar tamaño (500 MB máx.)
 *  4. Preview local con URL.createObjectURL (SIEMPRE liberada: revoke + null)
 *  5. Título / descripción / categoría / visibilidad
 *  6. Tipo de contenido: Reel | VOD | Clip
 *  7-9. Guardado: Blob → IndexedDB (mediaLocal) y metadatos → servicios
 *       existentes (video.ts / clip.ts / reel.ts). NO hay arquitectura paralela:
 *       `storageKey` del modelo apunta al blob real; `videoUrl` queda '' hasta
 *       que exista backend/CDN (los reproductores ya muestran placeholder honesto
 *       y pueden resolver el medio vía mediaLocal.getMediaBlob(storageKey)).
 *  10. Object URLs liberadas en todos los caminos (unmount / cambio de archivo).
 *  11. Confirmación + 12. retorno a Biblioteca.
 *
 * El contenido creado por el usuario NUNCA es demo: se ancla al canal propio y
 * resetDemoData() (Etapa 5/6) solo toca canales demo_* — ver demoData.ts.
 */

// ============ VALIDACIÓN DE ARCHIVO ============

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska'];

type FileState =
  | { kind: 'empty' }
  | { kind: 'invalid'; reason: string }
  | { kind: 'too-large'; reason: string }
  | { kind: 'ready'; file: File };

type SaveStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; title: string; kindLabel: string }
  | { kind: 'error'; code: string; message: string };

function validateVideoFile(file: File): FileState {
  if (!file.type.startsWith('video/') && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return { kind: 'invalid', reason: `Tipo de archivo no permitido (${file.type || 'desconocido'}). Usá MP4, WebM, OGG, MOV o MKV.` };
  }
  if (file.size === 0) {
    return { kind: 'invalid', reason: 'El archivo está vacío.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { kind: 'too-large', reason: `Archivo demasiado grande (${formatBytes(file.size)}). El máximo local es ${formatBytes(MAX_FILE_SIZE)}.` };
  }
  return { kind: 'ready', file };
}

// ============ PERSISTENCIA (usa EXCLUSIVAMENTE los servicios existentes) ============

interface UploadData {
  kind: ContentKind;
  channelId: string;
  userId: string;
  storageKey: string;
  title: string;
  description: string;
  visibility: 'public' | 'unlisted' | 'private';
  duration: number;
  categoryId: string | null;
}

/**
 * Crea el registro de metadatos en el SERVICIO BASE correspondiente
 * (video.ts / clip.ts / reel.ts — mismas colecciones nexura_videos /
 * nexura_clips / nexura_reels de Etapa 6). NO se escribe localStorage crudo:
 * la única arquitectura de contenido es la existente. Devuelve el id persistido.
 */
async function persistContentMetadata(input: UploadData): Promise<string> {
  if (input.kind === 'video') {
    const video = await videoService.createVideoFromLocalUpload({
      channelId: input.channelId,
      userId: input.userId,
      title: input.title,
      description: input.description,
      visibility: (input.visibility.toUpperCase() as 'PUBLIC' | 'UNLISTED' | 'PRIVATE'),
      duration: input.duration,
      storageKey: input.storageKey,
    });
    return video.id;
  }
  if (input.kind === 'clip') {
    const clip = await clipService.createClipFromLocalUpload({
      channelId: input.channelId,
      creatorId: input.userId,
      title: input.title,
      description: input.description,
      // Clip solo modela PUBLIC/PRIVATE (ClipVisibility, Etapa 6);
      // 'unlisted' se trata como público por enlace interno.
      visibility: input.visibility === 'private' ? 'PRIVATE' : 'PUBLIC',
      duration: input.duration,
      storageKey: input.storageKey,
    });
    return clip.id;
  }
  // Reel: servicio existente createReelFromLocalUpload (anti-duplicados con
  // reelExistsWithKey sobre la misma colección nexura_reels).
  const reel = await reelService.createReelFromLocalUpload({
    channelId: input.channelId,
    userId: input.userId,
    title: input.title,
    description: input.description,
    visibility: input.visibility,
    duration: input.duration,
    storageKey: input.storageKey,
  });
  return reel.id;
}

/** Ajustes posteriores al registro, delegando en los setters existentes. */
function finalizeContentMetadata(input: UploadData, createdId: string): void {
  if (input.kind === 'video') {
    // VOD: setVideoVisibility es el setter canónico (ajusta publishedAt al publicar).
    if (input.visibility === 'unlisted') videoService.setVideoVisibility(createdId, 'UNLISTED');
  } else if (input.kind === 'clip') {
    if (input.visibility !== 'private') {
      clipService.setClipVisibility(createdId, 'PUBLIC'); // explícito (undefined ya era público)
    }
  } else {
    if (input.visibility === 'unlisted') {
      // Reel no tiene UNLISTED: se modela como PRIVATE (feed público solo lista
      // READY) hasta que exista backend. La Biblioteca del autor lo sigue viendo.
      reelService.setReelPublished(createdId, false);
    }
  }
  // Categoría elegida => se asigna al canal propio (Channel.categoryId es la
  // única fuente de categoría del proyecto; no se duplica en cada contenido).
  if (input.categoryId) {
    try {
      const channel = db.getChannelByUserId(input.userId);
      if (channel && channel.categoryId !== input.categoryId) {
        db.updateChannel(channel.id, { categoryId: input.categoryId });
      }
    } catch { /* best-effort: la subida no depende de la categoría */ }
  }
}

// ============ COMPONENTE ============

/**
 * ETAPA 7C — `?type=` pre-selecciona el tipo de contenido desde Creator Studio:
 *   /dashboard/upload?type=reel | vod | clip
 * Sin el parámetro (o con un valor desconocido) se mantiene el default 'reel'.
 */
const UPLOAD_TYPE_PARAM: Record<string, ContentKind> = {
  reel: 'reel',
  vod: 'video',
  video: 'video',
  clip: 'clip',
};

export function UploadPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [fileState, setFileState] = useState<FileState>({ kind: 'empty' });
  const [previewOk, setPreviewOk] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [kind, setKind] = useState<ContentKind>(
    () => UPLOAD_TYPE_PARAM[(searchParams.get('type') || '').toLowerCase()] ?? 'reel'
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ kind: 'idle' });
  const [duration, setDuration] = useState(0);

  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mountedRef = useRef(true);

  const categories = React.useMemo(() => {
    categoryService.ensureDefaultCategories();
    return categoryService.getAllCategories();
  }, []);

  const channel = user ? db.getChannelByUserId(user.id) : null;

  // ---- Seguridad de memoria: registrar/liberar object URLs sin fugas ----
  const releaseObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      releaseObjectUrl(); // desmontaje: nunca dejar una object URL activa
    };
  }, [releaseObjectUrl]);

  const handleFileSelected = (file: File | null) => {
    releaseObjectUrl(); // archivo anterior: liberar antes de crear uno nuevo
    setPreviewOk(false);
    setPreviewFailed(false);
    setDuration(0);
    if (!file) {
      setFileState({ kind: 'empty' });
      setObjectUrl(null);
      return;
    }
    const state = validateVideoFile(file);
    setFileState(state);
    if (state.kind === 'ready') {
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      setObjectUrl(url);
      if (!title.trim()) setTitle(file.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 120));
    } else {
      setObjectUrl(null);
    }
  };

  const clearFile = () => {
    handleFileSelected(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ---- Guardado ----
  const canSave =
    !!user &&
    !!channel &&
    fileState.kind === 'ready' &&
    previewOk &&
    !previewFailed &&
    title.trim().length > 0 &&
    saveStatus.kind !== 'saving';

  const handleSave = async () => {
    if (!user || !channel || fileState.kind !== 'ready' || saveStatus.kind === 'saving') return;

    setSaveStatus({ kind: 'saving' });
    const contentId = uuidv4();
    const ext = fileState.file.name.split('.').pop()?.toLowerCase() || 'mp4';
    const storageKey = buildMediaKey(kind, channel.id, contentId, `media.${ext}`);
    let blobSaved = false;
    let createdId: string | null = null;

    try {
      // Anti-duplicado (reels): dos registros apuntando al mismo blob serían
      // inconsistencia; para videos/clips la key incluye un uuid nuevo → único.
      if (kind === 'reel' && reelExistsWithKey(channel.id, storageKey)) {
        throw new Error('Ya existe un Reel con este archivo (no se duplicó).');
      }

      // 8. Primero el Blob en IndexedDB (si esto falla, no queda metadata huérfana)
      await saveMedia(storageKey, fileState.file, fileState.file.name);
      blobSaved = true;

      // 9. Metadatos con los SERVICIOS EXISTENTES (sin sistema paralelo)
      const input: UploadData = {
        kind,
        channelId: channel.id,
        userId: user.id,
        storageKey,
        title: title.trim(),
        description: description.trim(),
        visibility,
        duration,
        categoryId: categoryId || null,
      };
      createdId = await persistContentMetadata(input);

      // Verificación post-guardado: el registro existe y el blob está accesible
      const existsInService =
        kind === 'video'
          ? !!videoService.getVideoById(createdId)
          : kind === 'clip'
            ? !!clipService.getClipById(createdId)
            : reelExistsWithKey(channel.id, storageKey);
      const blobOk = !!(await getMediaBlob(storageKey));
      if (!existsInService || !blobOk) {
        throw new Error('La verificación post-guardado falló (registro o blob no disponible).');
      }

      finalizeContentMetadata(input, createdId);

      // 10. Liberar la object URL del preview: ya no es necesaria
      releaseObjectUrl();
      setObjectUrl(null);

      if (mountedRef.current) {
        setSaveStatus({ kind: 'saved', title: input.title, kindLabel: kind === 'video' ? 'VOD' : kind === 'clip' ? 'Clip' : 'Reel' });
        addToast('success', `${kind === 'video' ? 'VOD' : kind === 'clip' ? 'Clip' : 'Reel'} guardado localmente`);
      }
    } catch (err: any) {
      // Rollback anti-huérfano: si el blob se guardó pero los metadatos
      // fallaron, se elimina el blob; si el registro llegó a crearse, se
      // soft-deletea para no dejar entradas sin dueño visible.
      if (blobSaved) {
        try { await deleteMedia(storageKey); } catch { /* noop */ }
      }
      if (createdId) {
        try {
          if (kind === 'video') await videoService.deleteVideo(createdId);
          else if (kind === 'clip') await clipService.deleteClip(createdId);
          else reelService.deleteReel(createdId);
        } catch { /* noop: mejor un registro DELETED que uno roto */ }
      }
      const { code, message } = describeMediaError(err);
      if (mountedRef.current) {
        setSaveStatus({ kind: 'error', code, message });
        addToast('error', message);
      }
    }
    // En TODOS los caminos el estado sale de 'saving' → nunca loading infinito.
  };

  // ---- Render helpers ----
  const kindOptions: Array<{ value: ContentKind; label: string; icon: React.ReactNode; hint: string }> = [
    { value: 'reel', label: 'Reel', icon: <Film className="w-5 h-5" />, hint: 'Vertical corto (9:16)' },
    { value: 'video', label: 'VOD', icon: <VideoIcon className="w-5 h-5" />, hint: 'Video completo' },
    { value: 'clip', label: 'Clip', icon: <Scissors className="w-5 h-5" />, hint: 'Fragmento corto' },
  ];

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <UploadCloud className="w-14 h-14 text-text-muted mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Inicia sesión para subir contenido</h1>
        <Link to="/login" className="text-primary-light hover:text-primary">Ir a iniciar sesión</Link>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <AlertTriangle className="w-14 h-14 text-warning mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Necesitás un canal</h1>
        <p className="text-text-secondary mb-4">Tu cuenta no tiene un canal asociado donde guardar el contenido.</p>
        <Link to="/dashboard" className="text-primary-light hover:text-primary">Volver al dashboard</Link>
      </div>
    );
  }

  // ---- Confirmación (post-guardado) ----
  if (saveStatus.kind === 'saved') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">¡Guardado correctamente!</h1>
        <p className="text-text-secondary mb-1">
          Tu <strong className="text-white">{saveStatus.kindLabel}</strong> «{saveStatus.title}» quedó guardado
          localmente en este navegador (IndexedDB).
        </p>
        <p className="text-text-muted text-sm mb-8">
          Ya podés verlo en tu Biblioteca. Podés subir otro contenido o volver a la Biblioteca.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/library"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium"
          >
            <Library className="w-4 h-4" /> Ir a la Biblioteca
          </Link>
          <button
            onClick={() => {
              setSaveStatus({ kind: 'idle' });
              setFileState({ kind: 'empty' });
              setTitle('');
              setDescription('');
              setDuration(0);
              setPreviewOk(false);
              setPreviewFailed(false);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-text-secondary hover:text-white"
          >
            <UploadCloud className="w-4 h-4" /> Subir otro
          </button>
        </div>
      </div>
    );
  }

  const saving = saveStatus.kind === 'saving';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
          <UploadCloud className="w-6 h-6 text-primary" /> Subir contenido
        </h1>
        <p className="text-text-secondary text-sm">
          Subida 100% local: el archivo se guarda en IndexedDB de este navegador y sus metadatos en tu
          Biblioteca. No se envía nada a ningún servidor externo.
        </p>
      </div>

      {/* 1-4. Selección + validación + preview */}
      <section className="bg-bg-card border border-border rounded-xl p-5 mb-5">
        <h2 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">1 · Archivo de video</h2>

        {fileState.kind === 'empty' && (
          <label className="block border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="sr-only"
              onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
            />
            <UploadCloud className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary font-medium">Seleccioná un archivo de video desde tu PC</p>
            <p className="text-text-muted text-xs mt-1">MP4, WebM, OGG, MOV o MKV · máximo {formatBytes(MAX_FILE_SIZE)}</p>
          </label>
        )}

        {(fileState.kind === 'invalid' || fileState.kind === 'too-large') && (
          <div className={`rounded-lg border p-4 flex items-start gap-3 ${
            fileState.kind === 'too-large' ? 'border-warning/40 bg-warning/10' : 'border-danger/40 bg-danger/10'
          }`}>
            <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${fileState.kind === 'too-large' ? 'text-warning' : 'text-danger'}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${fileState.kind === 'too-large' ? 'text-warning' : 'text-danger'}`}>
                {fileState.reason}
              </p>
              <button onClick={clearFile} className="mt-2 text-xs text-primary-light hover:text-primary underline">
                Elegir otro archivo
              </button>
            </div>
          </div>
        )}

        {fileState.kind === 'ready' && (
          <div className="space-y-3">
            {objectUrl && (
              <div className="rounded-lg overflow-hidden bg-black aspect-video max-h-72 flex items-center justify-center relative">
                <video
                  key={objectUrl}
                  src={objectUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-contain"
                  onLoadedMetadata={(e) => {
                    const d = e.currentTarget.duration;
                    if (Number.isFinite(d) && d > 0) setDuration(Math.round(d));
                    setPreviewOk(true);
                  }}
                  onError={() => {
                    setPreviewFailed(true);
                    setPreviewOk(false);
                  }}
                />
                {!previewOk && !previewFailed && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </span>
                )}
              </div>
            )}

            {previewFailed ? (
              <div className="rounded-lg border border-danger/40 bg-danger/10 p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                <p className="text-sm text-danger">
                  El navegador no pudo reproducir este archivo (códec no soportado o archivo dañado).
                  Probá con un MP4 (H.264) o WebM válido.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span className="truncate">
                  <HardDriveDownload className="w-3.5 h-3.5 inline mr-1" />
                  {fileState.file.name} · {formatBytes(fileState.file.size)}
                  {duration > 0 ? ` · ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}` : ''}
                  {previewOk ? ' · preview OK ✓' : ''}
                </span>
                <button
                  onClick={clearFile}
                  disabled={saving}
                  className="inline-flex items-center gap-1 text-text-secondary hover:text-white disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" /> Quitar
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 6. Tipo de contenido */}
      <section className="bg-bg-card border border-border rounded-xl p-5 mb-5">
        <h2 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">2 · Tipo de contenido</h2>
        <div className="grid grid-cols-3 gap-2">
          {kindOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              disabled={saving}
              onClick={() => setKind(opt.value)}
              className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm transition-colors ${
                kind === opt.value
                  ? 'border-primary bg-primary/10 text-white'
                  : 'border-border bg-bg-elevated text-text-secondary hover:text-white'
              }`}
            >
              {opt.icon}
              <span className="font-semibold">{opt.label}</span>
              <span className="text-[11px] text-text-muted">{opt.hint}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 5. Metadatos */}
      <section className="bg-bg-card border border-border rounded-xl p-5 mb-5 space-y-4">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wide">3 · Detalles</h2>

        <div>
          <label htmlFor="upload-title" className="block text-sm text-text-secondary mb-1">Título *</label>
          <input
            id="upload-title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={120}
            disabled={saving}
            placeholder="Un título claro para tu contenido"
            className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border text-white focus:outline-none focus:border-primary disabled:opacity-60"
          />
        </div>

        <div>
          <label htmlFor="upload-desc" className="block text-sm text-text-secondary mb-1">Descripción</label>
          <textarea
            id="upload-desc"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            maxLength={2000}
            disabled={saving}
            placeholder="Contá de qué se trata (opcional)"
            className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border text-white focus:outline-none focus:border-primary resize-none disabled:opacity-60"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="upload-category" className="block text-sm text-text-secondary mb-1">Categoría</label>
            <select
              id="upload-category"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              disabled={saving}
              className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border text-white focus:outline-none focus:border-primary disabled:opacity-60"
            >
              <option value="">Sin categoría</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-sm text-text-secondary mb-1">Visibilidad</span>
            <div className="flex gap-2" role="radiogroup" aria-label="Visibilidad">
              {([
                ['public', 'Público'],
                ['unlisted', 'No listado'],
                ['private', 'Privado'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={visibility === value}
                  disabled={saving}
                  onClick={() => setVisibility(value)}
                  className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    visibility === value
                      ? 'bg-primary text-white border-primary'
                      : 'bg-bg-elevated border-border text-text-secondary hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Estado de error de guardado (cuota / almacenamiento / inesperado) */}
      {saveStatus.kind === 'error' && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 p-4 mb-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-danger">{saveStatus.message}</p>
            <p className="text-xs text-danger/80 mt-1">
              Código: <code>{saveStatus.code}</code>. No se guardó nada parcialmente: el blob se revirtió automáticamente.
            </p>
            <button onClick={() => setSaveStatus({ kind: 'idle' })} className="mt-2 text-xs text-primary-light hover:text-primary underline">
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium"
        >
          {saving ? (<><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</>) : (<><CheckCircle2 className="w-4 h-4" /> Guardar localmente</>)}
        </button>
        <Link to="/library" className="px-4 py-2.5 rounded-lg border border-border text-sm text-text-secondary hover:text-white">
          Volver a Biblioteca
        </Link>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2.5 rounded-lg border border-transparent text-sm text-text-muted hover:text-white"
        >
          Cancelar
        </button>
      </div>

      {!canSave && !saving && (
        <p className="mt-3 text-xs text-text-muted">
          {fileState.kind !== 'ready'
            ? 'Seleccioná un archivo de video válido para habilitar el guardado.'
            : title.trim().length === 0
              ? 'Agregá un título para poder guardar.'
              : previewFailed
                ? 'El archivo no se puede reproducir en este navegador; elegí otro.'
                : !previewOk
                  ? 'Esperá a que termine el preview del video…'
                  : 'Completá los datos requeridos.'}
        </p>
      )}

      <p className="mt-6 text-[11px] text-text-muted leading-relaxed">
        Nota: el archivo queda en <strong>IndexedDB</strong> (<code>nexura_media_local</code>) de este navegador;
        los metadatos usan tus servicios actuales (Biblioteca/Reels/VOD/Clips). Este contenido es TUYO: no es demo
        y el “Restaurar datos demo” nunca lo borra. La reproducción pública vía CDN/backend se conectará en etapas
        posteriores; mientras tanto la Biblioteca y las páginas de contenido resuelven el medio desde tu almacenamiento local.
      </p>
    </div>
  );
}

export default UploadPage;
