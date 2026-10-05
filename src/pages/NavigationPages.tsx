import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as db from '../services/database';
import * as streaming from '../services/streaming';
import {
  Compass, Grid3X3, Heart, Library, Play, Radio,
  Users, TrendingUp, Search, Gamepad2, Code, Music,
  Palette, BookOpen, Dumbbell, Sparkles
} from 'lucide-react';

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

export function CategoriesPage() {
  const categories = [
    { name: 'Gaming', icon: Gamepad2, channels: 0, color: 'from-primary-hover/20 to-primary/20' },
    { name: 'Programación', icon: Code, channels: 0, color: 'from-success/20 to-accent/20' },
    { name: 'Música', icon: Music, channels: 0, color: 'from-pink-500/20 to-error/20' },
    { name: 'Arte', icon: Palette, channels: 0, color: 'from-orange-500/20 to-warning/20' },
    { name: 'Educación', icon: BookOpen, channels: 0, color: 'from-primary/20 to-primary/20' },
    { name: 'Deportes', icon: Dumbbell, channels: 0, color: 'from-error/20 to-orange-500/20' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Categorías</h1>
        <p className="text-text-secondary">Explora contenido por categoría</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat, i) => (
          <div
            key={i}
            className={`bg-gradient-to-br ${cat.color} border border-border rounded-xl p-6 hover:border-primary/30 transition-all cursor-pointer group`}
          >
            <cat.icon className="w-10 h-10 text-white/80 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-semibold text-white mb-1">{cat.name}</h3>
            <p className="text-sm text-text-muted">{cat.channels} canales activos</p>
          </div>
        ))}

        {/* Tarjeta NEXURA IA — solo visual */}
        <div className="bg-gradient-to-br from-primary/20 to-accent/20 border border-border rounded-xl p-6 hover:border-primary/30 transition-all cursor-pointer group">
          <Sparkles className="w-10 h-10 text-white/80 mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-semibold text-white mb-1">NEXURA IA</h3>
          <p className="text-sm text-text-muted">PRÓXIMAMENTE</p>
        </div>
      </div>
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
