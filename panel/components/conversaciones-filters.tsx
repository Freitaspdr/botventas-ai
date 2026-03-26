'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const ESTADOS = [
  { value: '',            label: 'Todas' },
  { value: 'activa',      label: 'Activas' },
  { value: 'transferida', label: 'Transferidas' },
  { value: 'cerrada',     label: 'Cerradas' },
];

interface Props {
  estado?: string;
  desde?: string;
  hasta?: string;
  q?: string;
}

export function ConversacionesFilters({ estado, desde, hasta, q }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(q ?? '');

  function navigate(overrides: Partial<Props>) {
    const params = new URLSearchParams();
    const merged = { estado, desde, hasta, q: search, ...overrides };
    if (merged.estado) params.set('estado', merged.estado);
    if (merged.desde)  params.set('desde',  merged.desde);
    if (merged.hasta)  params.set('hasta',  merged.hasta);
    if (merged.q)      params.set('q',      merged.q);
    router.push(`/conversaciones${params.size ? `?${params}` : ''}`);
  }

  const hayFiltros = estado || desde || hasta || q;

  return (
    <div className="flex flex-col gap-3">
      {/* Search + clear */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2 flex-1 rounded-[10px] px-3"
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: '0.5px solid rgba(255,255,255,0.05)',
            height: 36,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre o teléfono…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && navigate({ q: search })}
            className="flex-1 bg-transparent text-[13px] outline-none"
            style={{ color: '#fafafa' }}
          />
        </div>

        {hayFiltros && (
          <button
            onClick={() => { setSearch(''); router.push('/conversaciones'); }}
            className="text-[12px] px-3 py-2 rounded-[10px] transition-colors hover:text-[#a1a1aa]"
            style={{ color: '#a1a1aa' }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Estado tabs + date range */}
      <div className="flex items-center justify-between gap-4">
        {/* Estado tabs */}
        <div
          className="flex items-center rounded-[10px] overflow-hidden"
          style={{ border: '0.5px solid rgba(255,255,255,0.05)' }}
        >
          {ESTADOS.map((e, i) => (
            <button
              key={e.value}
              onClick={() => navigate({ estado: e.value })}
              className="px-3 py-1.5 text-[12px] transition-colors"
              style={{
                background: (estado ?? '') === e.value ? 'rgba(255,255,255,0.06)' : 'transparent',
                color:      (estado ?? '') === e.value ? '#fafafa' : '#a1a1aa',
                borderRight: i < ESTADOS.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : undefined,
              }}
            >
              {e.label}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <label className="text-[11px]" style={{ color: '#71717a' }}>Desde</label>
          <input
            type="date"
            value={desde ?? ''}
            onChange={e => navigate({ desde: e.target.value })}
            className="rounded-lg px-2.5 py-1.5 text-[12px] outline-none"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '0.5px solid rgba(255,255,255,0.05)',
              color: '#a1a1aa',
            }}
          />
          <label className="text-[11px]" style={{ color: '#71717a' }}>Hasta</label>
          <input
            type="date"
            value={hasta ?? ''}
            onChange={e => navigate({ hasta: e.target.value })}
            className="rounded-lg px-2.5 py-1.5 text-[12px] outline-none"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '0.5px solid rgba(255,255,255,0.05)',
              color: '#a1a1aa',
            }}
          />
        </div>
      </div>
    </div>
  );
}
