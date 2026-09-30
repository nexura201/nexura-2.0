import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as categoryService from '../services/category';
import * as streaming from '../services/streaming';
import * as videoService from '../services/video';
import * as clipService from '../services/clip';
import * as db from '../services/database';
import type { Category } from '../services/category';
import {
  Radio, Video, Scissors, Eye, Clock, Play, Users, TrendingUp
} from 'lucide-react';

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [streams, setStreams] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [clips, setClips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      const cat = categoryService.getCategoryBySlug(slug);
      if (cat) {
        setCategory(cat);
        
        // Get streams in this category (simplified - in production, filter by categoryId)
        const activeStreams = streaming.getAllActiveStreams();
        setStreams(activeStreams.slice(0, 8));
        
        // Get videos (simplified)
        const allVideos = videoService.getAllVideos();
        setVideos(allVideos.slice(0, 8));
        
        // Get clips (simplified)
        const allClips = clipService.getAllClips();
        setClips(allClips.slice(0, 8));
      }
      setLoading(false);
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="skeleton h-32 rounded-xl mb-6" />
        <div className="skeleton h-8 w-48 mb-4" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton aspect-video rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Categoría no encontrada</h1>
        <p className="text-text-secondary">La categoría "{slug}" no existe.</p>
        <Link to="/categories" className="text-primary-light hover:text-primary mt-4 inline-block">
          Ver todas las categorías
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Category Header */}
      <div className="bg-gradient-to-r from-primary/20 to-primary-light/10 border border-border rounded-xl p-8 mb-8">
        <div className="flex items-center gap-4">
          <div className="text-6xl">{category.icon}</div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{category.name}</h1>
            <p className="text-text-secondary">{category.description}</p>
          </div>
        </div>
      </div>

      {/* Live Streams */}
      {streams.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Radio className="w-5 h-5 text-danger" />
            En Vivo Ahora
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {streams.map(stream => {
              const channel = db.getAllChannels().find(c => c.id === stream.channelId);
              const streamUser = channel ? db.getUserById(channel.userId) : null;
              
              if (!channel || !streamUser) return null;
              
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
                      <Eye className="w-3 h-3" />
                      {stream.viewerCount}
                    </div>
                    <Play className="w-10 h-10 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-white truncate">
                      {stream.title || `${streamUser.displayName} está en vivo`}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white">
                        {streamUser.displayName.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-xs text-text-muted truncate">{streamUser.displayName}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Video className="w-5 h-5 text-primary-light" />
            Videos
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map(video => {
              const channel = db.getAllChannels().find(c => c.id === video.channelId);
              const videoUser = channel ? db.getUserById(channel.userId) : null;
              
              if (!channel || !videoUser) return null;
              
              return (
                <Link
                  key={video.id}
                  to={`/video/${video.id}`}
                  className="bg-bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all group"
                >
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary-light/10 flex items-center justify-center relative">
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                      {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                    </div>
                    <Play className="w-10 h-10 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-white truncate">{video.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white">
                        {videoUser.displayName.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-xs text-text-muted truncate">{videoUser.displayName}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {video.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(video.publishedAt || video.createdAt).toLocaleDateString('es')}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Clips */}
      {clips.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Scissors className="w-5 h-5 text-warning" />
            Clips
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {clips.map(clip => {
              const channel = db.getAllChannels().find(c => c.id === clip.channelId);
              const clipUser = channel ? db.getUserById(channel.userId) : null;
              
              if (!channel || !clipUser) return null;
              
              return (
                <Link
                  key={clip.id}
                  to={`/clip/${clip.id}`}
                  className="bg-bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all group"
                >
                  <div className="aspect-video bg-gradient-to-br from-warning/20 to-warning/10 flex items-center justify-center relative">
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                      {clip.duration}s
                    </div>
                    <Scissors className="w-10 h-10 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-white truncate">{clip.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white">
                        {clipUser.displayName.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-xs text-text-muted truncate">{clipUser.displayName}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {clip.views}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {streams.length === 0 && videos.length === 0 && clips.length === 0 && (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
          <TrendingUp className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No hay contenido en esta categoría</h2>
          <p className="text-text-secondary">
            Sé el primero en transmitir o subir contenido en {category.name}.
          </p>
        </div>
      )}
    </div>
  );
}
