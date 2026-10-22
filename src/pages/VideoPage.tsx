import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import * as videoService from '../services/video';
import * as db from '../services/database';
import { DEMO_USERNAME_PREFIX } from '../services/demoData';
import { formatContentDuration, deriveContentState } from '../services/content';
import { ContentStateChip } from '../components/ContentStateChip';
import { DemoBadge } from '../components/DemoBadge';
import type { Video, User, Channel } from '../types';

/**
 * Etapa 6 — Los VOD demo del seed son PUBLIC por defecto; esta helper deja
 * claro que no hay ninguna otra exención de visibilidad. (Mantener explícito
 * para cuando exista backend real: ahí la regla vive en la API.)
 */
function isDemoPublicVod(v: Video): boolean {
  return v.storageKey?.startsWith('videos/demo/') ?? false;
}
import {
  Play, Calendar, Eye, Share2, Flag, UserPlus, UserCheck,
  Edit, Trash2, Clock, Tag
} from 'lucide-react';

export function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  
  const [video, setVideo] = useState<Video | null>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [channelUser, setChannelUser] = useState<User | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  // Hooks de edición declarados aquí (Rules of Hooks: orden estable entre renders).
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  // Bug QA Etapa 6: si la URL multimedia almacenada es inválida/heredada,
  // onError conmuta al placeholder honesto (nunca queda esperando eventos).
  const [mediaError, setMediaError] = useState(false);
  useEffect(() => {
    if (video) { setEditTitle(video.title); setEditDesc(video.description); setEditing(false); }
  }, [video?.id, video?.title, video?.description]);

  useEffect(() => {
    if (!id) return;
    try {
      const v = videoService.getVideoById(id);
      // Owner/admin puede ver su propio contenido PRIVATE/UNLISTED por enlace.
      const ownerChannelId = user ? db.getChannelByUserId(user.id)?.id : undefined;
      const isOwnerOfLoaded = !!v && (!!user && (v.channelId === ownerChannelId || user.role === 'OWNER' || user.role === 'ADMIN'));
      const publiclyVisible = !!v && (v.visibility === 'PUBLIC' || isDemoPublicVod(v) || isOwnerOfLoaded);
      if (v && v.status === 'READY' && publiclyVisible) {
        setVideo(v);
        setMediaError(false);

        // Get channel info
        const ch = db.getAllChannels().find(c => c.id === v.channelId);
        if (ch) {
          setChannel(ch);
          const chUser = db.getUserById(ch.userId);
          setChannelUser(chUser);

          // Check if following
          if (user) {
            setIsFollowing(db.isFollowing(user.id, ch.userId));
          }
        }

        // Increment views
        videoService.incrementVideoViews(id);
      }
    } finally {
      // Nunca dejar loading infinito, ni siquiera ante excepciones.
      setLoading(false);
    }
  }, [id, user]);

  const handleFollow = () => {
    if (!user || !channelUser) return;
    
    try {
      if (isFollowing) {
        db.unfollowUser(user.id, channelUser.id);
        setIsFollowing(false);
        addToast('info', `Dejaste de seguir a @${channelUser.username}`);
      } else {
        db.followUser(user.id, channelUser.id);
        setIsFollowing(true);
        addToast('success', `Ahora sigues a @${channelUser.username}`);
      }
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    addToast('success', 'Enlace copiado al portapapeles');
  };

  const handleDelete = async () => {
    if (!video || !user) return;
    
    // Check permissions
    if (video.channelId !== db.getChannelByUserId(user.id)?.id && user.role === 'USER') {
      addToast('error', 'No tienes permiso para eliminar este video');
      return;
    }
    
    if (!confirm('¿Estás seguro de que quieres eliminar este video?')) return;
    
    try {
      await videoService.deleteVideo(video.id);
      addToast('success', 'Video eliminado');
      navigate('/dashboard/videos');
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="skeleton aspect-video rounded-xl mb-6" />
        <div className="skeleton h-8 w-3/4 mb-4" />
        <div className="skeleton h-4 w-1/2" />
      </div>
    );
  }

  if (!video || !channel || !channelUser) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Video no encontrado</h1>
        <p className="text-text-secondary">Este video no existe o ha sido eliminado.</p>
        <Link to="/" className="text-primary-light hover:text-primary mt-4 inline-block">
          Volver al inicio
        </Link>
      </div>
    );
  }

  const isOwner = user && (video.channelId === db.getChannelByUserId(user.id)?.id || user.role === 'OWNER' || user.role === 'ADMIN');
  // Sin videoUrl no se intenta cargar nada; con mediaError la URL falló => fallback honesto.
  const hasMedia = !!video.videoUrl && !mediaError;
  const isDemoVod = channelUser?.username.startsWith(DEMO_USERNAME_PREFIX) ?? false;

  // Edición local (persiste en localStorage vía services/video.updateVideoMetadata)


  const saveEdit = () => {
    try {
      videoService.updateVideoMetadata(video.id, { title: editTitle.trim() || video.title, description: editDesc });
      setVideo({ ...video, title: editTitle.trim() || video.title, description: editDesc });
      setEditing(false);
      addToast('success', 'Cambios guardados localmente');
    } catch {
      addToast('error', 'No se pudieron guardar los cambios');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Reproductor: medio local si existe; si no, placeholder honesto */}
      <div className="aspect-video bg-black rounded-xl mb-6 overflow-hidden relative flex items-center justify-center">
        {hasMedia ? (
          <video
            key={video.id}
            src={video.videoUrl}
            poster={video.thumbnailUrl || undefined}
            controls
            playsInline
            preload="metadata"
            onError={() => setMediaError(true)}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="text-center px-4">
            <Play className="w-16 h-16 text-primary-light mx-auto mb-4" />
            <p className="text-text-secondary font-medium">Previsualización del video</p>
            <p className="text-text-muted text-sm mt-2 max-w-md mx-auto">
              Todavía no hay un archivo multimedia local asociado a este VOD. La reproducción
              quedará disponible cuando se conecte el almacenamiento/CDN del proyecto.
            </p>
          </div>
        )}
        {isDemoVod && (
          <span className="absolute top-3 left-3"><DemoBadge /></span>
        )}
      </div>

      {/* Video Info */}
      <div className="mb-6">
        <div className="flex items-start gap-3 mb-3">
          <h1 className="text-2xl font-bold text-white">{video.title}</h1>
          <ContentStateChip state={deriveContentState(video)} className="mt-1.5" />
        </div>
        
        <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted mb-4">
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {video.views} visualizaciones
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {new Date(video.publishedAt || video.createdAt).toLocaleDateString('es', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {formatContentDuration(video.duration)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-bg-elevated border border-border rounded-lg text-sm text-text-secondary hover:text-white transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Compartir
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-bg-elevated border border-border rounded-lg text-sm text-text-secondary hover:text-white transition-colors">
            <Flag className="w-4 h-4" />
            Reportar
          </button>
          {isOwner && (
            <>
              <button
                onClick={() => setEditing(e => !e)}
                className="flex items-center gap-2 px-4 py-2 bg-bg-elevated border border-border rounded-lg text-sm text-text-secondary hover:text-white transition-colors"
              >
                <Edit className="w-4 h-4" />
                {editing ? 'Cancelar edición' : 'Editar'}
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger hover:bg-danger/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
            </>
          )}
        </div>

        {/* Formulario de edición local (título/descripción) */}
        {isOwner && editing && (
          <div className="bg-bg-card border border-border rounded-xl p-4 mb-6">
            <p className="text-xs text-text-muted mb-3">
              Los cambios se guardan localmente en este navegador. Solo se editan campos compatibles con el almacenamiento actual.
            </p>
            <label className="block text-sm text-text-secondary mb-1">Título</label>
            <input
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              maxLength={120}
              className="w-full mb-3 px-3 py-2 rounded-lg bg-bg-elevated border border-border text-white focus:outline-none focus:border-primary"
            />
            <label className="block text-sm text-text-secondary mb-1">Descripción</label>
            <textarea
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              rows={4}
              className="w-full mb-3 px-3 py-2 rounded-lg bg-bg-elevated border border-border text-white focus:outline-none focus:border-primary resize-none"
            />
            <button onClick={saveEdit} className="px-4 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary-hover text-white">
              Guardar cambios
            </button>
          </div>
        )}
      </div>

      {/* Channel Info */}
      <div className="bg-bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <Link to={`/channel/${channel.slug}`} className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-lg font-bold text-white overflow-hidden">
              {channelUser.avatarUrl ? (
                <img src={channelUser.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                channelUser.displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-white font-medium">{channelUser.displayName}</p>
              <p className="text-text-muted text-sm">@{channelUser.username}</p>
            </div>
          </Link>
          {user && user.id !== channelUser.id && (
            <button
              onClick={handleFollow}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                isFollowing
                  ? 'bg-bg-elevated border border-border text-white hover:border-danger hover:text-danger'
                  : 'bg-primary hover:bg-primary-hover text-white'
              }`}
            >
              {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {isFollowing ? 'Siguiendo' : 'Seguir'}
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      {video.description && (
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-medium text-text-muted mb-2">Descripción</h3>
          <p className="text-text-secondary whitespace-pre-wrap">{video.description}</p>
        </div>
      )}
    </div>
  );
}
