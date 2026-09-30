import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import * as videoService from '../services/video';
import * as db from '../services/database';
import type { Video, User, Channel } from '../types';
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

  useEffect(() => {
    if (id) {
      const v = videoService.getVideoById(id);
      if (v && v.status === 'READY') {
        setVideo(v);
        
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Video Player */}
      <div className="aspect-video bg-bg-elevated rounded-xl mb-6 flex items-center justify-center">
        <div className="text-center">
          <Play className="w-16 h-16 text-primary-light mx-auto mb-4" />
          <p className="text-text-secondary">Reproductor de video</p>
          <p className="text-text-muted text-sm mt-2">
            En producción, aquí se reproduciría el video desde {video.videoUrl}
          </p>
        </div>
      </div>

      {/* Video Info */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-3">{video.title}</h1>
        
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
            {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
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
              <button className="flex items-center gap-2 px-4 py-2 bg-bg-elevated border border-border rounded-lg text-sm text-text-secondary hover:text-white transition-colors">
                <Edit className="w-4 h-4" />
                Editar
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
