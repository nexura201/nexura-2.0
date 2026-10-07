import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as db from '../services/database';
import * as streaming from '../services/streaming';
import * as categoryService from '../services/category';
import * as videoService from '../services/video';
import * as clipService from '../services/clip';
import type { Category, CategoryContentCounts } from '../services/category';
import {
  Compass, Grid3X3, Heart, Library, Play, Radio,
  Users, TrendingUp, Search, Gamepad2, MessageCircle, Music,
  Trophy, Cpu, Globe, Drama, Palette, UtensilsCrossed,
  Sparkles, X, ArrowRight, Video
} from 'lucide-react';

/**
 * Mapeo de slug de categoría -> icono Lucide + acento visual.
 * El fallback usa el emoji guardado en la categoría (compatible con
 * el servicio existente de categorías).
 */
const CATEGORY_ICON_MAP: Record<string, { icon: React.ComponentType<{ className?: string }>; accent: string }> = {
  gaming: { icon: Gamepad2, accent: 'from-primary/25 via-primary/10 to-transparent' },
  'just-chatting': { icon: MessageCircle, accent: 'from-accent/25 via-primary/10 to-transparent' },
  musica: { icon: Music, accent: 'from-primary-hover/25 via-accent/10 to-transparent' },
  deportes: { icon: Trophy, accent: 'from-success/20 via-primary/10 to-transparent' },
  tecnologia: { icon: Cpu, accent: 'from-accent/25 via-surface-2/40 to-transparent' },
  irl: { icon: Globe, accent: 'from-primary/20 via-surface-2/40 to-transparent' },
  entretenimiento: { icon: Drama, accent: 'from-warning/20 via-primary/10 to-transparent' },
  arte: { icon: Palette, accent: 'from-error/20 via-warning/10 to-transparent' },
  'arte-y-creatividad': { icon: Palette, accent: 'from-error/20 via-warning/10 to-transparent' },
  cocina: { icon: UtensilsCrossed, accent: 'from-warning/25 via-error/10 to-transparent' },
  educacion: { icon: Library, accent: 'from-primary/25 via-accent/10 to-transparent' },
  noticias: { icon: Compass, accent: 'from-surface-2/60 via-primary/10 to-transparent' },
};

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

interface CategoryCardProps {
  category: Category;
  counts?: CategoryContentCounts;
}

