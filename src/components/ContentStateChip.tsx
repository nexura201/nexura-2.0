import React from 'react';
import {
  getContentStateClasses,
  getContentStateLabel,
  type ContentState,
} from '../services/content';

/**
 * Etapa 6 — Chip de estado de contenido UNIFICADO (borrador / procesando /
 * publicado / oculto / error). La lógica vive en `services/content.ts` (sin
 * JSX); este componente solo la pinta. Reutilizable en Biblioteca, ClipPage,
 * VideoPage y cualquier pantalla de contenido.
 */
export function ContentStateChip({ state, className = '' }: { state: ContentState; className?: string }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border ${getContentStateClasses(state)} ${className}`}
    >
      {getContentStateLabel(state)}
    </span>
  );
}
