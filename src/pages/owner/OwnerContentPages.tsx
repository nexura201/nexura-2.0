/**
 * Control Center OWNER — Canales / Lives / Reels / Calendario.
 * Listados con datos 100% reales de los servicios existentes; sin acciones falsas.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { OwnerLayout, BackendNotice } from './OwnerLayout';
import { AdminService } from '../../services/admin.service';
import { getAllCategories } from '../../services/category';
import { Search, Video, Radio, Film, Eye, Heart, CalendarDays, Clock, ExternalLink } from 'lucide-react';

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });
};

function useAdminData<T>(loader: (ownerId: string) => T): { data: T | null; denied: boolean } {
  const { user } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [denied, setDenied] = useState(false);
  useEffect(() => {
    if (!user) return;
    try {
      setData(loader(user.id));
    } catch {
      setDenied(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  return { data, denied };
}

function DeniedCard() {
  return (
    <div className="mt-6 bg-bg-card border border-border rounded-xl p-8 text-center text-text-secondary">
      Acceso restringido al propietario de la plataforma.
    </div>
  );
}

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 bg-bg-card border border-border rounded-xl p-8 text-center text-text-secondary text-sm">
      {children}
    </div>
  );
}

// ============================================================
// CANALES
// ============================================================

export function OwnerChannelsPage() {
  const { data: channels, denied } = useAdminData(id => AdminService.listChannelsAdmin(id));
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!channels) return [];
    if (!s) return channels;
    return channels.filter(c =>
      c.title.toLowerCase().includes(s) || c.slug.toLowerCase().includes(s) || c.ownerUsername.toLowerCase().includes(s)
    );
  }, [channels, q]);

  return (
    <OwnerLayout title="Canales" subtitle={channels ? `${channels.length} canales creados · datos reales` : 'Canales de la plataforma'}>
      <div className="relative mb-4 max-w-md">
        <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar canal…"
          className="w-full bg-bg-card border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-primary placeholder:text-text-secondary"
        />
      </div>

      {denied ? <DeniedCard /> : !channels ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-bg-card border border-border rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyCard>Datos no disponibles: todavía no hay canales que coincidan.</EmptyCard>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.id} className="bg-bg-card border border-border rounded-xl p-4 flex items-center gap-3 flex-wrap">
              <Video className="w-4 h-4 text-primary-light shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">
                  {c.title} <span className="text-text-muted font-normal">@{c.ownerUsername}</span>
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  Creado {fmtDate(c.createdAt)} · {c.videos} videos · {c.reels} reels · {c.followers} seguidores
                </p>
              </div>
              {c.isLive && <span className="text-[11px] font-bold text-success bg-success/10 rounded-full px-2 py-0.5">EN VIVO</span>}
              <Link to={`/channel/${c.slug}`} className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-white transition-colors">
                Ver público <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </OwnerLayout>
  );
}

// ============================================================
// LIVES
// ============================================================

export function OwnerLivesPage() {
  const { data: lives, denied } = useAdminData(id => AdminService.listLivesAdmin(id));
  const active = lives?.filter(l => l.status === 'LIVE' || l.status === 'STARTING') ?? [];

  return (
    <OwnerLayout title="Lives" subtitle={lives ? `${active.length} activos ahora · ${lives.length} transmisiones registradas` : 'Transmisiones en vivo'}>
      {denied ? <DeniedCard /> : !lives ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-bg-card border border-border rounded-xl animate-pulse" />)}</div>
      ) : lives.length === 0 ? (
        <EmptyCard>Datos no disponibles: todavía no hay transmisiones registradas en el sistema de streaming.</EmptyCard>
      ) : (
        <div className="space-y-2">
          {lives.map(s => (
            <div key={s.id} className="bg-bg-card border border-border rounded-xl p-4 flex items-center gap-3 flex-wrap">
              <Radio className={`w-4 h-4 shrink-0 ${s.status === 'LIVE' ? 'text-danger' : 'text-text-muted'}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{s.title}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {s.channelTitle ? <>Canal <Link to={`/channel/${s.channelSlug}`} className="text-primary-hover hover:underline">{s.channelTitle}</Link> · </> : 'Canal eliminado · '}
                  Inicio {fmtDate(s.startedAt)}{s.endedAt ? ` · Fin ${fmtDate(s.endedAt)}` : ''}
                </p>
              </div>
              <span className="text-xs text-text-secondary whitespace-nowrap"><Eye className="w-3.5 h-3.5 inline mr-1" />{s.viewerCount} · máx {s.peakViewerCount}</span>
              <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${
                s.status === 'LIVE' ? 'text-danger bg-danger/10' : s.status === 'STARTING' ? 'text-warning bg-warning/10' : 'text-text-muted bg-bg-elevated'
              }`}>{s.status}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-6">
        <BackendNotice>
          El control de cortes/apagados forzado de un live desde el panel requiere señalización en servidor
          (backend de streaming). Aquí se visualiza el estado real medido por el servicio de streaming existente.
        </BackendNotice>
      </div>
    </OwnerLayout>
  );
}

// ============================================================
// REELS
// ============================================================

export function OwnerReelsPage() {
  const { data: reels, denied } = useAdminData(id => AdminService.listReelsAdmin(id));
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!reels) return [];
    if (!s) return reels;
    return reels.filter(r => r.title.toLowerCase().includes(s) || (r.channelSlug ?? '').toLowerCase().includes(s));
  }, [reels, q]);

  return (
    <OwnerLayout title="Reels" subtitle={reels ? `${reels.length} reels publicados · datos reales` : 'Reels de la plataforma'}>
      <div className="relative mb-4 max-w-md">
        <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar reel…"
          className="w-full bg-bg-card border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-primary placeholder:text-text-secondary"
        />
      </div>

      {denied ? <DeniedCard /> : !reels ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 bg-bg-card border border-border rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyCard>Datos no disponibles: todavía no hay reels publicados.</EmptyCard>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(r => (
            <Link key={r.id} to={`/reels?focus=${r.id}`} className="bg-bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
              <div className="flex items-start gap-2">
                <Film className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-white line-clamp-2">{r.title}</p>
              </div>
              <p className="text-xs text-text-muted mt-2">
                @{r.channelSlug ?? '—'} · {Math.round(r.duration)}s
              </p>
              <p className="text-xs text-text-secondary mt-1 flex items-center gap-3">
                <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" />{r.views}</span>
                <span className="inline-flex items-center gap-1"><Heart className="w-3 h-3" />{r.likes}</span>
                <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDate(r.createdAt)}</span>
              </p>
            </Link>
          ))}
        </div>
      )}
    </OwnerLayout>
  );
}

// ============================================================
// CALENDARIO (eventos reales derivados de datos existentes)
// ============================================================

export function OwnerCalendarPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Array<{ action: string; label: string; details: string; actorName: string; createdAt: string }> | null>(null);
  const categories = useMemo(() => { try { return getAllCategories(); } catch { return []; } }, []);

  useEffect(() => {
    if (!user) return;
    try {
      setEvents(AdminService.getRecentActivity(60).map(e => ({
        action: e.action, label: e.label, details: e.details, actorName: e.actorName, createdAt: e.createdAt,
      })));
    } catch {
      setEvents([]);
    }
  }, [user]);

  const byDay = useMemo(() => {
    const map = new Map<string, typeof events>();
    if (!events) return [];
    for (const ev of events) {
      const day = new Date(ev.createdAt).toLocaleDateString('es', { dateStyle: 'full' });
      const arr = map.get(day) ?? [];
      arr.push(ev);
      map.set(day, arr);
    }
    return Array.from(map.entries());
  }, [events]);

  return (
    <OwnerLayout title="Calendario" subtitle="Cronología real de eventos de la plataforma (fuente: auditoría)">
      {!events ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-bg-card border border-border rounded-xl animate-pulse" />)}</div>
      ) : byDay.length === 0 ? (
        <EmptyCard>Datos no disponibles: todavía no hay eventos para graficar en el calendario.</EmptyCard>
      ) : (
        <div className="space-y-6">
          {byDay.map(([day, evs]) => (
            <div key={day}>
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-primary-light" /> {day}</h3>
              <div className="border-l-2 border-border ml-2 pl-4 space-y-2">
                {(evs ?? []).map((ev, i) => (
                  <div key={i} className="bg-bg-card border border-border rounded-lg px-3.5 py-2.5">
                    <p className="text-sm text-white">{ev.label} <span className="text-text-muted">· {ev.actorName}</span></p>
                    {ev.details && <p className="text-xs text-text-muted mt-0.5 truncate">{ev.details}</p>}
                    <p className="text-[11px] text-text-muted mt-0.5">{new Date(ev.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-bg-card border border-border rounded-xl p-5">
        <h2 className="text-base font-semibold text-white mb-3">Categorías del sistema</h2>
        {categories.length === 0 ? (
          <p className="text-sm text-text-muted">Datos no disponibles.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <Link key={c.id} to={`/category/${c.slug}`} className="text-xs bg-bg-elevated border border-border rounded-full px-3 py-1.5 text-text-secondary hover:text-white transition-colors">
                {c.name}
              </Link>
            ))}
          </div>
        )}
        <p className="text-[11px] text-text-muted mt-3">La gestión editable de categorías y la creación de eventos programados (schedulables) requieren backend (⚠️). Aquí se listan las categorías reales del sistema.</p>
      </div>
    </OwnerLayout>
  );
}
