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
  pendiente: { bg: '#f3e3bf', color: '#704a14', label: 'Pendiente' },
  confirmada: { bg: '#dfeedd', color: '#3f744d', label: 'Confirmada' },
  cancelada: { bg: '#f8ded9', color: '#a33b36', label: 'Cancelada' },
  completada: { bg: '#f4ead9', color: '#8a785d', label: 'Completada' },
  no_show: { bg: '#eadcc6', color: '#6f5632', label: 'No show' },
};

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
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
  return `${mo} - ${su}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function NewCitaModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    cliente_nombre: '', cliente_tel: '', servicio: '',
    vehiculo: '', fecha_hora: '', notas: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.cliente_tel || !form.fecha_hora) {
      setError('Teléfono y fecha son requeridos');
      return;
    }

    setSaving(true);
    const res = await fetch('/api/citas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);

    if (!res.ok) {
      setError('Error al crear la cita');
      return;
    }

    onCreated();
    onClose();
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,253,248,0.9)',
    border: '1px solid rgba(218,197,160,0.68)',
    color: '#2c2418',
    borderRadius: 16,
    padding: '10px 14px',
    fontSize: 13,
    outline: 'none',
    width: '100%',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2c2418]/35 px-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-[30px] p-6"
        style={{
          background: 'linear-gradient(180deg, rgba(255,253,248,0.98), rgba(249,239,224,0.96))',
          border: '1px solid rgba(218,197,160,0.72)',
          boxShadow: '0 30px 80px rgba(44,36,24,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-[20px] font-semibold tracking-tight" style={{ color: '#2c2418' }}>Nueva cita</h2>
            <p className="mt-1 text-[12px]" style={{ color: '#8a785d' }}>Agenda una visita manual para el equipo.</p>
          </div>
          <button onClick={onClose} className="text-[22px]" style={{ color: '#8a785d' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <input style={inputStyle} value={form.cliente_nombre} onChange={(e) => setForm((p) => ({ ...p, cliente_nombre: e.target.value }))} placeholder="Nombre del cliente" />
            <input style={inputStyle} value={form.cliente_tel} onChange={(e) => setForm((p) => ({ ...p, cliente_tel: e.target.value }))} placeholder="Teléfono *" required />
          </div>
          <input type="datetime-local" style={inputStyle} value={form.fecha_hora} onChange={(e) => setForm((p) => ({ ...p, fecha_hora: e.target.value }))} required />
          <div className="grid gap-4 md:grid-cols-2">
            <input style={inputStyle} value={form.servicio} onChange={(e) => setForm((p) => ({ ...p, servicio: e.target.value }))} placeholder="Servicio" />
            <input style={inputStyle} value={form.vehiculo} onChange={(e) => setForm((p) => ({ ...p, vehiculo: e.target.value }))} placeholder="Vehículo" />
          </div>
          <textarea
            style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
            value={form.notas}
            onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
            placeholder="Notas internas"
          />
          {error && <p className="text-[12px]" style={{ color: '#a33b36' }}>{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="rounded-[18px] py-3 text-[13px] font-medium"
            style={{ background: 'linear-gradient(135deg, #d7ac55, #9b6a24)', color: '#fffaf0' }}
          >
            {saving ? 'Creando…' : 'Crear cita'}
          </button>
        </form>
      </div>
    </div>
  );
}

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
    setCitas((prev) => prev.map((c) => (c.id === citaId ? { ...c, estado } : c)));
    setSelectedCita((prev) => (prev?.id === citaId ? { ...prev, estado } : prev));
    setUpdatingId(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <div
        className="flex flex-col gap-4 rounded-[26px] p-5 md:flex-row md:items-center md:justify-between"
        style={{
          background: 'linear-gradient(135deg, rgba(255,253,248,0.98), rgba(246,232,207,0.92) 56%, rgba(220,190,130,0.28))',
          border: '1px solid rgba(218,197,160,0.72)',
        }}
      >
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: '#9a8153' }}>Agenda semanal</p>
          <h2 className="mt-2 text-[28px] font-semibold tracking-tight" style={{ color: '#2c2418' }}>{formatWeekLabel(monday)}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setMonday((prev) => addDays(prev, -7))} className="rounded-[16px] px-4 py-2 text-[12px]" style={{ background: '#f3e5ce', color: '#79521d' }}>← Semana anterior</button>
          {!isCurrentWeek && (
            <button onClick={() => setMonday(getMondayOf(new Date()))} className="rounded-[16px] px-4 py-2 text-[12px]" style={{ background: '#f3e5ce', color: '#79521d' }}>Volver a hoy</button>
          )}
          <button onClick={() => setMonday((prev) => addDays(prev, 7))} className="rounded-[16px] px-4 py-2 text-[12px]" style={{ background: '#f3e5ce', color: '#79521d' }}>Siguiente semana →</button>
          <button onClick={() => setShowNew(true)} className="rounded-[16px] px-4 py-2 text-[12px] font-medium" style={{ background: 'linear-gradient(135deg, #d7ac55, #9b6a24)', color: '#fffaf0', border: '1px solid rgba(151,102,31,0.22)' }}>
            + Nueva cita
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-7">
        {weekDays.map((day, i) => {
          const dayCitas = citas.filter((c) => sameDay(new Date(c.fecha_hora), day));
          const isToday = sameDay(day, new Date());

          return (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-[24px] p-4"
              style={{
                background: isToday
                  ? 'linear-gradient(180deg, rgba(255,253,248,0.98), rgba(243,227,191,0.9))'
                  : 'linear-gradient(180deg, rgba(255,253,248,0.98), rgba(249,239,224,0.9))',
                border: isToday ? '1px solid rgba(184,134,47,0.36)' : '1px solid rgba(218,197,160,0.72)',
              }}
            >
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: isToday ? '#9b6a24' : '#9a8153' }}>{DAYS[i]}</p>
                <p className="mt-2 text-[30px] font-semibold tracking-tight" style={{ color: '#2c2418' }}>{day.getDate()}</p>
              </div>

              <div className="flex flex-1 flex-col gap-2">
                {dayCitas.length === 0 ? (
                  <div className="flex min-h-[120px] flex-1 items-center justify-center rounded-[18px] border border-dashed text-[11px]" style={{ borderColor: 'rgba(218,197,160,0.72)', color: '#8a785d' }}>
                    Sin citas
                  </div>
                ) : (
                  dayCitas
                    .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora))
                    .map((cita) => {
                      const st = ESTADO_STYLE[cita.estado] ?? ESTADO_STYLE.pendiente;
                      return (
                        <button
                          key={cita.id}
                          onClick={() => setSelectedCita(cita)}
                          className="rounded-[18px] p-3 text-left transition-transform hover:-translate-y-0.5"
                          style={{ background: st.bg, border: `1px solid ${st.color}33` }}
                        >
                          <p className="text-[11px] font-medium" style={{ color: st.color }}>
                            {new Date(cita.fecha_hora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="mt-1 truncate text-[12px] font-medium" style={{ color: '#2c2418' }}>
                            {cita.cliente_nombre || cita.cliente_tel}
                          </p>
                          {cita.servicio && (
                            <p className="mt-1 truncate text-[10px]" style={{ color: '#6f604a' }}>
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

      {selectedCita && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2c2418]/35 px-4 backdrop-blur-sm" onClick={() => setSelectedCita(null)}>
          <div
            className="w-full max-w-md rounded-[28px] p-6"
            style={{
              background: 'linear-gradient(180deg, rgba(255,253,248,0.98), rgba(249,239,224,0.96))',
              border: '1px solid rgba(218,197,160,0.72)',
              boxShadow: '0 30px 80px rgba(44,36,24,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-[20px] font-semibold tracking-tight" style={{ color: '#2c2418' }}>
                  {selectedCita.cliente_nombre || selectedCita.cliente_tel}
                </h2>
                <p className="mt-1 text-[12px]" style={{ color: '#8a785d' }}>{selectedCita.cliente_tel}</p>
              </div>
              <button onClick={() => setSelectedCita(null)} className="text-[22px]" style={{ color: '#8a785d' }}>×</button>
            </div>

            <div className="flex flex-col gap-3 rounded-[20px] p-4" style={{ background: '#f4ead9' }}>
              {[
                ['Fecha', new Date(selectedCita.fecha_hora).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })],
                ['Servicio', selectedCita.servicio || 'Por definir'],
                ['Vehículo', selectedCita.vehiculo || 'No indicado'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4">
                  <span className="text-[11px]" style={{ color: '#8a785d' }}>{label}</span>
                  <span className="text-right text-[12px]" style={{ color: '#2c2418' }}>{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <p className="mb-3 text-[11px] uppercase tracking-[0.18em]" style={{ color: '#9a8153' }}>Cambiar estado</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(ESTADO_STYLE).map(([key, st]) => (
                  <button
                    key={key}
                    disabled={selectedCita.estado === key || updatingId === selectedCita.id}
                    onClick={() => changeEstado(selectedCita.id, key)}
                    className="rounded-[16px] py-2 text-[11px] font-medium disabled:opacity-40"
                    style={{
                      background: selectedCita.estado === key ? st.bg : '#f4ead9',
                      color: selectedCita.estado === key ? st.color : '#8a785d',
                      border: '1px solid rgba(218,197,160,0.62)',
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
                className="mt-5 block rounded-[16px] py-3 text-center text-[12px] font-medium"
                style={{ background: '#f3e3bf', color: '#704a14' }}
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
