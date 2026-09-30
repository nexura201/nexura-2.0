import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import * as streaming from '../services/streaming';
import * as db from '../services/database';
import type { Stream } from '../types';
import {
  Radio, Users, Clock, TrendingUp, Activity,
  Square, Link as LinkIcon, Copy, Check, AlertCircle
} from 'lucide-react';

export function StreamLivePanel() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [stream, setStream] = useState<Stream | null>(null);
  const [elapsed, setElapsed] = useState('00:00:00');
  const [viewerCount, setViewerCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const channel = db.getChannelByUserId(user.id);
    if (!channel) return;

    const loadStream = () => {
      const s = streaming.getStreamByChannelId(channel.id);
      setStream(s);
      
      if (s && (s.status === 'LIVE' || s.status === 'STARTING')) {
        const vc = streaming.getViewerCount(channel.id);
        setViewerCount(vc.current);
      }
    };

    loadStream();
    const interval = setInterval(loadStream, 3000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!stream?.startedAt) return;

    const updateElapsed = () => {
      const start = new Date(stream.startedAt!).getTime();
      const now = Date.now();
      const diff = Math.floor((now - start) / 1000);
      
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      
      setElapsed(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [stream?.startedAt]);

  const handleCopyStreamUrl = () => {
    if (user) {
      const channel = db.getChannelByUserId(user.id);
      if (channel) {
        const url = `${window.location.origin}/channel/${channel.slug}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        addToast('success', 'Enlace del stream copiado');
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  if (!stream || (stream.status !== 'LIVE' && stream.status !== 'STARTING')) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-danger/10 to-danger/5 border border-danger/20 rounded-xl p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 bg-danger rounded-xl flex items-center justify-center">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-danger rounded-full animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              🔴 ESTÁS EN VIVO
            </h2>
            <p className="text-text-secondary text-sm">Tu transmisión está activa</p>
          </div>
        </div>
        <button
          onClick={handleCopyStreamUrl}
          className="flex items-center gap-2 px-4 py-2 bg-bg-elevated border border-border rounded-lg text-sm text-text-secondary hover:text-white transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-success" /> : <LinkIcon className="w-4 h-4" />}
          {copied ? 'Copiado' : 'Compartir stream'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-bg-elevated/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-text-muted text-xs mb-1">
            <Activity className="w-3.5 h-3.5" />
            Estado
          </div>
          <p className="text-white font-medium">
            {stream.status === 'LIVE' ? 'En vivo' : 'Iniciando...'}
          </p>
        </div>
        <div className="bg-bg-elevated/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-text-muted text-xs mb-1">
            <Clock className="w-3.5 h-3.5" />
            Tiempo
          </div>
          <p className="text-white font-medium font-mono">{elapsed}</p>
        </div>
        <div className="bg-bg-elevated/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-text-muted text-xs mb-1">
            <Users className="w-3.5 h-3.5" />
            Espectadores
          </div>
          <p className="text-white font-medium">{viewerCount}</p>
        </div>
        <div className="bg-bg-elevated/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-text-muted text-xs mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Pico
          </div>
          <p className="text-white font-medium">{stream.peakViewerCount}</p>
        </div>
      </div>

      {stream.title && (
        <div className="bg-bg-elevated/50 rounded-lg p-3 mb-4">
          <p className="text-xs text-text-muted mb-1">Título</p>
          <p className="text-white font-medium">{stream.title}</p>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-text-muted">
        <AlertCircle className="w-3.5 h-3.5" />
        El stream finalizará automáticamente cuando desconectes OBS
      </div>
    </div>
  );
}
