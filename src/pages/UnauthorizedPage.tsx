import React from 'react';
import { Link } from 'react-router-dom';
import { LogIn, UserPlus, ArrowLeft } from 'lucide-react';

export function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-4">
            <LogIn className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Sesión requerida</h1>
          <p className="text-text-secondary mb-8">
            Necesitás iniciar sesión para acceder a esta página.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Iniciar sesión
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-bg-elevated hover:bg-bg-input text-white rounded-lg transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Crear cuenta
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-bg-elevated hover:bg-bg-input text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver atrás
          </button>
        </div>
      </div>
    </div>
  );
}
