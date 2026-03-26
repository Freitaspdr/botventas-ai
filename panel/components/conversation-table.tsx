'use client';

import Link from 'next/link';

interface Conv {
  id: string;
  cliente_nombre: string;
  cliente_tel: string;
  estado: string;
  es_hot_lead: boolean;
  nurturing_step: number;
  actualizada_en: string;
  ultimo_mensaje: string | null;
  total_mensajes: number;
  lead_nivel: string | null;
  lead_score: number | null;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function getInitials(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function avatarStyle(nivel?: string | null, estado?: string) {
  if (estado === 'transferida') return { bg: 'linear-gradient(135deg,#450a0a,#7f1d1d)', color: '#fca5a5' };
  if (nivel === 'alto')         return { bg: 'linear-gradient(135deg,#064e3b,#065f46)', color: '#6ee7b7' };
  if (nivel === 'medio')        return { bg: 'linear-gradient(135deg,#1e1b4b,#312e81)', color: '#a5b4fc' };
  return { bg: 'rgba(255,255,255,0.04)', color: '#a1a1aa' };
}

const estadoBadge: Record<string, { bg: string; color: string; label: string }> = {
  activa:      { bg: 'rgba(34,197,94,0.1)',   color: '#4ade80', label: 'Activa' },
  cerrada:     { bg: 'rgba(255,255,255,0.04)', color: '#a1a1aa', label: 'Cerrada' },
  transferida: { bg: 'rgba(239,68,68,0.1)',   color: '#f87171', label: 'Transferida' },
};

export function ConversationTable({ conversations }: { conversations: Conv[] }) {
  if (conversations.length === 0) {
    return (
      <p className="text-center py-12 text-[13px]" style={{ color: '#71717a' }}>
        Sin conversaciones registradas.
      </p>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '0.5px solid rgba(255,255,255,0.05)' }}
    >
      {/* Header row */}
      <div
        className="grid text-[10px] uppercase tracking-wider px-4 py-2.5"
        style={{
          gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 80px',
          color: '#71717a',
          borderBottom: '0.5px solid rgba(255,255,255,0.05)',
          background: 'rgba(255,255,255,0.015)',
        }}
      >
        <span>Cliente</span>
        <span>Último mensaje</span>
        <span>Estado</span>
        <span>Lead score</span>
        <span>Nurturing</span>
        <span className="text-right">Actividad</span>
      </div>

      {/* Rows */}
      {conversations.map((conv) => {
        const av = avatarStyle(conv.lead_nivel, conv.estado);
        const badge = estadoBadge[conv.estado] ?? estadoBadge.cerrada;
        const score = conv.lead_score ?? 0;

        return (
          <Link
            key={conv.id}
            href={`/conversaciones/${conv.id}`}
            className="grid items-center px-4 py-3 transition-colors hover:bg-white/[0.02]"
            style={{
              gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 80px',
              borderBottom: '0.5px solid rgba(255,255,255,0.04)',
            }}
          >
            {/* Avatar + nombre */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex-shrink-0">
                <div
                  className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[10px] font-medium select-none"
                  style={{ background: av.bg, color: av.color }}
                >
                  {getInitials(conv.cliente_nombre)}
                </div>
                {conv.estado === 'activa' && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full"
                    style={{ background: '#22c55e', border: '2px solid #09090b' }}
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium truncate" style={{ color: '#e4e4e7' }}>
                  {conv.cliente_nombre || 'Sin nombre'}
                </p>
                <p className="text-[11px] truncate" style={{ color: '#a1a1aa' }}>
                  {conv.cliente_tel}
                </p>
              </div>
            </div>

            {/* Último mensaje */}
            <p className="text-[12px] truncate pr-4" style={{ color: '#a1a1aa' }}>
              {conv.ultimo_mensaje ?? '—'}
            </p>

            {/* Estado badge */}
            <div>
              <span
                className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                style={{ background: badge.bg, color: badge.color }}
              >
                {badge.label}
              </span>
            </div>

            {/* Lead score */}
            <div className="flex items-center gap-2 pr-4">
              <div
                className="flex-1 h-[4px] rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${score}%`,
                    background: score > 70 ? '#22c55e' : score > 40 ? '#f59e0b' : '#a1a1aa',
                  }}
                />
              </div>
              <span className="text-[11px] flex-shrink-0" style={{ color: '#a1a1aa' }}>
                {score}
              </span>
            </div>

            {/* Nurturing */}
            <span className="text-[12px]" style={{ color: conv.nurturing_step > 0 ? '#fbbf24' : '#71717a' }}>
              {conv.nurturing_step > 0 ? `${conv.nurturing_step}/4` : '—'}
            </span>

            {/* Hora */}
            <span className="text-[11px] text-right" style={{ color: '#a1a1aa' }}>
              {timeAgo(conv.actualizada_en)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