function CategoryCard({ category, counts }: CategoryCardProps) {
  const mapped = CATEGORY_ICON_MAP[category.slug];
  const Icon = mapped?.icon;

  const liveCount = counts?.liveStreams ?? 0;
  const channelCount = counts?.channels ?? 0;
  const contentCount = counts?.total ?? 0;

  return (
    <Link
      to={`/category/${category.slug}`}
      aria-label={`Ver categoría ${category.name}`}
      className="group relative block overflow-hidden rounded-2xl border border-border bg-bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_16px_48px_-16px_rgba(22,119,255,0.4)]"
    >
      {/* Acento visual superior */}
      <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br opacity-60 transition-opacity duration-300 group-hover:opacity-100 ${mapped?.accent ?? 'from-primary/20 via-surface-2/40 to-transparent'}`} />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative p-5 sm:p-6">
        {/* Icono + estado en vivo */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-2 text-primary transition-all duration-300 group-hover:scale-105 group-hover:border-primary/40 group-hover:text-primary-hover">
            {Icon ? (
              <Icon className="h-6 w-6" />
            ) : (
              <span className="text-2xl leading-none" aria-hidden>{category.icon}</span>
            )}
          </div>
          {liveCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger/10 px-2.5 py-1 text-[11px] font-semibold text-error">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
              </span>
              {liveCount} EN VIVO
            </span>
          )}
        </div>

        {/* Nombre y descripcion */}
        <h3 className="text-base font-semibold text-white mb-1 transition-colors duration-200 group-hover:text-primary-hover">
          {category.name}
        </h3>
        <p className="text-sm text-secondary line-clamp-2 min-h-[2.5rem]">
          {category.description}
        </p>

        {/* Estadisticas */}
        <div className="mt-4 flex items-center gap-4 text-xs text-secondary">
          <span className="flex items-center gap-1.5">
            <Video className="h-3.5 w-3.5 text-text-muted" />
            {contentCount.toLocaleString('es')} videos y clips
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-text-muted" />
            {channelCount.toLocaleString('es')} canales
          </span>
        </div>

        {/* CTA al hacer hover */}
        <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary opacity-0 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0">
          Explorar categoría
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </Link>
  );
}

function NexuraIACard() {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!showModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showModal]);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        aria-label="NEXURA IA — Próximamente. Ver información"
        className="group relative block w-full overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-surface-2 via-bg-card to-surface-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-300 hover:-translate-y-1 hover:border-primary/70 hover:shadow-[0_16px_48px_-16px_rgba(22,119,255,0.55)]"
      >
        {/* Resplandor sutil de funcion futura */}
        <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl transition-opacity duration-500 group-hover:opacity-100 opacity-70" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

        <div className="relative p-5 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/40 bg-primary/15 text-primary-hover transition-transform duration-300 group-hover:scale-105">
              <Sparkles className="h-6 w-6" />
            </div>
            <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-hover animate-pulse">
              Próximamente
            </span>
          </div>

          <h3 className="text-base font-bold text-white mb-1">
            NEXURA IA
          </h3>
          <p className="text-sm text-secondary line-clamp-2 min-h-[2.5rem]">
            Una nueva generación de herramientas inteligentes para creadores y comunidades de NEXURA.
          </p>

          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary">
            Ver información
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        </div>
      </button>

      {/* Modal informativo */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="nexura-ia-modal-title"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-primary/30 bg-surface-2 p-6 shadow-[0_24px_80px_-24px_rgba(22,119,255,0.5)]">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              aria-label="Cerrar"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-text-muted transition-colors hover:text-white hover:border-primary/40"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/40 bg-primary/15 text-primary-hover">
              <Sparkles className="h-6 w-6" />
            </div>

            <span className="inline-block rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary-hover mb-3">
              En desarrollo
            </span>

            <h4 id="nexura-ia-modal-title" className="text-lg font-bold text-white mb-2">
              NEXURA IA — Próximamente
            </h4>
            <p className="text-sm text-secondary leading-relaxed mb-5">
              Estamos construyendo una nueva generación de herramientas inteligentes
              para creadores y comunidades de NEXURA. Estará disponible muy pronto.
            </p>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-2"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function CategoriesPage() {
  // Asegurar categorias base sin duplicar las existentes (servicio actual)
  useEffect(() => {
    categoryService.ensureDefaultCategories();
  }, []);

  const categories = useMemo(() => categoryService.getAllCategories(), []);
  const countsByCategory = useMemo(
    () =>
      categoryService.getContentCountsByCategory({
        categories,
        channels: db.getAllChannels(),
        streams: streaming.getAllActiveStreams(),
        videos: videoService.getAllVideos(),
        clips: clipService.getAllClips(),
      }),
    [categories]
  );

  const totalLive = Object.values(countsByCategory).reduce((acc, c) => acc + c.liveStreams, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Grid3X3 className="w-6 h-6 text-primary" />
          Categorías
        </h1>
        <p className="text-text-secondary">
          Explora el contenido de NEXURA por categoría
          {totalLive > 0 && (
            <span className="ml-2 inline-flex items-center gap-1.5 text-error text-sm font-medium">
              <Radio className="w-3.5 h-3.5" />
              {totalLive} en vivo ahora
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {/* Tarjeta destacada NEXURA IA — Proximamente */}
        <NexuraIACard />

        {categories.map(cat => (
          <CategoryCard key={cat.id} category={cat} counts={countsByCategory[cat.id]} />
        ))}
      </div>

      {categories.length === 0 && (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center mt-2">
          <TrendingUp className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary">No hay categorías disponibles en este momento.</p>
        </div>
      )}
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
