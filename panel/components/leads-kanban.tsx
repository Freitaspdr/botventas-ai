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
  { key: 'nuevo',      label: 'Nuevos',     color: '#3b82f6' },
  { key: 'contactado', label: 'Contactados', color: '#f59e0b' },
  { key: 'cerrado',    label: 'Cerrados',    color: '#22c55e' },
  { key: 'perdido',    label: 'Perdidos',    color: '#a1a1aa' },
] as const;

const NIVEL_BADGE: Record<string, { bg: string; color: string }> = {
  alto:  { bg: 'rgba(34,197,94,0.1)',   color: '#4ade80' },
  medio: { bg: 'rgba(245,158,11,0.1)',  color: '#fbbf24' },
  bajo:  { bg: 'rgba(255,255,255,0.04)', color: '#a1a1aa' },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60)  return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30)  return `${d}d`;
  return `${Math.floor(d / 30)}m`;
}

function LeadCard({ lead, onMove }: { lead: Lead; onMove: (id: string, estado: string) => void }) {
  const [open, setOpen] = useState(false);
  const nb = NIVEL_BADGE[lead.nivel] ?? NIVEL_BADGE.bajo;
  const isPerdido = lead.estado === 'perdido';

  return (
    <div
      className="rounded-[10px] p-3 flex flex-col gap-2 cursor-pointer transition-colors hover:border-white/[0.08]"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '0.5px solid rgba(255,255,255,0.05)',
        opacity: isPerdido ? 0.7 : 1,
      }}
      onClick={() => setOpen(!open)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-medium truncate" style={{ color: '#e4e4e7' }}>
            {lead.cliente_nombre || lead.cliente_tel}
          </p>
          {lead.interes && (
            <p className="text-[11px] truncate mt-0.5" style={{ color: '#a1a1aa' }}>
              {lead.interes}
            </p>
          )}
        </div>
        <span
          className="text-[9px] font-medium px-1.5 py-0.5 rounded capitalize flex-shrink-0"
          style={nb}
        >
          {lead.nivel}
        </span>
      </div>

      {/* Details */}
      <div className="flex items-center gap-2 flex-wrap">
        {lead.vehiculo && (
          <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.04)', color: '#a1a1aa' }}>
            {lead.vehiculo}
          </span>
        )}
        {lead.ticket_estimado && (
          <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'rgba(34,197,94,0.08)', color: '#4ade80' }}>
            €{lead.ticket_estimado.toLocaleString('es-ES')}
          </span>
        )}
        {lead.cita_fecha && (
          <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>
            Cita {new Date(lead.cita_fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </span>
        )}
        {(lead.nurturing_step ?? 0) > 0 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24' }}>
            Nurturing {lead.nurturing_step}/4
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-[10px]" style={{ color: '#71717a' }}>
          Hace {timeAgo(lead.creado_en)}
        </span>
        {lead.conv_id && (
          <Link
            href={`/conversaciones/${lead.conv_id}`}
            className="text-[10px] transition-colors hover:text-[#4ade80]"
            style={{ color: '#a1a1aa' }}
            onClick={e => e.stopPropagation()}
          >
            Ver chat →
          </Link>
        )}
      </div>

      {/* Move actions */}
      {open && (
        <div
          className="pt-2 flex flex-col gap-1"
          style={{ borderTop: '0.5px solid rgba(255,255,255,0.05)' }}
          onClick={e => e.stopPropagation()}
        >
          <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: '#71717a' }}>Mover a</p>
          {COLUMNS.filter(c => c.key !== lead.estado).map(col => (
            <button
              key={col.key}
              onClick={() => { onMove(lead.id, col.key); setOpen(false); }}
              className="text-left text-[11px] px-2 py-1 rounded-lg transition-colors hover:bg-white/[0.04]"
              style={{ color: '#a1a1aa' }}
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
    setLeads(prev => prev.map(l => l.id === id ? { ...l, estado } : l));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Columns */}
      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map(col => {
          const colLeads = leads.filter(l => l.estado === col.key);
          return (
            <div key={col.key} className="flex flex-col gap-2">
              {/* Column header */}
              <div className="flex items-center justify-between px-0.5 pb-1" style={{ borderBottom: `2px solid ${col.color}` }}>
                <span className="text-[12px] font-medium" style={{ color: '#a1a1aa' }}>{col.label}</span>
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#a1a1aa' }}
                >
                  {colLeads.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2">
                {colLeads.length === 0 ? (
                  <div
                    className="rounded-[10px] p-4 text-center text-[11px]"
                    style={{ border: '0.5px dashed rgba(255,255,255,0.05)', color: '#71717a' }}
                  >
                    Sin leads
                  </div>
                ) : (
                  colLeads.map(lead => (
                    <LeadCard key={lead.id} lead={lead} onMove={moveCard} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer metrics bar */}
      <div
        className="rounded-xl px-5 py-3 flex items-center gap-8"
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '0.5px solid rgba(255,255,255,0.05)',
        }}
      >
        <div>
          <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: '#71717a' }}>Ticket medio</p>
          <p className="text-[15px] font-medium" style={{ color: '#4ade80' }}>
            {metrics.ticketMedio ? `€${metrics.ticketMedio.toLocaleString('es-ES')}` : '—'}
          </p>
        </div>
        <div className="h-6 w-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div>
          <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: '#71717a' }}>Facturación mes</p>
          <p className="text-[15px] font-medium" style={{ color: '#fafafa' }}>
            {metrics.facturacion ? `€${metrics.facturacion.toLocaleString('es-ES')}` : '€0'}
          </p>
        </div>
        <div className="h-6 w-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div>
          <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: '#71717a' }}>Tasa bot</p>
          <p className="text-[15px] font-medium" style={{ color: '#4ade80' }}>{metrics.tasaBot}%</p>
        </div>
        <div className="h-6 w-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div>
          <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: '#71717a' }}>Conversión cierre</p>
          <p className="text-[15px] font-medium" style={{ color: '#c4b5fd' }}>
            {leads.length > 0 ? Math.round((leads.filter(l => l.estado === 'cerrado').length / leads.length) * 100) : 0}%
          </p>
        </div>
      </div>
    </div>
  );
}
