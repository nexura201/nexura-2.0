import { Link, useLocation } from 'react-router-dom';
import { LifeBuoy } from 'lucide-react';

/**
 * Botón flotante de Soporte Técnico.
 * Reutiliza la ruta existente del Centro de Soporte (/support) definida en App.tsx.
 * No crea un segundo sistema de soporte ni duplica tickets: solo navega a la página existente.
 */
export function SupportFloatingButton() {
  const location = useLocation();

  // No mostrar el botón cuando el usuario ya está dentro del sistema de soporte
  if (location.pathname.startsWith('/support')) {
    return null;
  }

  return (
    <Link
      to="/support"
      aria-label="Abrir soporte técnico"
      title="Soporte Técnico NEXURA"
      className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 flex items-center justify-center
                 w-12 h-12 sm:w-14 sm:h-14 rounded-full
                 bg-primary text-white shadow-lg shadow-black/40
                 border border-surface-2
                 transition-all duration-200 ease-out
                 hover:bg-primary-hover hover:scale-105 hover:shadow-xl
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-hover focus-visible:ring-offset-2 focus-visible:ring-offset-surface-deep
                 active:scale-95"
    >
      <LifeBuoy className="w-6 h-6" />
    </Link>
  );
}
