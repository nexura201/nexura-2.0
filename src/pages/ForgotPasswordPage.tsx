import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const validateEmail = (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmed = email.trim();

    if (!trimmed) {
      setStatus('error');
      setErrorMessage('Ingresa tu correo electrónico.');
      return;
    }

    if (!validateEmail(trimmed)) {
      setStatus('error');
      setErrorMessage('El formato del correo no es válido.');
      return;
    }

    // Estado de carga simulado (no hay backend todavía en esta etapa).
    setStatus('loading');
    setTimeout(() => {
      setStatus('success');
    }, 900);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-surface-deep">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-6">
            <img
              src="/brand/nexura-1nuevo-logo-original.png"
              alt="NEXURA"
              className="h-12 w-auto mx-auto max-w-[240px]"
            />
          </Link>
          <h1 className="text-2xl font-bold text-white">Recuperar contraseña</h1>
          <p className="text-text-secondary mt-2">
            Ingresa el correo de tu cuenta y te enviaremos un enlace para restablecerla.
          </p>
        </div>

        {status === 'success' ? (
          <div className="bg-surface border border-surface-2 rounded-xl p-6 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
            <h2 className="text-lg font-semibold text-white">Revisa tu correo</h2>
            <p className="text-sm text-text-secondary">
              Si <span className="text-white font-medium">{email.trim()}</span> está registrado
              en NEXURA, recibirás un enlace de recuperación en unos minutos. Revisá también la
              carpeta de spam.
            </p>
            <button
              onClick={() => {
                setStatus('idle');
                setEmail('');
              }}
              className="w-full bg-surface-2 hover:bg-border border border-border text-white py-2.5 rounded-lg font-medium transition-colors"
            >
              Enviar a otro correo
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full text-sm text-primary-hover hover:text-accent-strong"
            >
              Volver a iniciar sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-surface border border-surface-2 rounded-xl p-6 space-y-4">
            {status === 'error' && errorMessage && (
              <div className="flex items-center gap-2 bg-error/10 border border-error/20 text-error text-sm rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status === 'error') setStatus('idle');
                  }}
                  placeholder="tu@email.com"
                  autoFocus
                  className="w-full bg-surface-2 border border-border rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-text-secondary outline-none focus:border-primary-hover transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {status === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
              {status === 'loading' ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </button>

            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver a iniciar sesión
              </Link>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-text-secondary mt-6">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-primary-hover hover:text-accent-strong font-medium">
            Registrate gratis
          </Link>
        </p>
      </div>
    </div>
  );
}
