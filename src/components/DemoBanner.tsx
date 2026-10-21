/**
 * DemoBanner — Indicador GLOBAL discreto del MODO DEMO.
 * Solo se renderiza cuando isDemoMode() es true. No altera el diseño de
 * NEXURA: franja fina superior con enlace a /demo-info para transparencia
 * total hacia el comprador/visitante.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { isDemoMode } from '../config/demoMode';

export function DemoBanner() {
  if (!isDemoMode()) return null;
  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/25 text-center px-3 py-1 text-[11px] sm:text-xs text-amber-300">
      <span className="font-semibold uppercase tracking-wide">Modo demo</span>
      {' · '}
      Esta instalación contiene datos de demostración locales.{' '}
      <Link to="/demo-info" className="underline underline-offset-2 hover:text-amber-200">
        Ver qué es demo
      </Link>
    </div>
  );
}
