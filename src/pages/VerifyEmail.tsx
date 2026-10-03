import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Radio, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const token = searchParams.get('token');

  useEffect(() => {
    // Simulate email verification
    setTimeout(() => {
      if (token) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    }, 1500);
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <Link to="/" className="inline-block mb-8">
          {/* Logo oficial: el PNG ya contiene la palabra NEXURA (no agregar texto duplicado) */}
          <img src="/brand/nexura-1nuevo-logo-original.png" alt="NEXURA" className="h-12 w-auto mx-auto max-w-[240px]" />
        </Link>

        <div className="bg-bg-card border border-border rounded-xl p-8">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 text-primary-light mx-auto mb-4 animate-spin" />
              <h1 className="text-xl font-bold text-white mb-2">Verificando email...</h1>
              <p className="text-text-secondary">Un momento por favor.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
              <h1 className="text-xl font-bold text-white mb-2">¡Email verificado!</h1>
              <p className="text-text-secondary mb-6">
                Tu email ha sido verificado correctamente. Ya puedes disfrutar de todas las funciones de StreamHub.
              </p>
              <Link
                to="/dashboard"
                className="inline-block bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
              >
                Ir al Dashboard
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-danger mx-auto mb-4" />
              <h1 className="text-xl font-bold text-white mb-2">Error de verificación</h1>
              <p className="text-text-secondary mb-6">
                El enlace de verificación no es válido o ha expirado.
              </p>
              <Link
                to="/login"
                className="inline-block bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
              >
                Iniciar sesión
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
