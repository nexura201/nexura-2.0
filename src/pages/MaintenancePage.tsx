import React from 'react';
import { Wrench, Clock, RefreshCw } from 'lucide-react';

export function MaintenancePage() {
  // En producción, esto vendría de una configuración o API
  const estimatedEnd = '2 horas';
  const message = 'Estamos realizando tareas de mantenimiento para mejorar tu experiencia.';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-bg-dark to-bg-card">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-warning/10 mb-4 animate-pulse">
            <Wrench className="w-12 h-12 text-warning" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">En mantenimiento</h1>
          <p className="text-text-secondary mb-6">
            {message}
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-bg-elevated rounded-lg">
            <Clock className="w-4 h-4 text-text-muted" />
            <span className="text-sm text-text-secondary">
              Tiempo estimado: {estimatedEnd}
            </span>
          </div>
        </div>

        <div className="bg-bg-card border border-border rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">¿Qué estamos haciendo?</h2>
          <ul className="text-left text-sm text-text-secondary space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Mejorando el rendimiento de la plataforma</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Actualizando nuestros sistemas de streaming</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Implementando nuevas funcionalidades</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Optimizando la base de datos</span>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors w-full"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar ahora
          </button>

          <div className="text-sm text-text-muted">
            <p>La página se recargará automáticamente cuando el mantenimiento finalice.</p>
            <p className="mt-2">
              ¿Necesitás ayuda urgente?{' '}
              <a href="mailto:soporte@nexura.example" className="text-primary hover:text-primary-hover">
                Contactá con soporte
              </a>
            </p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-xs text-text-muted">
            © 2024 NEXURA. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
