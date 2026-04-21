'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const ESTADOS = [
  { value: '', label: 'Todas' },
  { value: 'activa', label: 'Activas' },
  { value: 'transferida', label: 'Transferidas' },
  { value: 'cerrada', label: 'Cerradas' },
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
    if (merged.desde) params.set('desde', merged.desde);
    if (merged.hasta) params.set('hasta', merged.hasta);
    if (merged.q) params.set('q', merged.q);
    router.push(`/conversaciones${params.size ? `?${params}` : ''}`);
  }

  const hayFiltros = estado || desde || hasta || q;

  return (
    <div
      className="flex flex-col gap-4 rounded-[24px] p-5"
      style={{
        background: 'linear-gradient(180deg, rgba(255,253,248,0.98), rgba(249,239,224,0.9))',
        border: '1px solid rgba(218,197,160,0.72)',
        boxShadow: '0 14px 34px rgba(116,82,28,0.08)',
      }}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="flex h-12 flex-1 items-center gap-3 rounded-[18px] px-4"
          style={{
            background: 'rgba(255,253,248,0.82)',
            border: '1px solid rgba(218,197,160,0.68)',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8a785d" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Busca por nombre o teléfono…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && navigate({ q: search })}
            className="flex-1 bg-transparent text-[13px] outline-none"
            style={{ color: '#2c2418' }}
          />
          <button
            onClick={() => navigate({ q: search })}
            className="rounded-full px-3 py-1.5 text-[11px] font-medium"
            style={{ background: 'linear-gradient(135deg, #d7ac55, #9b6a24)', color: '#fffaf0' }}
          >
            Buscar
          </button>
        </div>

        {hayFiltros && (
          <button
            onClick={() => {
              setSearch('');
              router.push('/conversaciones');
            }}
            className="rounded-full px-4 py-2 text-[12px]"
            style={{
              color: '#79521d',
              background: 'rgba(248,239,224,0.72)',
              border: '1px solid rgba(218,197,160,0.62)',
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="inline-flex flex-wrap gap-2">
          {ESTADOS.map((item) => {
            const active = (estado ?? '') === item.value;
            return (
              <button
                key={item.value}
                onClick={() => navigate({ estado: item.value })}
                className="rounded-full px-4 py-2 text-[12px] font-medium transition-all"
                style={{
                  background: active ? 'linear-gradient(135deg, #d7ac55, #9b6a24)' : 'rgba(248,239,224,0.72)',
                  color: active ? '#fffaf0' : '#8a785d',
                  border: active ? '1px solid rgba(151,102,31,0.22)' : '1px solid rgba(218,197,160,0.62)',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[11px] uppercase tracking-[0.16em]" style={{ color: '#9a8153' }}>
              Desde
            </label>
            <input
              type="date"
              value={desde ?? ''}
              onChange={(e) => navigate({ desde: e.target.value })}
              className="rounded-[14px] px-3 py-2 text-[12px] outline-none"
              style={{
                background: 'rgba(255,253,248,0.82)',
                border: '1px solid rgba(218,197,160,0.68)',
                color: '#2c2418',
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] uppercase tracking-[0.16em]" style={{ color: '#9a8153' }}>
              Hasta
            </label>
            <input
              type="date"
              value={hasta ?? ''}
              onChange={(e) => navigate({ hasta: e.target.value })}
              className="rounded-[14px] px-3 py-2 text-[12px] outline-none"
              style={{
                background: 'rgba(255,253,248,0.82)',
                border: '1px solid rgba(218,197,160,0.68)',
                color: '#2c2418',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
