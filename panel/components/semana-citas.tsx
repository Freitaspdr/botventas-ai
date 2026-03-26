'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Cita {
  id: string;
  cliente_nombre: string;
  cliente_tel: string;
  servicio: string | null;
  vehiculo: string | null;
  fecha_hora: string;
  estado: string;
  google_event_url: string | null;
}

const ESTADO_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pendiente:  { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', label: 'Pendiente' },
  confirmada: { bg: 'rgba(34,197,94,0.12)',  color: '#4ade80', label: 'Confirmada' },
  cancelada:  { bg: 'rgba(239,68,68,0.12)',  color: '#f87171', label: 'Cancelada' },
  completada: { bg: 'rgba(255,255,255,0.04)', color: '#a1a1aa', label: 'Completada' },
  no_show:    { bg: 'rgba(180,0,0,0.15)',    color: '#fca5a5', label: 'No show' },
};

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatWeekLabel(monday: Date): string {
  const sunday = addDays(monday, 6);
  const mo = monday.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  const su = sunday.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  return `${mo} – ${su}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

// ── New Cita Form ──────────────────────────────────────────────────────────────

function NewCitaModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    cliente_nombre: '', cliente_tel: '', servicio: '',
    vehiculo: '', fecha_hora: '', notas: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.cliente_tel || !form.fecha_hora) { setError('Teléfono y fecha son requeridos'); return; }
    setSaving(true);
    const res = await fetch('/api/citas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) { setError('Error al crear la cita'); return; }
    onCreated();
    onClose();
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '0.5px solid rgba(255,255,255,0.08)',
    color: '#fafafa',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    outline: 'none',
    width: '100%',
  } as React.CSSProperties;

  const labelStyle = { fontSize: 11, color: '#a1a1aa', marginBottom: 4, display: 'block' } as React.CSSProperties;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="rounded-xl w-full max-w-md p-5 flex flex-col gap-4"
        style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-medium" style={{ color: '#fafafa' }}>Nueva cita</h2>
          <button onClick={onClose} style={{ color: '#a1a1aa', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Nombre cliente</label>
              <input style={inputStyle} value={form.cliente_nombre} onChange={e => setForm(p => ({ ...p, cliente_nombre: e.target.value }))} placeholder="Carlos García" />
            </div>
            <div>
              <label style={labelStyle}>Teléfono *</label>
              <input style={inputStyle} value={form.cliente_tel} onChange={e => setForm(p => ({ ...p, cliente_tel: e.target.value }))} placeholder="34612345678" required />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Fecha y hora *</label>
            <input type="datetime-local" style={inputStyle} value={form.fecha_hora} onChange={e => setForm(p => ({ ...p, fecha_hora: e.target.value }))} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Servicio</label>
              <input style={inputStyle} value={form.servicio} onChange={e => setForm(p => ({ ...p, servicio: e.target.value }))} placeholder="Sonido / CarPlay…" />
            </div>
            <div>
              <label style={labelStyle}>Vehículo</label>
              <input style={inputStyle} value={form.vehiculo} onChange={e => setForm(p => ({ ...p, vehiculo: e.target.value }))} placeholder="Golf VII 2019" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Notas</label>
            <textarea
              style={{ ...inputStyle, resize: 'none', height: 64 } as React.CSSProperties}
              value={form.notas}
              onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
              placeholder="Observaciones…"
            />
          </div>

          {error && <p className="text-[11px]" style={{ color: '#f87171' }}>{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="py-2 rounded-lg text-[13px] font-medium transition-colors hover:opacity-90 disabled:opacity-50"
            style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}
          >
            {saving ? 'Creando…' : 'Crear cita'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function SemanaCitas({ initialCitas }: { initialCitas: Cita[] }) {
  const router = useRouter();
  const [monday, setMonday] = useState(() => getMondayOf(new Date()));
  const [citas, setCitas] = useState<Cita[]>(initialCitas);
  const [showNew, setShowNew] = useState(false);
  const [selectedCita, setSelectedCita] = useState<Cita | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const isCurrentWeek = sameDay(monday, getMondayOf(new Date()));

  async function changeEstado(citaId: string, estado: string) {
    setUpdatingId(citaId);
    await fetch(`/api/citas/${citaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
    setCitas(prev => prev.map(c => c.id === citaId ? { ...c, estado } : c));
    setSelectedCita(prev => prev?.id === citaId ? { ...prev, estado } : prev);
    setUpdatingId(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonday(prev => addDays(prev, -7))}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-white/[0.04]"
            style={{ color: '#a1a1aa', border: '0.5px solid rgba(255,255,255,0.05)' }}
          >
            ←
          </button>
          <span className="text-[13px] px-3" style={{ color: '#a1a1aa' }}>{formatWeekLabel(monday)}</span>
          <button
            onClick={() => setMonday(prev => addDays(prev, 7))}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-white/[0.04]"
            style={{ color: '#a1a1aa', border: '0.5px solid rgba(255,255,255,0.05)' }}
          >
            →
          </button>
          {!isCurrentWeek && (
            <button
              onClick={() => setMonday(getMondayOf(new Date()))}
              className="text-[11px] px-2.5 py-1 rounded-lg ml-1"
              style={{ background: 'rgba(255,255,255,0.04)', color: '#a1a1aa' }}
            >
              Hoy
            </button>
          )}
        </div>

        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 text-[12px] px-3 py-2 rounded-[10px] transition-colors hover:opacity-90"
          style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80' }}
        >
          + Nueva cita
        </button>
      </div>

      {/* Weekly grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, i) => {
          const dayCitas = citas.filter(c => sameDay(new Date(c.fecha_hora), day));
          const isToday = sameDay(day, new Date());

          return (
            <div key={i} className="flex flex-col gap-1.5">
              {/* Day header */}
              <div
                className="text-center py-1.5 rounded-lg"
                style={{
                  background: isToday ? 'rgba(34,197,94,0.08)' : 'transparent',
                  border: isToday ? '0.5px solid rgba(34,197,94,0.15)' : '0.5px solid rgba(255,255,255,0.05)',
                }}
              >
                <p className="text-[10px] uppercase tracking-wider" style={{ color: isToday ? '#4ade80' : '#71717a' }}>
                  {DAYS[i]}
                </p>
                <p className="text-[13px] font-medium" style={{ color: isToday ? '#4ade80' : '#a1a1aa' }}>
                  {day.getDate()}
                </p>
              </div>

              {/* Citas */}
              <div className="flex flex-col gap-1.5 min-h-[80px]">
                {dayCitas.length === 0 ? (
                  <div
                    className="flex-1 rounded-lg"
                    style={{ border: '0.5px dashed rgba(255,255,255,0.04)', minHeight: 60 }}
                  />
                ) : (
                  dayCitas
                    .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora))
                    .map(cita => {
                      const st = ESTADO_STYLE[cita.estado] ?? ESTADO_STYLE.pendiente;
                      return (
                        <button
                          key={cita.id}
                          onClick={() => setSelectedCita(cita)}
                          className="text-left p-2 rounded-lg transition-all hover:scale-[1.02]"
                          style={{ background: st.bg, border: `0.5px solid ${st.color}20` }}
                        >
                          <p className="text-[11px] font-medium" style={{ color: st.color }}>
                            {new Date(cita.fecha_hora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="text-[11px] truncate mt-0.5" style={{ color: '#e4e4e7' }}>
                            {cita.cliente_nombre || cita.cliente_tel}
                          </p>
                          {cita.servicio && (
                            <p className="text-[10px] truncate mt-0.5" style={{ color: '#a1a1aa' }}>
                              {cita.servicio}
                            </p>
                          )}
                        </button>
                      );
                    })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cita detail panel */}
      {selectedCita && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setSelectedCita(null)}
        >
          <div
            className="rounded-xl w-full max-w-sm p-5 flex flex-col gap-4"
            style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.08)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-medium" style={{ color: '#fafafa' }}>
                {selectedCita.cliente_nombre || selectedCita.cliente_tel}
              </h2>
              <button onClick={() => setSelectedCita(null)} style={{ color: '#a1a1aa', fontSize: 18, lineHeight: 1 }}>×</button>
            </div>

            <div className="flex flex-col gap-2.5">
              {[
                ['Fecha', new Date(selectedCita.fecha_hora).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })],
                ['Teléfono', selectedCita.cliente_tel],
                selectedCita.servicio ? ['Servicio', selectedCita.servicio] : null,
                selectedCita.vehiculo ? ['Vehículo', selectedCita.vehiculo] : null,
              ].filter((x): x is string[] => x !== null).map(([label, value]) => (
                <div key={String(label)} className="flex items-start justify-between gap-4">
                  <span className="text-[11px] flex-shrink-0" style={{ color: '#a1a1aa' }}>{label}</span>
                  <span className="text-[12px] text-right" style={{ color: '#a1a1aa' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Estado selector */}
            <div>
              <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: '#71717a' }}>Cambiar estado</p>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(ESTADO_STYLE).map(([key, st]) => (
                  <button
                    key={key}
                    disabled={selectedCita.estado === key || updatingId === selectedCita.id}
                    onClick={() => changeEstado(selectedCita.id, key)}
                    className="py-1.5 rounded-lg text-[11px] transition-all disabled:opacity-40"
                    style={{
                      background: selectedCita.estado === key ? st.bg : 'rgba(255,255,255,0.04)',
                      color: selectedCita.estado === key ? st.color : '#a1a1aa',
                      border: `0.5px solid ${selectedCita.estado === key ? st.color + '40' : 'transparent'}`,
                    }}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {selectedCita.google_event_url && (
              <a
                href={selectedCita.google_event_url}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] text-center py-2 rounded-lg transition-colors hover:opacity-80"
                style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}
              >
                Ver en Google Calendar →
              </a>
            )}
          </div>
        </div>
      )}

      {showNew && (
        <NewCitaModal
          onClose={() => setShowNew(false)}
          onCreated={() => router.refresh()}
        />
      )}
    </div>
  );
}
