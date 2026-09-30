import React from 'react';
import { Link } from 'react-router-dom';
import { Home, RefreshCw, ArrowLeft } from 'lucide-react';

export function ServerErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-danger/10 mb-4">
            <span className="text-6xl font-bold text-danger">500</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Error del servidor</h1>
          <p className="text-text-secondary mb-8">
            Algo salió mal en nuestro lado. Estamos trabajando para solucionarlo.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
          >
            <Home className="w-4 h-4" />
            Ir al inicio
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-bg-elevated hover:bg-bg-input text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-bg-elevated hover:bg-bg-input text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver atrás
          </button>
        </div>

        <div className="mt-12 text-sm text-text-muted">
          <p>Si el problema persiste, contactá con soporte.</p>
          <Link to="/support" className="text-primary hover:text-primary-hover">
            Contactar soporte
          </Link>
        </div>
      </div>
    </div>
  );
}
