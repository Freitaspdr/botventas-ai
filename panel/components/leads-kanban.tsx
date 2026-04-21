'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Lead {
  id: string;
  cliente_nombre: string;
  cliente_tel: string;
  nivel: string;
  estado: string;
  interes: string | null;
  vehiculo: string | null;
  score: number | null;
  ticket_estimado: number | null;
  conv_id: string | null;
  creado_en: string;
  actualizado_en: string;
  nurturing_step: number | null;
  cita_fecha: string | null;
}

const COLUMNS = [
  { key: 'nuevo', label: 'Nuevos', subtitle: 'Entrada reciente', color: '#b8862f' },
  { key: 'contactado', label: 'Contactados', subtitle: 'Seguimiento activo', color: '#d9a441' },
  { key: 'cerrado', label: 'Cerrados', subtitle: 'Ingresos confirmados', color: '#4f8b5f' },
  { key: 'perdido', label: 'Perdidos', subtitle: 'Fuera de ciclo', color: '#9a8a72' },
] as const;

const NIVEL_BADGE: Record<string, { bg: string; color: string }> = {
  alto: { bg: '#dfeedd', color: '#3f744d' },
  medio: { bg: '#f3e3bf', color: '#704a14' },
  bajo: { bg: '#f4ead9', color: '#8a785d' },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return `${Math.floor(d / 30)}m`;
}

