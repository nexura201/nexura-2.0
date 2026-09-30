import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as searchService from '../services/search';
import type { SearchResult } from '../services/search';
import {
  Search as SearchIcon, Radio, Video, Scissors, Users,
  TrendingUp, Eye, Clock, Play
} from 'lucide-react';

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { user } = useAuth();
  
  const [results, setResults] = useState<SearchResult | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(query);

  useEffect(() => {
    if (query) {
      setLoading(true);
      // Simular búsqueda asíncrona
      setTimeout(() => {
        const searchResults = searchService.search(query);
        setResults(searchResults);
        setLoading(false);
      }, 100);
    }
  }, [query]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const suggs = searchService.getSearchSuggestions(searchQuery);
      setSuggestions(suggs);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const totalResults = results
    ? results.channels.length + results.streams.length + results.videos.length + results.clips.length
    : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="relative">
          <div className="flex items-center bg-bg-input border border-border rounded-xl px-4 py-3 focus-within:border-primary transition-colors">
            <SearchIcon className="w-5 h-5 text-text-muted mr-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar canales, streams, videos, clips..."
              className="flex-1 bg-transparent text-white placeholder-text-muted outline-none"
              autoFocus
            />
          </div>
          
          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-bg-card border border-border rounded-xl shadow-xl overflow-hidden z-10">
              {suggestions.map((suggestion, idx) => (
                <Link
                  key={idx}
                  to={`/search?q=${encodeURIComponent(suggestion)}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-bg-elevated transition-colors"
                >
                  <SearchIcon className="w-4 h-4 text-text-muted" />
                  <span className="text-white">{suggestion}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </form>

      {/* Results */}
      {query && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">
              Resultados para "{query}"
            </h1>
            <p className="text-text-secondary">
              {loading ? 'Buscando...' : `${totalResults} resultados encontrados`}
            </p>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton h-24 rounded-xl" />
              ))}
            </div>
          ) : totalResults === 0 ? (
            <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
              <SearchIcon className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">No encontramos resultados</h2>
              <p className="text-text-secondary">
                Intenta con otros términos o explora las categorías populares.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Streams */}
              {results!.streams.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Radio className="w-5 h-5 text-danger" />
                    En Vivo
                  </h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {results!.streams.map(({ item: stream, channel, user: streamUser }) => (
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
                    ))}
                  </div>
                </section>
              )}

              {/* Channels */}
              {results!.channels.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary-light" />
                    Canales
                  </h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {results!.channels.map(({ item: channelUser, channel }) => (
                      <Link
                        key={channel.id}
                        to={`/channel/${channel.slug}`}
                        className="bg-bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-lg font-bold text-white overflow-hidden">
                            {channelUser.avatarUrl ? (
                              <img src={channelUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              channelUser.displayName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{channelUser.displayName}</p>
                            <p className="text-xs text-text-muted">@{channelUser.username}</p>
                          </div>
                        </div>
                        {channelUser.bio && (
                          <p className="text-xs text-text-secondary mt-3 line-clamp-2">{channelUser.bio}</p>
                        )}
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Videos */}
              {results!.videos.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Video className="w-5 h-5 text-primary-light" />
                    Videos
                  </h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {results!.videos.map(({ item: video, channel, user: videoUser }) => (
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
                    ))}
                  </div>
                </section>
              )}

              {/* Clips */}
              {results!.clips.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-warning" />
                    Clips
                  </h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {results!.clips.map(({ item: clip, channel, user: clipUser }) => (
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
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      )}

      {!query && (
        <div className="text-center py-20">
          <SearchIcon className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Busca en NEXURA</h2>
          <p className="text-text-secondary">
            Encuentra canales, streams en vivo, videos y clips.
          </p>
        </div>
      )}
    </div>
  );
}
