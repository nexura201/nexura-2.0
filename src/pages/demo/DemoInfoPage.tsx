/**
 * DemoInfoPage — Página pública /demo-info.
 * Transparencia total: explica qué es demostración en esta instalación,
 * dónde viven los datos y qué debe conectar el comprador para producción.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { getDemoStatus } from '../../services/demoData';
import { isDemoMode } from '../../config/demoMode';

export function DemoInfoPage() {
  const status = getDemoStatus();

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold text-white">Modo Demo de NEXURA</h1>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            status.active ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-surface-2 text-text-secondary border border-border'
          }`}
        >
          {status.active ? 'ACTIVO' : 'INACTIVO'}
        </span>
      </div>

      <p className="text-text-secondary mb-8">
        Esta instalación de NEXURA utiliza <strong className="text-white">datos locales de demostración</strong>{' '}
        para mostrar las capacidades de la plataforma. Ninguno de estos datos proviene de usuarios reales.
      </p>

      {/* Estado actual del seed */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Canales demo', value: status.channels },
          { label: 'Streams demo (LIVE)', value: status.liveStreams },
          { label: 'Reels demo', value: status.reels },
          { label: 'Clips demo', value: status.clips },
        ].map((s) => (
          <div key={s.label} className="bg-surface border border-border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-text-secondary mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <section className="space-y-3 mb-8">
        <h2 className="text-lg font-semibold text-white">Qué es demostración en esta instalación</h2>
        {[
          ['Los canales y perfiles', 'son ficticios (usuarios con prefijo "demo_"). No pertenecen a personas reales.'],
          ['Los streams marcados LIVE', 'son metadatos de ejemplo. No existe transmisión real alguna: no hay servidor RTMP/HLS conectado.'],
          ['Los seguidores y viewers', 'son números simulados para mostrar cómo se vería la actividad de una sala.'],
          ['El chat', 'contiene mensajes de ejemplo generados localmente; no es comunicación entre usuarios reales.'],
          ['Las estadísticas del dashboard', 'se calculan sobre datos demo locales. Nunca incluyen datos financieros: saldos, ingresos y transacciones NO se simulan.'],
          ['Las notificaciones y la actividad', 'de cada canal son ejemplos coherentes con los canales demo.'],
        ].map(([title, desc]) => (
          <div key={title} className="bg-surface border border-border rounded-lg p-4">
            <div className="text-sm font-medium text-white">{title}</div>
            <div className="text-sm text-text-secondary mt-1">{desc}</div>
          </div>
        ))}
      </section>

      <section className="bg-surface border border-border rounded-lg p-5 mb-8">
        <h2 className="text-lg font-semibold text-white mb-2">Dónde viven los datos</h2>
        <ul className="text-sm text-text-secondary space-y-1 list-disc list-inside">
          <li>Todos los datos demo se almacenan <strong className="text-white">localmente en tu navegador</strong> (localStorage).</li>
          <li>No existe una base de datos compartida: otro dispositivo o navegador no ve estos datos.</li>
          <li>Podés restaurar los datos demo originales desde <Link to="/settings" className="text-primary hover:text-primary-hover underline">Configuración → Modo demo</Link>.</li>
        </ul>
      </section>

      <section className="bg-surface border border-border rounded-lg p-5">
        <h2 className="text-lg font-semibold text-white mb-2">Para producción</h2>
        <p className="text-sm text-text-secondary">
          El comprador/deployer deberá conectar su propio backend y base de datos (por ejemplo Supabase/PostgreSQL),
          su infraestructura de streaming (RTMP + HLS, por ejemplo MediaMTX) y sus proveedores (emails, pagos).
          La arquitectura de NEXURA está preparada para eso: los servicios actuales funcionan como capa de
          abstracción sobre el almacenamiento local. Ver <code className="text-primary">README.md</code> y{' '}
          <code className="text-primary">docs/</code>.
        </p>
        {!isDemoMode() && (
          <p className="text-sm text-text-secondary mt-3">
            El modo demo está inactivo en esta sesión. Podés activarlo desde Configuración → Modo demo,
            o vía variable de entorno <code className="text-primary">VITE_DEMO_MODE=true</code>.
          </p>
        )}
      </section>
    </div>
  );
}
