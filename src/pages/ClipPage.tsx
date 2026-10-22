import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import * as clipService from '../services/clip';
import * as db from '../services/database';
import { DEMO_USERNAME_PREFIX } from '../services/demoData';
import { formatContentDuration, deriveContentState } from '../services/content';
import { ContentStateChip } from '../components/ContentStateChip';
import { useLocalMediaUrl } from '../hooks/useLocalMediaUrl';
import { DemoBadge } from '../components/DemoBadge';
import type { Clip, User, Channel } from '../types';
import {
  Calendar, Eye, Share2, Flag, UserPlus, UserCheck,
  Trash2, Clock, Scissors
} from 'lucide-react';

export function ClipPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  
  const [clip, setClip] = useState<Clip | null>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [channelUser, setChannelUser] = useState<User | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  // Bug QA Etapa 6: si la URL multimedia almacenada es inválida/heredada,
  // el <video> dispara onError => se muestra el placeholder honesto en vez
  // de quedar esperando un evento onLoadedData que nunca ocurre.
  const [mediaError, setMediaError] = useState(false);
  // ETAPA 7B: si videoUrl está vacío y hay storageKey → blob local (IndexedDB).
  const localMedia = useLocalMediaUrl(clip?.videoUrl, clip?.storageKey);

  useEffect(() => {
    if (!id) return;
    try {
      const c = clipService.getClipById(id);
      // Un clip oculto (visibility PRIVATE) solo es visible para su dueño.
      const isOwnerOfLoaded = c && user && (c.creatorId === user.id || user.role === 'OWNER' || user.role === 'ADMIN');
      if (c && c.status === 'READY' && (c.visibility !== 'PRIVATE' || isOwnerOfLoaded)) {
        setClip(c);
        setMediaError(false);

        // Get channel info
        const ch = db.getAllChannels().find(ch => ch.id === c.channelId);
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
        clipService.incrementClipViews(id);
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
    if (!clip || !user) return;
    
    // Check permissions
    if (clip.creatorId !== user.id && user.role === 'USER') {
      addToast('error', 'No tienes permiso para eliminar este clip');
      return;
    }
    
    if (!confirm('¿Estás seguro de que quieres eliminar este clip?')) return;
    
    try {
      await clipService.deleteClip(clip.id);
      addToast('success', 'Clip eliminado');
      navigate('/dashboard/clips');
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

  if (!clip || !channel || !channelUser) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Clip no encontrado</h1>
        <p className="text-text-secondary">Este clip no existe o ha sido eliminado.</p>
        <Link to="/" className="text-primary-light hover:text-primary mt-4 inline-block">
          Volver al inicio
        </Link>
      </div>
    );
  }

  const isOwner = user && (clip.creatorId === user.id || user.role === 'OWNER' || user.role === 'ADMIN');
  // Sin videoUrl no se intenta cargar nada; con mediaError la URL falló => fallback honesto.
  // ETAPA 7B: el playSrc puede ser la URL almacenada o el blob local de IndexedDB.
  const playSrc = clip.videoUrl || localMedia.url || '';
  const hasMedia = !!playSrc && !mediaError;
  const isDemoClip = channelUser?.username.startsWith(DEMO_USERNAME_PREFIX) ?? false;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Reproductor: usa el medio local si existe; si no, placeholder honesto */}
      <div className="aspect-video bg-black rounded-xl mb-6 overflow-hidden relative flex items-center justify-center">
        {hasMedia ? (
          <video
            key={`${clip.id}-${localMedia.url ?? 'url'}`}
            src={playSrc}
            poster={clip.thumbnailUrl || undefined}
            controls
            playsInline
            preload="metadata"
            onError={() => setMediaError(true)}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="text-center px-4">
            <Scissors className="w-16 h-16 text-warning mx-auto mb-4" />
            <p className="text-text-secondary font-medium">Previsualización del clip</p>
            <p className="text-text-muted text-sm mt-2 max-w-md mx-auto">
              Todavía no hay un archivo multimedia local asociado a este clip. La reproducción
              quedará disponible cuando se conecte el almacenamiento/CDN del proyecto.
            </p>
          </div>
        )}
        {isDemoClip && (
          <span className="absolute top-3 left-3"><DemoBadge /></span>
        )}
      </div>

      {/* Clip Info */}
      <div className="mb-6">
        <div className="flex items-start gap-3 mb-3">
          <h1 className="text-2xl font-bold text-white">{clip.title}</h1>
          <ContentStateChip state={deriveContentState(clip)} className="mt-1.5" />
        </div>
        
        <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted mb-4">
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {clip.views} visualizaciones
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {new Date(clip.createdAt).toLocaleDateString('es', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {formatContentDuration(clip.duration)}
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
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger hover:bg-danger/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </button>
          )}
        </div>
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
      {clip.description && (
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-medium text-text-muted mb-2">Descripción</h3>
          <p className="text-text-secondary whitespace-pre-wrap">{clip.description}</p>
        </div>
      )}
    </div>
  );
}
