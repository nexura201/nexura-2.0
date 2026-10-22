import { useState, useEffect } from 'react';
import { getMediaBlob } from '../services/mediaLocal';

/**
 * useLocalMediaUrl — ETAPA 7A/7B: reproduce contenido guardado en IndexedDB.
 *
 * Regla única (no cambia el comportamiento heredado de Etapa 6):
 *  - Si `videoUrl` NO está vacío → devuelve null y la página usa la URL tal
 *    como siempre (los VOD demo procesados siguen con su flujo original).
 *  - Si `videoUrl` está vacío y hay `storageKey` → busca el Blob del usuario
 *    en IndexedDB (mediaLocal) y expone una object URL temporal.
 *  - Los contenidos DEMO nunca tienen blob local (decisión honesta de Etapa 6),
 *    así que esta resolución solo afecta a contenido creado vía Upload.
 *
 * Seguridad de memoria: la object URL se SIEMPRE revoca (`URL.revokeObjectURL`)
 * al desmontar o cuando cambian las dependencias; no quedan URLs colgando.
 * Estados: loading=true mientras se resuelve; si no hay blob o IndexedDB
 * falla, loading=false y url=null → la UI muestra el placeholder honesto
 * (nunca loading infinito).
 */
export function useLocalMediaUrl(
  videoUrl: string | undefined | null,
  storageKey: string | undefined | null
): { url: string | null; loading: boolean } {
  const needsLocal = !videoUrl && !!storageKey;
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(needsLocal);

  useEffect(() => {
    if (!needsLocal) {
      setUrl(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    let created: string | null = null;
    setLoading(true);
    getMediaBlob(storageKey as string)
      .then((blob) => {
        if (cancelled) return;
        if (blob) {
          created = URL.createObjectURL(blob);
          setUrl(created);
        } else {
          setUrl(null); // sin blob local → placeholder honesto
        }
      })
      .catch(() => {
        if (!cancelled) setUrl(null); // error IDB → placeholder, nunca spinner eterno
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [needsLocal, storageKey]);

  return { url, loading };
}

export default useLocalMediaUrl;
