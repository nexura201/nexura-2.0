/**
 * Owner → Servers — Configuración de infraestructura de streaming (Etapa 4)
 *
 * Pantalla profesional para que el OWNER defina los endpoints RTMP/HLS que
 * utilizará la plataforma. NEXURA NO incluye un servidor de streaming propio:
 * aquí solo se CONFIGURAN URLs apuntando a infraestructura externa
 * (MediaMTX, nginx-rtmp, SRS u otro compatible).
 *
 * Honestidad de estado: una URL registrada significa "Configurado", nunca
 * "Online". No existe comprobación real de conectividad en esta etapa; el
 * health check del servicio es simulado y no se presenta como verídico.
 */
import React, { useState } from 'react';
import { OwnerLayout } from './OwnerLayout';
import { mediaServerService, type MediaServer } from '../../services/mediaServer.service';
import { getStreamingConfigStatus, DEMO_STREAMING_TARGETS } from '../../config/streaming';
import { Server, Plus, Trash2, Info, CheckCircle2, CircleSlash, Radio } from 'lucide-react';

function validateUrl(value: string, scheme: 'rtmp' | 'http'): string | null {
  const v = value.trim();
  if (!v) return 'La URL es obligatoria.';
  const expected = scheme === 'rtmp' ? /^rtmp(s?):\/\/[^\s/]+(\/.*)?$/ : /^https?:\/\/[^\s/]+(\/.*)?$/;
  if (!expected.test(v)) {
    return scheme === 'rtmp'
      ? 'Formato inválido. Ejemplo: rtmp://servidor.ejemplo/live'
      : 'Formato inválido. Ejemplo: https://servidor.ejemplo/hls';
  }
  return null;
}

