/**
 * ETAPA 7E-3 — Calendario de Lives / Programación (local/demo)
 * -------------------------------------------------------------
 * Servicio de programación 100% LOCAL: persiste en localStorage con el
 * patrón `nexura_*` del proyecto (metadatos pequeños; nunca blobs).
 * NO hay backend, base de datos, Supabase, Firebase ni sincronización
 * entre dispositivos. Las programaciones se muestran como "locales/demo".
 *
 * Fechas y horarios: se guardan como cadenas locales ("YYYY-MM-DD" +
 * "HH:mm") y se componen SIEMPRE con el constructor new Date(y, m-1, d, h, min),
 * que usa la zona horaria local del navegador. Se evita deliberadamente
 * new Date("YYYY-MM-DD") (que interpreta UTC y puede desplazar el día).
 */
import { v4 as uuidv4 } from 'uuid';

export type ScheduleStatus = 'PROGRAMADO' | 'CANCELADO';

export interface ScheduledLive {
  id: string;
  channelId: string;
  userId: string;
  title: string;
  description: string;
  categoryId: string | null;
  /** Fecha local en formato "YYYY-MM-DD" (no es un timestamp UTC). */
  date: string;
  /** Hora local en formato "HH:mm" (24 h). */
  time: string;
  status: ScheduleStatus;
  createdAt: string;
  updatedAt: string;
}

const SCHEDULE_KEY = 'nexura_scheduled_lives';

// ---- Persistencia local (tolerante a fallos, patrón del proyecto) ----

function getAll(): ScheduledLive[] {
  try {
    const raw = localStorage.getItem(SCHEDULE_KEY);
    return raw ? (JSON.parse(raw) as ScheduledLive[]) : [];
  } catch {
    return [];
  }
}

function setAll(items: ScheduledLive[]): void {
  // Puede lanzar (cuota/privacidad): los llamadores lo manejan con try/catch.
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(items));
}

// ---- Composición de fecha/hora SIN desplazamientos de zona ----

/** Compone fecha+hora LOCALES desde "YYYY-MM-DD" + "HH:mm". Devuelve null si es inválida. */
export function composeLocalDateTime(dateStr: string, timeStr: string): Date | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const tm = /^(\d{2}):(\d{2})$/.exec(timeStr);
  if (!dm || !tm) return null;
  const y = Number(dm[1]);
  const mo = Number(dm[2]);
  const d = Number(dm[3]);
  const h = Number(tm[1]);
  const mi = Number(tm[2]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  const dt = new Date(y, mo - 1, d, h, mi, 0, 0);
  // Rechaza fechas imposibles que JS "normaliza" (ej. 2026-02-30 → 2026-03-02)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt;
}

/** Convierte un ISO string guardado a Date local sin riesgo de shift (solo lectura). */
export function getLiveDate(live: ScheduledLive): Date | null {
  return composeLocalDateTime(live.date, live.time);
}

// ---- Validaciones (§6) ----

export interface LiveInput {
  title: string;
  description: string;
  categoryId: string | null;
  date: string;
  time: string;
}

/**
 * Valida una programación. `isEdit` permite mantener una fecha que ya pasó
 * (programaciones antiguas no deben quedar irremediablemente bloqueadas).
 * Devuelve un mensaje de error legible o null si todo es válido.
 */
export function validateLive(input: LiveInput, opts: { isEdit?: boolean } = {}): string | null {
  const title = input.title.trim();
  if (!title) return 'El título es obligatorio.';
  if (title.length > 120) return 'El título no puede superar 120 caracteres.';

  const dt = composeLocalDateTime(input.date, input.time);
  if (!dt) return 'La fecha u hora no es válida (formato AAAA-MM-DD y HH:MM).';
  if (Number(input.date.slice(0, 4)) < 2000 || Number(input.date.slice(0, 4)) > 2100) {
    return 'La fecha está fuera de un rango razonable.';
  }
  if (!opts.isEdit && dt.getTime() <= Date.now()) {
    return 'La fecha y hora deben ser futuras.';
  }
  return null;
}

// ---- API del servicio ----

export const scheduleService = {
  /** Programaciones del usuario, ordenadas por fecha/hora local ascendente. */
  getByUser(userId: string): ScheduledLive[] {
    return getAll()
      .filter(l => l.userId === userId)
      .sort((a, b) => {
        const da = composeLocalDateTime(a.date, a.time)?.getTime() ?? 0;
        const db = composeLocalDateTime(b.date, b.time)?.getTime() ?? 0;
        return da - db;
      });
  },

  getById(id: string): ScheduledLive | null {
    return getAll().find(l => l.id === id) ?? null;
  },

  create(userId: string, channelId: string, input: LiveInput): ScheduledLive {
    const now = new Date().toISOString();
    const live: ScheduledLive = {
      id: uuidv4(),
      channelId,
      userId,
      title: input.title.trim(),
      description: input.description.trim(),
      categoryId: input.categoryId,
      date: input.date,
      time: input.time,
      status: 'PROGRAMADO',
      createdAt: now,
      updatedAt: now,
    };
    const items = getAll();
    items.push(live);
    setAll(items);
    return live;
  },

  update(id: string, patch: Partial<LiveInput>): ScheduledLive | null {
    const items = getAll();
    const idx = items.findIndex(l => l.id === id);
    if (idx === -1) return null;
    const prev = items[idx];
    const next: ScheduledLive = {
      ...prev,
      ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
      ...(patch.description !== undefined ? { description: patch.description.trim() } : {}),
      ...(patch.categoryId !== undefined ? { categoryId: patch.categoryId } : {}),
      ...(patch.date !== undefined ? { date: patch.date } : {}),
      ...(patch.time !== undefined ? { time: patch.time } : {}),
      updatedAt: new Date().toISOString(),
    };
    items[idx] = next;
    setAll(items);
    return next;
  },

  /** Cancelar = estado CANCELADO (el modelo existente no distingue "eliminada"). */
  cancel(id: string): ScheduledLive | null {
    const items = getAll();
    const idx = items.findIndex(l => l.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], status: 'CANCELADO', updatedAt: new Date().toISOString() };
    setAll(items);
    return items[idx];
  },

  remove(id: string): boolean {
    const items = getAll();
    const filtered = items.filter(l => l.id !== id);
    if (filtered.length === items.length) return false;
    setAll(filtered);
    return true;
  },

  /** Elimina ÚNICAMENTE programaciones demo (userId `demo_*`) — reset seguro. */
  purgeDemoForUser(userId: string): number {
    if (!userId.startsWith('demo_')) return 0;
    const items = getAll();
    const kept = items.filter(l => !(l.userId === userId && l.id.startsWith('demo_live_')));
    const removed = items.length - kept.length;
    if (removed > 0) setAll(kept);
    return removed;
  },

  /** Idempotente: solo crea las programaciones demo si aún no existen para el canal. */
  ensureDemoLives(demo: Array<Omit<ScheduledLive, 'id' | 'createdAt' | 'updatedAt' | 'status'>>): number {
    const items = getAll();
    let added = 0;
    for (const d of demo) {
      const id = `demo_live_${d.channelId}`;
      if (items.some(l => l.id === id)) continue;
      const now = new Date().toISOString();
      items.push({ ...d, id, status: 'PROGRAMADO', createdAt: now, updatedAt: now });
      added++;
    }
    if (added > 0) setAll(items);
    return added;
  },
};
