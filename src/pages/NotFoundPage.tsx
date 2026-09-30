import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-4">
            <span className="text-6xl font-bold text-primary">404</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Página no encontrada</h1>
          <p className="text-text-secondary mb-8">
            Lo sentimos, la página que estás buscando no existe o ha sido movida.
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
          <Link
            to="/explore"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-bg-elevated hover:bg-bg-input text-white rounded-lg transition-colors"
          >
            <Search className="w-4 h-4" />
            Explorar contenido
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-bg-elevated hover:bg-bg-input text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver atrás
          </button>
        </div>

        <div className="mt-12 text-sm text-text-muted">
          <p>¿Creés que esto es un error?</p>
          <Link to="/support" className="text-primary hover:text-primary-hover">
            Contactá con soporte
          </Link>
        </div>
      </div>
    </div>
  );
}
