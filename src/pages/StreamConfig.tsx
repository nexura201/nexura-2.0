import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import * as streaming from '../services/streaming';
import * as db from '../services/database';
import { isDemoRtmpUrl } from '../config/streaming';
import {
  Radio, Key, Copy, RefreshCw, Eye, EyeOff, AlertTriangle,
  Check, Settings, Monitor, Play, Info
} from 'lucide-react';

export function StreamConfigPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [streamConfig, setStreamConfig] = useState<{ rtmpServerUrl: string; hlsPlaybackUrl: string } | null>(null);
  const [streamKey, setStreamKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState<'server' | 'key' | null>(null);
  const [streamTitle, setStreamTitle] = useState('');
  const [streamCategory, setStreamCategory] = useState('');
  const [streamTags, setStreamTags] = useState('');
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      const channel = db.getChannelByUserId(user.id);
      if (channel) {
        const config = streaming.getStreamConfig(user.id);
        setStreamConfig(config);
        
        // Ensure the channel has a Stream Key (idempotent: reuses the existing
        // key if present, generates one only on first access). Safe to call on
        // every mount/reload — never regenerates an existing key.
        const key = streaming.ensureStreamKey(channel.id);
        setStreamKey(key);
        
        // Get current stream info
        const stream = streaming.getStreamByChannelId(channel.id);
        if (stream) {
          setStreamTitle(stream.title);
          setStreamCategory(stream.categoryId || '');
          setStreamTags(stream.tags.join(', '));
        }
      }
    }
  }, [user]);

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      // Fallback for non-secure contexts (e.g. plain http in local dev)
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  };

  const handleCopyServer = async () => {
    if (!streamConfig) return;
    const ok = await copyToClipboard(streamConfig.rtmpServerUrl);
    if (ok) {
      setCopied('server');
      addToast('success', 'URL del servidor copiada');
      setTimeout(() => setCopied(null), 2000);
    } else {
      addToast('error', 'No se pudo copiar al portapapeles. Seleccioná el texto manualmente.');
    }
  };

  const handleCopyKey = async () => {
    if (!streamKey) return;
    const ok = await copyToClipboard(streamKey);
    if (ok) {
      setCopied('key');
      addToast('success', 'Stream Key copiada');
      setTimeout(() => setCopied(null), 2000);
    } else {
      addToast('error', 'No se pudo copiar al portapapeles. Mostrá la clave y seleccioná el texto manualmente.');
    }
  };

  const handleRegenerateConfirmed = () => {
    if (!user) return;
    const channel = db.getChannelByUserId(user.id);
    if (!channel) return;
    try {
      streaming.regenerateStreamKey(channel.id);
      const newKey = streaming.getStreamKeyForDisplay(channel.id);
      setStreamKey(newKey);
      setShowKey(false);
      setShowRegenerateConfirm(false);
      addToast('success', 'Stream Key regenerada. Actualizala en OBS/Streamlabs.');
    } catch {
      setShowRegenerateConfirm(false);
      addToast('error', 'No se pudo regenerar la Stream Key. Intentá de nuevo.');
    }
  };

  const handleSaveStreamInfo = () => {
    if (user) {
      const channel = db.getChannelByUserId(user.id);
      if (channel) {
        const stream = streaming.getStreamByChannelId(channel.id);
        if (stream) {
          streaming.updateStream(stream.id, {
            title: streamTitle,
            categoryId: streamCategory || null,
            tags: streamTags.split(',').map(t => t.trim()).filter(t => t),
          });
          addToast('success', 'Información del stream actualizada');
        } else {
          addToast('info', 'Esta configuración se aplicará cuando inicies una transmisión');
        }
      }
    }
  };

  if (!user || !streamConfig) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center text-text-secondary">Cargando configuración...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Configuración de Streaming</h1>
        <p className="text-text-secondary">Configura OBS y comienza a transmitir</p>
      </div>

      {/* Stream Info */}
      <div className="bg-bg-card border border-border rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary-light" />
          Información del Stream
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Título</label>
            <input
              type="text"
              value={streamTitle}
              onChange={e => setStreamTitle(e.target.value)}
              placeholder="Ej: Jugando GTA V con seguidores"
              className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-white placeholder-text-muted outline-none focus:border-primary transition-colors"
              maxLength={100}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Categoría</label>
            <select
              value={streamCategory}
              onChange={e => setStreamCategory(e.target.value)}
              className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-white outline-none focus:border-primary transition-colors"
            >
              <option value="">Seleccionar categoría</option>
              <option value="gaming">Gaming</option>
              <option value="programming">Programación</option>
              <option value="music">Música</option>
              <option value="art">Arte</option>
              <option value="education">Educación</option>
              <option value="sports">Deportes</option>
              <option value="just-chatting">Just Chatting</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Tags</label>
            <input
              type="text"
              value={streamTags}
              onChange={e => setStreamTags(e.target.value)}
              placeholder="Ej: gaming, español, gta (separados por comas)"
              className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-white placeholder-text-muted outline-none focus:border-primary transition-colors"
            />
            <p className="text-xs text-text-muted mt-1">Máximo 10 tags, separados por comas</p>
          </div>
          <button
            onClick={handleSaveStreamInfo}
            className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Guardar configuración
          </button>
        </div>
      </div>

      {/* Server Configuration */}
      <div className="bg-bg-card border border-border rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Monitor className="w-5 h-5 text-primary-light" />
          Servidor RTMP
          {isDemoRtmpUrl(streamConfig.rtmpServerUrl) && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-warning/15 text-warning px-2 py-0.5 rounded-full">Demo</span>
          )}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">URL del Servidor</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={streamConfig.rtmpServerUrl}
                readOnly
                className="flex-1 bg-bg-input border border-border rounded-lg px-4 py-2.5 text-white font-mono text-sm"
              />
              <button
                onClick={handleCopyServer}
                className="px-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-text-secondary hover:text-white transition-colors flex items-center gap-2"
              >
                {copied === 'server' ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                {copied === 'server' ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
          {isDemoRtmpUrl(streamConfig.rtmpServerUrl) && (
            <p className="text-xs text-text-muted flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>
                Esta es una URL de ejemplo local, no un servidor real. La infraestructura RTMP/HLS se configura por separado mediante{' '}
                <code className="bg-bg-elevated px-1 rounded">VITE_RTMP_SERVER_URL</code> / <code className="bg-bg-elevated px-1 rounded">VITE_HLS_BASE_URL</code>{' '}
                o desde Owner → Servers. Copiar esta clave a OBS no iniciará una transmisión hasta que exista infraestructura configurada.
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Stream Key */}
      <div className="bg-bg-card border border-border rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-primary-light" />
          Stream Key
        </h2>
        <div className="space-y-4">
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-warning font-medium text-sm">Importante</p>
              <p className="text-text-secondary text-sm">
                Tu Stream Key es privada. Nunca la compartas con nadie. Si crees que ha sido comprometida, regenérala inmediatamente.
              </p>
            </div>
          </div>

          <p className="text-xs text-text-muted flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>La URL del servidor de streaming se configura por separado. Esta clave identifica tu canal ante el servidor RTMP que utilices (OBS, Streamlabs u otro compatible).</span>
          </p>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Tu Stream Key</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={streamKey || ''}
                  readOnly
                  className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-white font-mono text-sm pr-10"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={handleCopyKey}
                disabled={!streamKey}
                className="px-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-text-secondary hover:text-white transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {copied === 'key' ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                {copied === 'key' ? 'Copiado' : 'Copiar'}
              </button>
              <button
                onClick={() => setShowRegenerateConfirm(true)}
                className="px-4 py-2.5 bg-danger/10 border border-danger/20 rounded-lg text-danger hover:bg-danger/20 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* OBS Setup Guide */}
      <div className="bg-bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Play className="w-5 h-5 text-primary-light" />
          Cómo transmitir con OBS
        </h2>
        <div className="space-y-3 text-sm text-text-secondary">
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary-light rounded-full flex items-center justify-center text-xs font-bold">1</span>
            <p>Abre OBS Studio y ve a <strong className="text-white">Ajustes → Emisión</strong></p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary-light rounded-full flex items-center justify-center text-xs font-bold">2</span>
            <p>En <strong className="text-white">Servicio</strong>, selecciona <strong className="text-white">Personalizado...</strong></p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary-light rounded-full flex items-center justify-center text-xs font-bold">3</span>
            <p>Copia la <strong className="text-white">URL del Servidor</strong> y pégala en el campo <strong className="text-white">Servidor</strong></p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary-light rounded-full flex items-center justify-center text-xs font-bold">4</span>
            <p>Copia tu <strong className="text-white">Stream Key</strong> y pégala en el campo <strong className="text-white">Clave de retransmisión</strong></p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary-light rounded-full flex items-center justify-center text-xs font-bold">5</span>
            <p>Haz clic en <strong className="text-white">Iniciar transmisión</strong> en OBS</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary-light rounded-full flex items-center justify-center text-xs font-bold">6</span>
            <p>¡Listo! Tu canal aparecerá como <strong className="text-success">EN VIVO</strong> automáticamente</p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-bg-elevated rounded-lg">
          <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
            <Info className="w-4 h-4 text-primary-light" />
            Configuración recomendada para pruebas
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs text-text-secondary">
            <div>
              <span className="text-text-muted">Resolución:</span> 1280x720
            </div>
            <div>
              <span className="text-text-muted">FPS:</span> 30
            </div>
            <div>
              <span className="text-text-muted">Bitrate:</span> 3500-5000 Kbps
            </div>
            <div>
              <span className="text-text-muted">Codec:</span> H.264
            </div>
            <div>
              <span className="text-text-muted">Audio:</span> AAC
            </div>
            <div>
              <span className="text-text-muted">Keyframe:</span> 2s
            </div>
          </div>
        </div>
      </div>

      {/* Regenerate confirmation modal */}
      {showRegenerateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="regenerate-key-title">
          <div className="bg-bg-card border border-border rounded-xl p-6 max-w-md w-full">
            <h3 id="regenerate-key-title" className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              ¿Regenerar tu Stream Key?
            </h3>
            <ul className="text-sm text-text-secondary space-y-2 mb-5 list-disc pl-4">
              <li>La clave actual dejará de ser la utilizada por NEXURA.</li>
              <li>Deberás actualizarla en <strong className="text-white">OBS / Streamlabs</strong> antes de volver a transmitir.</li>
              <li>Cualquier transmisión activa con la clave anterior quedará sin efecto.</li>
            </ul>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRegenerateConfirm(false)}
                className="px-4 py-2 rounded-lg border border-border text-text-secondary hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegenerateConfirmed}
                className="px-4 py-2 rounded-lg bg-danger text-white hover:bg-danger/80 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Sí, regenerar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
