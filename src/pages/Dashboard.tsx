import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as db from '../services/database';
import * as streaming from '../services/streaming';
import * as chatService from '../services/chat';
import { StreamLivePanel } from '../components/StreamLivePanel';
import {
  Users, UserPlus, Radio, Eye, Clock, TrendingUp,
  Settings, Edit, BarChart3, Activity, Video, MessageCircle,
  Shield, Ban
} from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  const followerCount = db.getFollowerCount(user.id);
  const followingCount = db.getFollowingCount(user.id);
  const channel = db.getChannelByUserId(user.id);

  const stats = [
    {
      icon: Users,
      label: 'Seguidores',
      value: followerCount,
      color: 'text-primary-light',
      bgColor: 'bg-primary/10',
    },
    {
      icon: UserPlus,
      label: 'Siguiendo',
      value: followingCount,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      icon: Radio,
      label: 'Estado del canal',
      value: channel?.isLive ? 'En vivo' : 'Offline',
      color: channel?.isLive ? 'text-success' : 'text-text-muted',
      bgColor: channel?.isLive ? 'bg-success/10' : 'bg-bg-elevated',
    },
    {
      icon: Eye,
      label: 'Visualizaciones',
      value: '0',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      icon: Clock,
      label: 'Horas transmitidas',
      value: '0',
      color: 'text-primary-light',
      bgColor: 'bg-primary/10',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Bienvenido, <span className="text-primary-light">@{user.username}</span>
          </h1>
          <p className="text-text-secondary mt-1">Aquí tienes un resumen de tu canal</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/settings"
            className="flex items-center gap-2 px-4 py-2 bg-bg-elevated border border-border rounded-lg text-sm text-text-secondary hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
            Configuración
          </Link>
          <Link
            to={`/u/${user.username}`}
            className="flex items-center gap-2 px-4 py-2 bg-bg-elevated border border-border rounded-lg text-sm text-text-secondary hover:text-white transition-colors"
          >
            <Edit className="w-4 h-4" />
            Ver perfil
          </Link>
        </div>
      </div>

      {/* Live Stream Panel */}
      <StreamLivePanel />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-bg-card border border-border rounded-xl p-4">
            <div className={`w-10 h-10 ${stat.bgColor} rounded-lg flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Link
          to="/settings"
          className="bg-bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-all group"
        >
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
            <Edit className="w-6 h-6 text-primary-light" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Editar perfil</h3>
          <p className="text-sm text-text-muted">Personaliza tu avatar, banner y biografía</p>
        </Link>

        <Link
          to={`/channel/${user.username}`}
          className="bg-bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-all group"
        >
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
            <Radio className="w-6 h-6 text-primary-light" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Mi canal</h3>
          <p className="text-sm text-text-muted">Ve tu canal público y su configuración</p>
        </Link>

        <Link
          to="/dashboard/stream"
          className="bg-bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-all group"
        >
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
            <Video className="w-6 h-6 text-primary-light" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Configurar Stream</h3>
          <p className="text-sm text-text-muted">Obtén tu Stream Key y configura OBS</p>
        </Link>
      </div>

      {/* Channel Info */}
      <div className="bg-bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary-light" />
          Información del canal
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-bg-elevated rounded-lg p-4">
            <p className="text-sm text-text-muted mb-1">Título del canal</p>
            <p className="text-white font-medium">{channel?.title || 'Sin título'}</p>
          </div>
          <div className="bg-bg-elevated rounded-lg p-4">
            <p className="text-sm text-text-muted mb-1">Slug</p>
            <p className="text-white font-medium">/{channel?.slug}</p>
          </div>
          <div className="bg-bg-elevated rounded-lg p-4">
            <p className="text-sm text-text-muted mb-1">Creado</p>
            <p className="text-white font-medium">
              {channel ? new Date(channel.createdAt).toLocaleDateString('es') : '-'}
            </p>
          </div>
          <div className="bg-bg-elevated rounded-lg p-4">
            <p className="text-sm text-text-muted mb-1">Estado</p>
            <p className={`font-medium ${channel?.isLive ? 'text-success' : 'text-text-muted'}`}>
              {channel?.isLive ? '🟢 En vivo' : '⚪ Offline'}
            </p>
          </div>
        </div>
      </div>

      {/* Chat Controls */}
      {channel && (
        <ChatControls channelId={channel.id} />
      )}
    </div>
  );
}

function ChatControls({ channelId }: { channelId: string }) {
  const { user } = useAuth();
  const [chatSettings, setChatSettings] = React.useState(chatService.getChatSettings(channelId));
  const [moderators, setModerators] = React.useState(chatService.getChannelModerators(channelId));
  const [bans, setBans] = React.useState(chatService.getChannelBans(channelId));

  if (!user) return null;

  const handleSlowModeChange = (value: number) => {
    const result = chatService.updateChatSettings(channelId, { slowMode: value }, user.id);
    if (!('error' in result)) {
      setChatSettings(result);
    }
  };

  const handleFollowersOnlyChange = (enabled: boolean) => {
    const result = chatService.updateChatSettings(channelId, { followersOnly: enabled }, user.id);
    if (!('error' in result)) {
      setChatSettings(result);
    }
  };

  return (
    <div className="bg-bg-card border border-border rounded-xl p-6 mt-6">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-primary-light" />
        Controles del Chat
      </h2>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Slow Mode */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Slow Mode
          </label>
          <select
            value={chatSettings.slowMode}
            onChange={e => handleSlowModeChange(Number(e.target.value))}
            className="w-full bg-bg-input border border-border rounded-lg px-4 py-2 text-white outline-none focus:border-primary transition-colors"
          >
            <option value={0}>Desactivado</option>
            <option value={5}>5 segundos</option>
            <option value={10}>10 segundos</option>
            <option value={30}>30 segundos</option>
            <option value={60}>1 minuto</option>
          </select>
          <p className="text-xs text-text-muted mt-1">
            Limita la frecuencia de mensajes de los usuarios
          </p>
        </div>

        {/* Followers Only */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Solo Seguidores
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleFollowersOnlyChange(!chatSettings.followersOnly)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                chatSettings.followersOnly ? 'bg-primary' : 'bg-bg-input border border-border'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  chatSettings.followersOnly ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-white">
              {chatSettings.followersOnly ? 'Activado' : 'Desactivado'}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Solo los seguidores pueden escribir en el chat
          </p>
        </div>

        {/* Moderators */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Moderadores ({moderators.length})
          </label>
          <Link
            to="/dashboard/moderators"
            className="flex items-center gap-2 text-sm text-primary-light hover:text-primary transition-colors"
          >
            <Shield className="w-4 h-4" />
            Gestionar moderadores
          </Link>
        </div>

        {/* Bans */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Usuarios Baneados ({bans.length})
          </label>
          <Link
            to="/dashboard/bans"
            className="flex items-center gap-2 text-sm text-primary-light hover:text-primary transition-colors"
          >
            <Ban className="w-4 h-4" />
            Ver lista de baneados
          </Link>
        </div>
      </div>
    </div>
  );
}