export function OwnerServersPage() {
  const [, forceRender] = useState(0);
  const refresh = () => forceRender((n) => n + 1);

  const [name, setName] = useState('');
  const [rtmpUrl, setRtmpUrl] = useState('');
  const [hlsUrl, setHlsUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [addedOk, setAddedOk] = useState(false);

  const servers = mediaServerService.getAllServers();
  const status = getStreamingConfigStatus();

  const handleAdd = () => {
    setAddedOk(false);
    const errName = name.trim().length < 2 ? 'Asigná un nombre descriptivo al servidor.' : null;
    const errRtmp = validateUrl(rtmpUrl, 'rtmp');
    const errHls = validateUrl(hlsUrl, 'http');
    const firstErr = errName || errRtmp || errHls;
    setFormError(firstErr);
    if (firstErr) return;

    const server: MediaServer = {
      id: `srv_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      rtmpUrl: rtmpUrl.trim().replace(/\/+$/, ''),
      hlsUrl: hlsUrl.trim().replace(/\/+$/, ''),
      apiUrl: '',
      // 'DECLARED' = registrado por el Owner pero SIN verificación real de
      // conectividad (no hay health check en esta etapa). No se presenta como
      // operativo; la UI lo etiqueta "Configurado".
      status: 'DECLARED' as unknown as MediaServer['status'],
      capacity: 100,
      currentLoad: 0,
      activeStreams: 0,
      maxStreams: 100,
      lastHealthCheck: 0,
    };
    mediaServerService.registerServer(server);
    setName(''); setRtmpUrl(''); setHlsUrl(''); setFormError(null);
    setAddedOk(true);
    refresh();
  };

  const handleRemove = (id: string) => {
    mediaServerService.unregisterServer(id);
    refresh();
  };

  return (
    <OwnerLayout title="Servidores de Streaming" subtitle="Configuración de infraestructura RTMP / HLS">
      {/* Explicación general */}
      <div className="bg-bg-card border border-border rounded-xl p-5 mb-6 flex items-start gap-3">
        <Info className="w-5 h-5 text-primary-light mt-0.5 shrink-0" />
        <div className="text-sm text-text-secondary leading-relaxed">
          <p className="text-white font-medium mb-1">NEXURA no incluye un servidor de streaming propio.</p>
          <p>
            Esta pantalla configura las URLs hacia tu infraestructura externa de ingestión (RTMP) y reproducción (HLS),
            por ejemplo un servidor <strong className="text-white">MediaMTX</strong>, nginx-rtmp o SRS. El comprador
            debe desplegar y mantener esa infraestructura por separado. La configuración global también puede fijarse
            mediante variables de entorno <code className="bg-bg-elevated px-1 rounded text-xs">VITE_RTMP_SERVER_URL</code> y{' '}
            <code className="bg-bg-elevated px-1 rounded text-xs">VITE_HLS_BASE_URL</code> (prioritarias sobre este panel).
          </p>
        </div>
      </div>

      {/* Estado de configuración efectiva */}
      <div className="bg-bg-card border border-border rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Radio className="w-4 h-4 text-primary-light" /> Estado de configuración
        </h3>
        {status.configured && !status.isDemo ? (
          <div className="flex items-start gap-3 p-3 bg-success/10 border border-success/30 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-success">Configurado</p>
              <p className="text-xs text-text-secondary mt-0.5 break-all">RTMP: {status.rtmpUrl}</p>
              <p className="text-xs text-text-secondary break-all">HLS: {status.hlsBaseUrl}</p>
              <p className="text-[11px] text-text-muted mt-1">
                Fuente: {status.source === 'env' ? 'variables de entorno' : 'este panel'}. "Configurado" significa que la URL
                está definida; esta pantalla no verifica conectividad real.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-3 bg-warning/10 border border-warning/30 rounded-lg">
            <CircleSlash className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warning">Infraestructura no configurada (demo)</p>
              <p className="text-xs text-text-secondary mt-0.5">
                Se están usando endpoints locales de ejemplo ({DEMO_STREAMING_TARGETS.rtmp}). Registrá un servidor abajo
                o definí las variables de entorno para activar streaming real.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Registrar servidor */}
      <div className="bg-bg-card border border-border rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary-light" /> Registrar servidor
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Nombre</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="MediaMTX Principal"
              className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-text-muted" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">URL RTMP (ingestión)</label>
            <input value={rtmpUrl} onChange={(e) => setRtmpUrl(e.target.value)} placeholder="rtmp://servidor.ejemplo/live"
              className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:font-sans placeholder:text-text-muted" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">URL HLS (reproducción)</label>
            <input value={hlsUrl} onChange={(e) => setHlsUrl(e.target.value)} placeholder="https://servidor.ejemplo/hls"
              className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:font-sans placeholder:text-text-muted" />
          </div>
        </div>
        {formError && <p className="text-xs text-danger mt-2">{formError}</p>}
        {addedOk && <p className="text-xs text-success mt-2">Servidor registrado. Las URLs se aplican al resolverse la configuración de streaming.</p>}
        <div className="mt-4">
          <button onClick={handleAdd}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> Agregar servidor
          </button>
        </div>
      </div>

      {/* Lista de servidores */}
      <div className="bg-bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Server className="w-4 h-4 text-primary-light" /> Servidores registrados
        </h3>
        {servers.length === 0 ? (
          <p className="text-sm text-text-muted">No hay servidores registrados.</p>
        ) : (
          <div className="space-y-3">
            {servers.map((s) => {
              const isDefaultDemo = s.id === 'default' && (s.rtmpUrl.includes('localhost') || s.rtmpUrl.includes('127.0.0.1'));
              return (
                <div key={s.id} className="border border-border rounded-lg p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-white">{s.name}</p>
                      {isDefaultDemo ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-warning/15 text-warning px-2 py-0.5 rounded-full">Demo local</span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-success/15 text-success px-2 py-0.5 rounded-full">Configurado</span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary mt-1 break-all font-mono">RTMP: {s.rtmpUrl}</p>
                    <p className="text-xs text-text-secondary break-all font-mono">HLS: {s.hlsUrl}</p>
                    {!isDefaultDemo && (
                      <p className="text-[11px] text-text-muted mt-1">Estado: registrado sin verificar · El health check real quedará disponible al conectar la infraestructura y backend.</p>
                    )}
                  </div>
                  <button onClick={() => handleRemove(s.id)} disabled={isDefaultDemo}
                    title={isDefaultDemo ? 'El servidor demo default no puede eliminarse' : 'Eliminar servidor'}
                    className="p-2 text-text-muted hover:text-danger transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </OwnerLayout>
  );
}
