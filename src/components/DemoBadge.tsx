/**
 * DemoBadge — Indicador minimalista y reutilizable de contenido de demostración.
 * Reutiliza la paleta existente de NEXURA (ámbar sobre superficie). No altera
 * el diseño general: es una etiqueta discreta junto a datos que pueden
 * interpretarse como reales (viewers, seguidores, LIVE, estadísticas).
 */
import React from 'react';

export function DemoBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-amber-500/15 text-amber-400 border border-amber-500/30 ${className}`}
      title="Contenido de demostración local"
    >
      DEMO
    </span>
  );
}
