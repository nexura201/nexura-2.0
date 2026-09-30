import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import * as db from '../services/database';
import * as streaming from '../services/streaming';
import { VideoPlayer } from '../components/VideoPlayer';
import { ChatPanel } from '../components/ChatPanel';
import type { User, Channel } from '../types';
import {
  Users, UserPlus, UserMinus, Share2, Radio, MapPin,
  Calendar, ExternalLink, Play, Video, Scissors, Info,
  Heart, Clock, Eye
} from 'lucide-react';

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (username) {
      const u = db.getUserByUsername(username);
      if (u) {
        setProfileUser(u);
        const ch = db.getChannelByUserId(u.id);
        setChannel(ch);
        setFollowerCount(db.getFollowerCount(u.id));
        setFollowingCount(db.getFollowingCount(u.id));
        if (currentUser) {
          setIsFollowing(db.isFollowing(currentUser.id, u.id));
        }
      }
      setLoading(false);
    }
  }, [username, currentUser]);

  const handleFollow = () => {
    if (!currentUser || !profileUser) return;
    try {
      if (isFollowing) {
        db.unfollowUser(currentUser.id, profileUser.id);
        setIsFollowing(false);
        setFollowerCount(prev => prev - 1);
        addToast('info', `Dejaste de seguir a @${profileUser.username}`);
      } else {
        db.followUser(currentUser.id, profileUser.id);
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
        addToast('success', `Ahora sigues a @${profileUser.username}`);
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

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="skeleton h-48 rounded-xl mb-6" />
        <div className="flex items-end gap-4 mb-6">
          <div className="skeleton w-24 h-24 rounded-full" />
          <div className="space-y-2">
            <div className="skeleton h-6 w-40" />
            <div className="skeleton h-4 w-24" />
          </div>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Usuario no encontrado</h1>
        <p className="text-text-secondary">El usuario @{username} no existe.</p>
        <Link to="/" className="text-primary-light hover:text-primary mt-4 inline-block">Volver al inicio</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Banner */}
      <div className="relative h-48 sm:h-56 bg-gradient-to-r from-primary/30 to-primary-light/20">
        {profileUser.bannerUrl && (
          <img src={profileUser.bannerUrl} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-dark/60 to-transparent" />
      </div>

      {/* Profile Info */}
      <div className="px-4 sm:px-6 -mt-12 relative">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
          <div className="w-24 h-24 rounded-full bg-primary border-4 border-bg-dark flex items-center justify-center text-3xl font-bold text-white overflow-hidden">
            {profileUser.avatarUrl ? (
              <img src={profileUser.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              profileUser.displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">{profileUser.displayName}</h1>
              {channel?.isLive && (
                <span className="bg-danger text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  EN VIVO
                </span>
              )}
            </div>
            <p className="text-text-muted">@{profileUser.username}</p>
          </div>
          <div className="flex items-center gap-2">
            {currentUser && currentUser.id !== profileUser.id && (
              <button
                onClick={handleFollow}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  isFollowing
                    ? 'bg-bg-elevated border border-border text-white hover:border-danger hover:text-danger'
                    : 'bg-primary hover:bg-primary-hover text-white'
                }`}
              >
                {isFollowing ? <><UserMinus className="w-4 h-4" /> Siguiendo</> : <><UserPlus className="w-4 h-4" /> Seguir</>}
              </button>
            )}
            <button
              onClick={handleShare}
              className="p-2 bg-bg-elevated border border-border rounded-lg text-text-secondary hover:text-white transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bio */}
        {profileUser.bio && (
          <p className="text-text-secondary mb-4 max-w-2xl">{profileUser.bio}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-6 text-sm mb-6">
          <span className="text-text-secondary">
            <span className="font-semibold text-white">{followerCount}</span> seguidores
          </span>
          <span className="text-text-secondary">
            <span className="font-semibold text-white">{followingCount}</span> siguiendo
          </span>
          <span className="text-text-muted flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Se unió {new Date(profileUser.createdAt).toLocaleDateString('es')}
          </span>
        </div>

        {/* Channel Status */}
        <div className="bg-bg-card border border-border rounded-xl p-6 mb-6">
          {channel?.isLive ? (
            <div className="aspect-video bg-bg-elevated rounded-lg flex items-center justify-center mb-4">
              <div className="text-center">
                <Play className="w-16 h-16 text-primary-light mx-auto mb-2" />
                <p className="text-white font-medium">Stream en vivo</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Radio className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary">Actualmente offline</p>
              <p className="text-text-muted text-sm mt-1">Este canal no está transmitiendo en este momento.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChannelPage() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [activeTab, setActiveTab] = useState('inicio');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (username) {
      const u = db.getUserByUsername(username);
      if (u) {
        setProfileUser(u);
        const ch = db.getChannelByUserId(u.id);
        setChannel(ch);
        setFollowerCount(db.getFollowerCount(u.id));
        if (currentUser) {
          setIsFollowing(db.isFollowing(currentUser.id, u.id));
        }
      }
      setLoading(false);
    }
  }, [username, currentUser]);

  const handleFollow = () => {
    if (!currentUser || !profileUser) return;
    try {
      if (isFollowing) {
        db.unfollowUser(currentUser.id, profileUser.id);
        setIsFollowing(false);
        setFollowerCount(prev => prev - 1);
      } else {
        db.followUser(currentUser.id, profileUser.id);
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
      }
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-8"><div className="skeleton h-64 rounded-xl" /></div>;
  }

  if (!profileUser || !channel) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Canal no encontrado</h1>
        <Link to="/" className="text-primary-light hover:text-primary">Volver al inicio</Link>
      </div>
    );
  }

  const tabs = [
    { id: 'inicio', label: 'Inicio', icon: Play },
    { id: 'videos', label: 'Videos', icon: Video },
    { id: 'clips', label: 'Clips', icon: Scissors },
    { id: 'acerca', label: 'Acerca de', icon: Info },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Banner */}
      <div className="relative h-40 sm:h-48 bg-gradient-to-r from-primary/30 to-primary-light/20">
        {profileUser.bannerUrl && (
          <img src={profileUser.bannerUrl} alt="" className="w-full h-full object-cover" />
        )}
      </div>

      {/* Channel Header */}
      <div className="px-4 sm:px-6 -mt-10 relative">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-4">
          <div className="w-20 h-20 rounded-full bg-primary border-4 border-bg-dark flex items-center justify-center text-2xl font-bold text-white overflow-hidden">
            {profileUser.avatarUrl ? (
              <img src={profileUser.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              profileUser.displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{channel.title}</h1>
              {channel.isLive && (
                <span className="bg-danger text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  LIVE
                </span>
              )}
            </div>
            <p className="text-text-muted text-sm">@{profileUser.username} • {followerCount} seguidores</p>
          </div>
          <div className="flex items-center gap-2">
            {currentUser && currentUser.id !== profileUser.id && (
              <button
                onClick={handleFollow}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  isFollowing
                    ? 'bg-bg-elevated border border-border text-white hover:border-danger hover:text-danger'
                    : 'bg-primary hover:bg-primary-hover text-white'
                }`}
              >
                {isFollowing ? <Heart className="w-4 h-4 fill-current" /> : <UserPlus className="w-4 h-4" />}
                {isFollowing ? 'Siguiendo' : 'Seguir'}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary-light'
                  : 'border-transparent text-text-muted hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="pb-8">
          {activeTab === 'inicio' && (
            <div>
              {channel.isLive ? (
                <div className="mb-4">
                  {/* Video + Chat Layout */}
                  <div className="flex flex-col lg:flex-row gap-4 mb-4">
                    {/* Video Player */}
                    <div className="flex-1">
                      <VideoPlayer
                        src={streaming.getPlaybackUrl(channel.slug)}
                        channelName={profileUser.displayName}
                        isLive={true}
                      />
                    </div>

                    {/* Chat Panel */}
                    <div className="w-full lg:w-80 h-[500px] lg:h-auto">
                      <ChatPanel
                        channelId={channel.id}
                        streamId={streaming.getStreamByChannelId(channel.id)?.id || ''}
                        streamerId={profileUser.id}
                      />
                    </div>
                  </div>

                  {/* Stream Info */}
                  <div className="mt-4 bg-bg-card border border-border rounded-xl p-4">
                    {(() => {
                      const stream = streaming.getStreamByChannelId(channel.id);
                      const viewerCount = streaming.getViewerCount(channel.id);
                      return (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <h3 className="text-white font-medium">
                              {stream?.title || `${profileUser.displayName} está en vivo`}
                            </h3>
                            <div className="flex items-center gap-3 mt-1 text-sm text-text-muted">
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                {viewerCount.current} espectadores
                              </span>
                              {stream?.startedAt && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {(() => {
                                    const diff = Math.floor((Date.now() - new Date(stream.startedAt).getTime()) / 60000);
                                    return `${diff} min`;
                                  })()}
                                </span>
                              )}
                            </div>
                          </div>
                          {stream?.tags && stream.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {stream.tags.slice(0, 5).map((tag, i) => (
                                <span key={i} className="text-xs bg-bg-elevated text-text-secondary px-2 py-1 rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
                  <Radio className="w-12 h-12 text-text-muted mx-auto mb-3" />
                  <p className="text-text-secondary text-lg">Canal offline</p>
                  <p className="text-text-muted text-sm mt-1">Este canal no está transmitiendo ahora.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'videos' && (
            <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
              <Video className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary">No hay videos todavía</p>
              <p className="text-text-muted text-sm mt-1">Los videos aparecerán aquí cuando el canal transmita.</p>
            </div>
          )}

          {activeTab === 'clips' && (
            <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
              <Scissors className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary">No hay clips todavía</p>
              <p className="text-text-muted text-sm mt-1">Los clips estarán disponibles próximamente.</p>
            </div>
          )}

          {activeTab === 'acerca' && (
            <div className="bg-bg-card border border-border rounded-xl p-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-text-muted mb-1">Biografía</h3>
                <p className="text-text-secondary">{profileUser.bio || 'Sin biografía.'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-text-muted mb-1">Miembro desde</h3>
                <p className="text-text-secondary">{new Date(profileUser.createdAt).toLocaleDateString('es', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-text-muted mb-1">Seguidores</h3>
                <p className="text-text-secondary">{followerCount}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