function LeadCard({ lead, onMove }: { lead: Lead; onMove: (id: string, estado: string) => void }) {
  const [open, setOpen] = useState(false);
  const nb = NIVEL_BADGE[lead.nivel] ?? NIVEL_BADGE.bajo;
  const score = lead.score ?? 0;
  const scoreColor = score > 70 ? '#4f8b5f' : score > 40 ? '#b8862f' : '#b8a789';

  return (
    <div
      className="cursor-pointer rounded-[22px] p-4 transition-all hover:-translate-y-0.5"
      style={{
        background: 'linear-gradient(180deg, rgba(255,253,248,0.98), rgba(249,239,224,0.92))',
        border: '1px solid rgba(218,197,160,0.68)',
        boxShadow: '0 12px 28px rgba(116,82,28,0.08)',
      }}
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium" style={{ color: '#2c2418' }}>
            {lead.cliente_nombre || lead.cliente_tel}
          </p>
          <p className="mt-1 truncate text-[11px]" style={{ color: '#8a785d' }}>
            {lead.interes || 'Lead sin interés definido'}
          </p>
        </div>
        <span className="rounded-full px-2.5 py-1 text-[10px] font-medium capitalize" style={nb}>
          {lead.nivel}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {lead.vehiculo && (
          <span className="rounded-full px-2.5 py-1 text-[10px]" style={{ background: '#f4ead9', color: '#8a785d' }}>
            {lead.vehiculo}
          </span>
        )}
        {lead.ticket_estimado && (
          <span className="rounded-full px-2.5 py-1 text-[10px] font-medium" style={{ background: '#dfeedd', color: '#3f744d' }}>
            €{lead.ticket_estimado.toLocaleString('es-ES')}
          </span>
        )}
        {lead.cita_fecha && (
          <span className="rounded-full px-2.5 py-1 text-[10px]" style={{ background: '#f3e3bf', color: '#704a14' }}>
            Cita {new Date(lead.cita_fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span style={{ color: '#8a785d' }}>Lead score</span>
          <span style={{ color: '#2c2418' }}>{score}</span>
        </div>
        <div className="h-[6px] overflow-hidden rounded-full" style={{ background: '#eadcc6' }}>
          <div className="h-full rounded-full" style={{ width: `${score}%`, background: scoreColor }} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-[10px]" style={{ color: '#9a8a72' }}>
          Hace {timeAgo(lead.creado_en)}
        </span>
        {lead.conv_id && (
          <Link
            href={`/conversaciones/${lead.conv_id}`}
            className="text-[10px] font-medium"
            style={{ color: '#79521d' }}
            onClick={(e) => e.stopPropagation()}
          >
            Abrir chat →
          </Link>
        )}
      </div>

      {open && (
        <div
          className="mt-4 flex flex-col gap-1 pt-3"
          style={{ borderTop: '1px solid rgba(218,197,160,0.62)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="mb-1 text-[10px] uppercase tracking-[0.18em]" style={{ color: '#9a8153' }}>
            Mover a
          </p>
          {COLUMNS.filter((c) => c.key !== lead.estado).map((col) => (
            <button
              key={col.key}
              onClick={() => {
                onMove(lead.id, col.key);
                setOpen(false);
              }}
              className="rounded-[14px] px-3 py-2 text-left text-[11px] transition-colors hover:bg-[#f3e5ce]"
              style={{ color: '#5f513e' }}
            >
              {col.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface FooterMetrics {
  ticketMedio: number;
  facturacion: number;
  tasaBot: number;
}

export function LeadsKanban({ initialLeads, metrics }: { initialLeads: Lead[]; metrics: FooterMetrics }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);

  async function moveCard(id: string, estado: string) {
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, estado } : l)));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const colLeads = leads.filter((l) => l.estado === col.key);
          return (
            <div
              key={col.key}
              className="flex flex-col gap-3 rounded-[26px] p-4"
              style={{
                background: 'linear-gradient(180deg, rgba(255,253,248,0.98), rgba(249,239,224,0.92))',
                border: '1px solid rgba(218,197,160,0.72)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-medium" style={{ color: '#2c2418' }}>{col.label}</p>
                  <p className="mt-1 text-[11px]" style={{ color: '#8a785d' }}>{col.subtitle}</p>
                </div>
                <span
                  className="rounded-full px-3 py-1 text-[10px] font-medium"
                  style={{ background: `${col.color}22`, color: col.color }}
                >
                  {colLeads.length}
                </span>
              </div>

              <div className="h-[4px] rounded-full" style={{ background: `${col.color}22` }}>
                <div className="h-full rounded-full" style={{ width: '100%', background: col.color }} />
              </div>

              <div className="flex flex-col gap-3">
                {colLeads.length === 0 ? (
                  <div
                    className="rounded-[20px] px-4 py-8 text-center text-[11px]"
                    style={{ border: '1px dashed rgba(218,197,160,0.72)', color: '#8a785d' }}
                  >
                    Sin leads en esta etapa
                  </div>
                ) : (
                  colLeads.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} onMove={moveCard} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="grid gap-4 rounded-[26px] p-5 md:grid-cols-4"
        style={{
          background: 'linear-gradient(135deg, rgba(255,253,248,0.98), rgba(246,232,207,0.92) 56%, rgba(220,190,130,0.28))',
          border: '1px solid rgba(218,197,160,0.72)',
        }}
      >
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: '#9a8153' }}>Ticket medio</p>
          <p className="mt-2 text-[24px] font-semibold tracking-tight" style={{ color: '#2c2418' }}>
            {metrics.ticketMedio ? `€${metrics.ticketMedio.toLocaleString('es-ES')}` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: '#9a8153' }}>Facturación mes</p>
          <p className="mt-2 text-[24px] font-semibold tracking-tight" style={{ color: '#2c2418' }}>
            €{metrics.facturacion.toLocaleString('es-ES')}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: '#9a8153' }}>Tasa bot</p>
          <p className="mt-2 text-[24px] font-semibold tracking-tight" style={{ color: '#2c2418' }}>
            {metrics.tasaBot}%
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: '#9a8153' }}>Conversión cierre</p>
          <p className="mt-2 text-[24px] font-semibold tracking-tight" style={{ color: '#2c2418' }}>
            {leads.length > 0 ? Math.round((leads.filter((l) => l.estado === 'cerrado').length / leads.length) * 100) : 0}%
          </p>
        </div>
      </div>
    </div>
  );
}
