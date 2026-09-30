import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import * as streaming from '../services/streaming';
import * as db from '../services/database';
import type { Stream } from '../types';
import {
  Radio, Play, Square, Activity, AlertTriangle,
  CheckCircle, XCircle, Loader2
} from 'lucide-react';

/**
 * Stream Test Page - Development Only
 * 
 * This page simulates MediaMTX events for testing the streaming UI
 * without needing a real RTMP server. In production, these events
 * would come from MediaMTX webhooks.
 */
export function StreamTestPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [stream, setStream] = useState<Stream | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'starting' | 'live' | 'stopping'>('idle');

  useEffect(() => {
    if (!user) return;
    
    const channel = db.getChannelByUserId(user.id);
    if (!channel) return;

    const s = streaming.getStreamByChannelId(channel.id);
    setStream(s);
    
    if (s?.status === 'LIVE') setStatus('live');
    else if (s?.status === 'STARTING') setStatus('starting');
  }, [user]);

  const handleStartStream = async () => {
    if (!user) return;
    
    setLoading(true);
    setStatus('starting');
    
    try {
      const channel = db.getChannelByUserId(user.id);
      if (!channel) throw new Error('Channel not found');

      // Simulate MediaMTX publish event
      const result = await streaming.handleStreamStarted(user.id, '127.0.0.1');
      
      if (result) {
        setStream(result.stream);
        setStatus('live');
        addToast('success', 'Stream iniciado (simulación)');
        
        // Simulate viewers joining
        setTimeout(() => {
          streaming.incrementViewers(channel.id);
          streaming.incrementViewers(channel.id);
          streaming.incrementViewers(channel.id);
        }, 2000);
      } else {
        throw new Error('Failed to start stream');
      }
    } catch (err: any) {
      addToast('error', err.message);
      setStatus('idle');
    } finally {
      setLoading(false);
    }
  };

  const handleStopStream = async () => {
    if (!user || !stream) return;
    
    setLoading(true);
    setStatus('stopping');
    
    try {
      await streaming.handleStreamStopped(stream.id);
      setStream(null);
      setStatus('idle');
      addToast('info', 'Stream detenido');
    } catch (err: any) {
      addToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Acceso denegado</h1>
        <p className="text-text-secondary">Inicia sesión para acceder a esta página.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 mb-6 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-warning font-medium text-sm">Modo de Prueba</p>
          <p className="text-text-secondary text-sm">
            Esta página simula eventos de streaming para testing sin MediaMTX. 
            En producción, estos eventos vendrán del Media Server real.
          </p>
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Pruebas de Streaming</h1>
        <p className="text-text-secondary">Simula el inicio y finalización de streams</p>
      </div>

      {/* Current Status */}
      <div className="bg-bg-card border border-border rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Estado Actual</h2>
        <div className="flex items-center gap-3">
          {status === 'idle' && (
            <>
              <XCircle className="w-8 h-8 text-text-muted" />
              <div>
                <p className="text-white font-medium">Offline</p>
                <p className="text-text-muted text-sm">No estás transmitiendo</p>
              </div>
            </>
          )}
          {status === 'starting' && (
            <>
              <Loader2 className="w-8 h-8 text-warning animate-spin" />
              <div>
                <p className="text-white font-medium">Iniciando...</p>
                <p className="text-text-muted text-sm">Conectando al media server</p>
              </div>
            </>
          )}
          {status === 'live' && (
            <>
              <div className="relative">
                <div className="w-8 h-8 bg-danger rounded-full flex items-center justify-center">
                  <Radio className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-danger rounded-full animate-pulse" />
              </div>
              <div>
                <p className="text-white font-medium">🔴 EN VIVO</p>
                <p className="text-text-muted text-sm">
                  {stream?.viewerCount || 0} espectadores •{' '}
                  {stream?.startedAt ? `Inició ${new Date(stream.startedAt).toLocaleTimeString()}` : ''}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-bg-card border border-border rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Controles</h2>
        <div className="flex gap-3">
          {status === 'idle' && (
            <button
              onClick={handleStartStream}
              disabled={loading}
              className="flex items-center gap-2 bg-success hover:bg-success/90 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              Iniciar Stream (Simulación)
            </button>
          )}
          {status === 'live' && (
            <button
              onClick={handleStopStream}
              disabled={loading}
              className="flex items-center gap-2 bg-danger hover:bg-danger/90 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Square className="w-5 h-5" />}
              Detener Stream
            </button>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary-light" />
          Cómo probar
        </h2>
        <div className="space-y-3 text-sm text-text-secondary">
          <p>1. Haz clic en "Iniciar Stream" para simular una conexión RTMP</p>
          <p>2. El canal cambiará a estado LIVE automáticamente</p>
          <p>3. Ve a tu canal (<code className="text-primary-light">/channel/{user.username}</code>) para ver el reproductor</p>
          <p>4. Ve a <code className="text-primary-light">/explore</code> para ver el stream en la lista</p>
          <p>5. Haz clic en "Detener Stream" para finalizar la transmisión</p>
        </div>
        <div className="mt-4 p-4 bg-bg-elevated rounded-lg">
          <p className="text-xs text-text-muted">
            <strong className="text-white">Nota:</strong> En producción con MediaMTX, estos eventos se disparan automáticamente 
            cuando OBS se conecta/desconecta del servidor RTMP.
          </p>
        </div>
      </div>
    </div>
  );
}
