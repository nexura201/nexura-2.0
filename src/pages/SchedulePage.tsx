/**
 * ETAPA 7E-3 — Calendario de Lives / Programación (Creator Studio)
 * ----------------------------------------------------------------
 * Página local/demo sobre la ruta existente del proyecto. Reutiliza:
 *  - db.getChannelByUserId (canal real del usuario)
 *  - categoryService.getCategories (categorías existentes)
 *  - NotificationService.createLocalEventNotification (idempotente, local)
 *  - isDemoMode() / resetDemoData() / DemoBadge (DEMO_MODE intacto)
 * NO hay backend ni sincronización entre dispositivos: todo es
 * "programación local/demo" y así se enuncia en la UI.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays, Plus, Pencil, Trash2, BellOff, ArrowLeft, AlertTriangle,
  Loader2, Clock, Tag, Video as VideoIcon, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { scheduleService, validateLive, getLiveDate, type ScheduledLive, type LiveInput } from '../services/schedule.service';
import * as db from '../services/database';
import * as categoryService from '../services/category';
import { NotificationService } from '../services/notification.service';
import { isDemoMode } from '../config/demoMode';
import { resetDemoData } from '../services/demoData';
import { DemoBadge } from '../components/DemoBadge';

type FormState = { mode: 'create' } | { mode: 'edit'; live: ScheduledLive };

function todayLocalStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`; // formato local, sin toISOString (evita shift UTC)
}

function fmtDateTime(live: ScheduledLive): string {
  const dt = getLiveDate(live);
  if (!dt) return 'Fecha inválida';
  return dt.toLocaleString('es', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function daysUntil(live: ScheduledLive): number | null {
  const dt = getLiveDate(live);
  if (!dt) return null;
  const diff = dt.getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

export default function SchedulePage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lives, setLives] = useState<ScheduledLive[]>([]);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [demoResetDone, setDemoResetDone] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    try {
      if (!user) {
        setLives([]);
        return;
      }
      const channel = db.getChannelByUserId(user.id);
      setChannelId(channel?.id ?? null);

      // DEMO ON: sembrar programaciones demo razonables para el canal demo,
      // idempotente (ids estables demo_live_<channelId>) — no duplica al recargar.
      if (isDemoMode() && channel) {
        scheduleService.ensureDemoLives([
          {
            channelId: channel.id, userId: user.id,
            title: 'Noche de ranked con la comunidad',
            description: 'Partidas clasificatorias y Q&A en el chat.',
            categoryId: channel.categoryId, date: todayLocalStr(2), time: '20:00',
          },
          {
            channelId: channel.id, userId: user.id,
            title: 'Maratón solidaria',
            description: 'Transmisión a beneficio de una causa comunitaria.',
            categoryId: channel.categoryId, date: todayLocalStr(6), time: '18:30',
          },
        ]);
      }

      setLives(scheduleService.getByUser(user.id));
    } catch {
      setLoadError('Los datos del calendario no están disponibles en este momento.');
      setLives([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
    try {
      setCategories(categoryService.getAllCategories().map(c => ({ id: c.id, name: c.name })));
    } catch {
      setCategories([]);
    }
  }, [load]);

  const upcoming = useMemo(
    () => lives.filter(l => l.status === 'PROGRAMADO' && (daysUntil(l) ?? -1) >= 0),
    [lives],
  );
  const pastOrCancelled = useMemo(
    () => lives.filter(l => !upcoming.includes(l)),
    [lives, upcoming],
  );

  // ---- Acciones ----

  const notify = (title: string, body: string, dedupeKey: string) => {
    if (!user) return;
    try {
      NotificationService.createLocalEventNotification({
        userId: user.id, type: 'SYSTEM', title, body, dedupeKey,
      });
    } catch { /* la notificación local nunca rompe la operación principal */ }
  };

  const handleSave = (input: LiveInput, editing?: ScheduledLive) => {
    setActionError(null);
    try {
      if (editing) {
        const err = validateLive(input, { isEdit: true });
        if (err) { setActionError(err); return false; }
        scheduleService.update(editing.id, input);
        notify(
          'Live actualizado',
          `Tu live programado "${input.title}" fue actualizado (programación local/demo).`,
          `schedule-updated-${editing.id}`,
        );
      } else {
        const err = validateLive(input);
        if (err) { setActionError(err); return false; }
        if (!user || !channelId) { setActionError('No se encontró tu canal. Vuelve a Creator Studio.'); return false; }
        scheduleService.create(user.id, channelId, input);
        notify(
          'Live programado',
          `"${input.title}" quedó programado para el ${fmtDateTime({ ...input, id: '', channelId, userId: user.id, status: 'PROGRAMADO', createdAt: '', updatedAt: '' } as ScheduledLive)} (programación local/demo).`,
          `schedule-created-${input.date}T${input.time}`,
        );
      }
      setLives(user ? scheduleService.getByUser(user.id) : []);
      setForm(null);
      return true;
    } catch {
      setActionError('No se pudo guardar la programación (almacenamiento local no disponible). Intentá de nuevo.');
      return false;
    }
  };

  const handleCancel = (live: ScheduledLive) => {
    setActionError(null);
    try {
      scheduleService.cancel(live.id);
      notify('Live cancelado', `La programación "${live.title}" fue cancelada (programación local/demo).`, `schedule-cancelled-${live.id}`);
      setLives(user ? scheduleService.getByUser(user.id) : []);
    } catch {
      setActionError('No se pudo cancelar la programación.');
    }
  };

  const handleDelete = (live: ScheduledLive) => {
    setActionError(null);
    try {
      scheduleService.remove(live.id);
      setLives(user ? scheduleService.getByUser(user.id) : []);
    } catch {
      setActionError('No se pudo eliminar la programación.');
    } finally {
      setConfirmDelete(null);
    }
  };

  /** Reset demo SOLO del calendario: purga ids demo_* y re-siembra. No toca datos del usuario. */
  const handleDemoReset = () => {
    if (!user || !isDemoMode()) return;
    try {
      resetDemoData();
      scheduleService.purgeDemoForUser(user.id);
      load();
      setDemoResetDone(true);
      setTimeout(() => setDemoResetDone(false), 2500);
    } catch {
      setActionError('No se pudo reiniciar la demo.');
    }
  };

  // ---- Render ----

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <CalendarDays className="w-16 h-16 text-text-muted mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Inicia sesión</h1>
        <p className="text-text-secondary">Inicia sesión para programar tus lives.</p>
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-primary-light hover:text-white mt-4">
          <ArrowLeft className="w-4 h-4" /> Volver a Creator Studio
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Encabezado */}
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-white mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Creator Studio
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-primary" /> Calendario de lives
            </h1>
            {isDemoMode() && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Programación local/demo
              </span>
            )}
          </div>
          <p className="text-text-secondary text-sm mt-1">
            Programa, editá y cancelá tus transmisiones. Los datos se guardan solo en este navegador
            (local/demo): no hay entrega push, email ni sincronización entre dispositivos.
          </p>
        </div>
        <div className="flex gap-2">
          {isDemoMode() && (
            <button
              onClick={handleDemoReset}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-bg-elevated text-text-secondary hover:text-white border border-border transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> {demoResetDone ? 'Demo reiniciada' : 'Reiniciar demo'}
            </button>
          )}
          {!form && (
            <button
              onClick={() => { setActionError(null); setForm({ mode: 'create' }); }}
              className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Programar live
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="mb-4 bg-danger/10 border border-danger/30 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" />
          <p className="text-sm text-white">{actionError}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-text-secondary">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando calendario…
        </div>
      )}

      {/* Error recuperable */}
      {!loading && loadError && (
        <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-start gap-3 flex-1">
            <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
            <p className="text-sm text-white">{loadError}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-bg-elevated text-text-secondary hover:text-white border border-border transition-colors">
              <RefreshCw className="w-4 h-4" /> Reintentar
            </button>
            <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors">
              Volver a Creator Studio
            </Link>
          </div>
        </div>
      )}

      {/* Vacío honesto */}
      {!loading && !loadError && lives.length === 0 && !form && (
        <div className="text-center py-16 bg-bg-card border border-border rounded-xl">
          <CalendarDays className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-white mb-1">Sin programaciones todavía</h2>
          <p className="text-sm text-text-secondary mb-4">
            {isDemoMode()
              ? 'No hay lives demo programados para este canal. Podés crear uno o reiniciar la demo.'
              : 'Todavía no programaste ningún live en este dispositivo.'}
          </p>
          <button
            onClick={() => setForm({ mode: 'create' })}
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Programar mi primer live
          </button>
        </div>
      )}

      {/* Formulario crear/editar */}
      {!loading && form && (
        <LiveForm
          initial={form.mode === 'edit' ? form.live : undefined}
          categories={categories}
          saving={false}
          onCancel={() => setForm(null)}
          onSave={(input) => handleSave(input, form.mode === 'edit' ? form.live : undefined)}
        />
      )}

      {/* Próximos */}
      {!loading && !loadError && upcoming.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-3">
            Próximos ({upcoming.length})
          </h2>
          <div className="grid gap-3">
            {upcoming.map(live => (
              <LiveCard
                key={live.id} live={live} categories={categories}
                isDemo={isDemoMode() && live.id.startsWith('demo_live_')}
                confirmDelete={confirmDelete === live.id}
                onEdit={() => { setActionError(null); setForm({ mode: 'edit', live }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                onCancel={() => handleCancel(live)}
                onAskDelete={() => setConfirmDelete(live.id)}
                onConfirmDelete={() => handleDelete(live)}
                onDismissDelete={() => setConfirmDelete(null)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Pasados / cancelados */}
      {!loading && !loadError && pastOrCancelled.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-3">
            Cancelados o pasados ({pastOrCancelled.length})
          </h2>
          <div className="grid gap-3 opacity-70">
            {pastOrCancelled.map(live => (
              <LiveCard
                key={live.id} live={live} categories={categories} dimmed
                isDemo={isDemoMode() && live.id.startsWith('demo_live_')}
                confirmDelete={confirmDelete === live.id}
                onEdit={live.status === 'CANCELADO' ? () => {
                  // reprogramar: volver a PROGRAMADO con edición
                  setActionError(null); setForm({ mode: 'edit', live }); window.scrollTo({ top: 0, behavior: 'smooth' });
                } : undefined}
                onCancel={live.status === 'PROGRAMADO' ? () => handleCancel(live) : undefined}
                onAskDelete={() => setConfirmDelete(live.id)}
                onConfirmDelete={() => handleDelete(live)}
                onDismissDelete={() => setConfirmDelete(null)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ============================================================
// Subcomponentes
// ============================================================

function LiveCard({
  live, categories, isDemo, dimmed, confirmDelete, onEdit, onCancel, onAskDelete, onConfirmDelete, onDismissDelete,
}: {
  live: ScheduledLive;
  categories: { id: string; name: string }[];
  isDemo?: boolean;
  dimmed?: boolean;
  confirmDelete: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  onAskDelete: () => void;
  onConfirmDelete: () => void;
  onDismissDelete: () => void;
}) {
  const categoryName = live.categoryId ? categories.find(c => c.id === live.categoryId)?.name ?? null : null;
  const dLeft = daysUntil(live);
  const dt = getLiveDate(live);

  return (
    <article className={`bg-bg-card border border-border rounded-xl p-4 ${dimmed ? 'opacity-70' : ''}`}>
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        {/* Bloque fecha/hora */}
        <div className="flex items-center gap-3 md:w-44 flex-shrink-0">
          <div className="w-14 h-14 rounded-xl bg-bg-input border border-border flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase text-text-muted leading-none">
              {dt ? dt.toLocaleDateString('es', { month: 'short' }) : '—'}
            </span>
            <span className="text-lg font-bold text-white leading-tight">{dt ? dt.getDate() : '?'}</span>
          </div>
          <div className="text-sm">
            <p className="text-white font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-primary-light" /> {live.time}
            </p>
            <p className="text-xs text-text-muted">
              {live.status === 'CANCELADO'
                ? 'Cancelado'
                : dLeft !== null && dLeft >= 0
                  ? dLeft === 0 ? 'Hoy' : dLeft === 1 ? 'Mañana' : `En ${dLeft} días`
                  : 'Fecha pasada'}
            </p>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-white truncate">{live.title}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              live.status === 'PROGRAMADO' ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
            }`}>
              {live.status === 'PROGRAMADO' ? 'Programado' : 'Cancelado'}
            </span>
            {isDemo && <DemoBadge />}
          </div>
          {live.description && <p className="text-sm text-text-secondary mt-0.5 line-clamp-2">{live.description}</p>}
          <div className="flex items-center gap-3 mt-1 text-xs text-text-muted flex-wrap">
            {categoryName && (
              <span className="inline-flex items-center gap-1"><Tag className="w-3 h-3" />{categoryName}</span>
            )}
            <span className="inline-flex items-center gap-1"><VideoIcon className="w-3 h-3" />{fmtDateTime(live)}</span>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 flex-shrink-0">
          {onEdit && (
            <button onClick={onEdit} title="Editar" className="p-2 rounded-lg bg-bg-elevated text-text-secondary hover:text-white border border-border transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {onCancel && (
            <button onClick={onCancel} title="Cancelar live" className="p-2 rounded-lg bg-bg-elevated text-text-secondary hover:text-warning border border-border transition-colors">
              <BellOff className="w-4 h-4" />
            </button>
          )}
          <button onClick={onAskDelete} title="Eliminar" className="p-2 rounded-lg bg-bg-elevated text-text-secondary hover:text-danger border border-border transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="mt-3 pt-3 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <p className="text-sm text-white">¿Eliminar esta programación? Esta acción es local y definitiva.</p>
          <div className="flex gap-2">
            <button onClick={onDismissDelete} className="text-xs px-3 py-1.5 rounded-lg bg-bg-elevated text-text-secondary hover:text-white border border-border">
              Volver
            </button>
            <button onClick={onConfirmDelete} className="text-xs px-3 py-1.5 rounded-lg bg-danger text-white hover:bg-danger-dark">
              Eliminar
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function LiveForm({
  initial, categories, saving, onCancel, onSave,
}: {
  initial?: ScheduledLive;
  categories: { id: string; name: string }[];
  saving: boolean;
  onCancel: () => void;
  onSave: (input: LiveInput) => boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [categoryId, setCategoryId] = useState<string>(initial?.categoryId ?? '');
  const [date, setDate] = useState<string>(initial?.date ?? todayLocalStr(1));
  const [time, setTime] = useState<string>(initial?.time ?? '20:00');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const input: LiveInput = { title, description, categoryId: categoryId || null, date, time };
    setError(null);
    const ok = onSave(input);
    if (!ok) setError('Revisá los datos: la programación no se guardó.');
  };

  const fieldCls = 'w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors';

  return (
    <form onSubmit={submit} className="bg-bg-card border border-border rounded-xl p-5 mb-8">
      <h2 className="text-lg font-semibold text-white mb-4">
        {initial ? 'Editar programación' : 'Nueva programación'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs text-text-muted mb-1">Título *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120}
            placeholder="Ej: Noche de ranked con la comunidad" className={fieldCls} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-text-muted mb-1">Descripción</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} maxLength={500}
            placeholder="Opcional — qué van a encontrar tus espectadores" className={fieldCls} />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Categoría</label>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={fieldCls}>
            <option value="">Sin categoría</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">Fecha *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              min={todayLocalStr(initial ? -3650 : 0)} max={todayLocalStr(365)} className={fieldCls} />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Hora *</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} className={fieldCls} />
          </div>
        </div>
      </div>

      {(error) && (
        <p className="mt-3 text-sm text-danger flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4" /> {error}
        </p>
      )}

      <p className="mt-3 text-xs text-text-muted">
        Fecha y hora se interpretan en tu horario local ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
        Guardado local/demo: no se envían recordatorios reales.
      </p>

      <div className="flex gap-2 mt-4">
        <button type="submit" disabled={saving}
          className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white font-medium transition-colors disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {initial ? 'Guardar cambios' : 'Programar live'}
        </button>
        <button type="button" onClick={onCancel}
          className="text-sm px-4 py-2 rounded-lg bg-bg-elevated text-text-secondary hover:text-white border border-border transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  );
}
