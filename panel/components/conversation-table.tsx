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
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function getInitials(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function avatarStyle(nivel?: string | null, estado?: string) {
  if (estado === 'transferida') return { bg: 'linear-gradient(135deg,#f8ded9,#f2b8ae)', color: '#8f2f2a' };
  if (nivel === 'alto') return { bg: 'linear-gradient(135deg,#e1f0df,#b9d9b5)', color: '#315f3d' };
  if (nivel === 'medio') return { bg: 'linear-gradient(135deg,#f3e3bf,#dfbd73)', color: '#704a14' };
  return { bg: 'linear-gradient(135deg,#f8efe0,#ead5ad)', color: '#6f5632' };
}

const estadoBadge: Record<string, { bg: string; color: string; label: string }> = {
  activa: { bg: '#dfeedd', color: '#3f744d', label: 'Activa' },
  cerrada: { bg: '#f4ead9', color: '#8a785d', label: 'Cerrada' },
  transferida: { bg: '#f8ded9', color: '#a33b36', label: 'Transferida' },
};

export function ConversationTable({ conversations }: { conversations: Conv[] }) {
  if (conversations.length === 0) {
    return (
      <div
        className="rounded-[26px] py-16 text-center text-[13px]"
        style={{
          color: '#8a785d',
          background: 'linear-gradient(180deg, rgba(255,253,248,0.96), rgba(249,239,224,0.9))',
          border: '1px solid rgba(218,197,160,0.72)',
        }}
      >
        Sin conversaciones registradas.
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-[26px]"
      style={{
        border: '1px solid rgba(218,197,160,0.72)',
        background: 'linear-gradient(180deg, rgba(255,253,248,0.98), rgba(249,239,224,0.92))',
        boxShadow: '0 14px 34px rgba(116,82,28,0.08)',
      }}
    >
      <div
        className="grid px-5 py-4 text-[10px] uppercase tracking-[0.2em]"
        style={{
          gridTemplateColumns: '2.2fr 2fr 1fr 1fr 1fr 100px',
          color: '#9a8153',
          borderBottom: '1px solid rgba(218,197,160,0.62)',
          background: 'rgba(248,239,224,0.58)',
        }}
      >
        <span>Cliente</span>
        <span>Último mensaje</span>
        <span>Estado</span>
        <span>Score</span>
        <span>Seguimiento</span>
        <span className="text-right">Actividad</span>
      </div>

      {conversations.map((conv) => {
        const av = avatarStyle(conv.lead_nivel, conv.estado);
        const badge = estadoBadge[conv.estado] ?? estadoBadge.cerrada;
        const score = conv.lead_score ?? 0;
        const scoreColor = score > 70 ? '#4f8b5f' : score > 40 ? '#b8862f' : '#b8a789';

        return (
          <Link
            key={conv.id}
            href={`/conversaciones/${conv.id}`}
            className="grid items-center px-5 py-4 transition-colors hover:bg-[#fbf5ea]"
            style={{
              gridTemplateColumns: '2.2fr 2fr 1fr 1fr 1fr 100px',
              borderBottom: '1px solid rgba(234,220,198,0.72)',
            }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex-shrink-0">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-[16px] text-[11px] font-semibold"
                  style={{ background: av.bg, color: av.color }}
                >
                  {getInitials(conv.cliente_nombre)}
                </div>
                {conv.estado === 'activa' && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full"
                    style={{ background: '#4f8b5f', border: '2px solid #fffdfa' }}
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium" style={{ color: '#2c2418' }}>
                  {conv.cliente_nombre || 'Sin nombre'}
                </p>
                <p className="truncate text-[11px]" style={{ color: '#8a785d' }}>
                  {conv.cliente_tel}
                </p>
              </div>
            </div>

            <div className="min-w-0 pr-5">
              <p className="truncate text-[12px]" style={{ color: '#5f513e' }}>
                {conv.ultimo_mensaje ?? '—'}
              </p>
              <p className="mt-1 text-[10px]" style={{ color: '#9a8a72' }}>
                {conv.total_mensajes} mensajes
              </p>
            </div>

            <div>
              <span
                className="rounded-full px-3 py-1 text-[10px] font-medium"
                style={{ background: badge.bg, color: badge.color }}
              >
                {badge.label}
              </span>
            </div>

            <div className="pr-5">
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span style={{ color: '#5f513e' }}>{score}</span>
                {conv.lead_nivel && (
                  <span style={{ color: '#9a8a72' }}>{conv.lead_nivel}</span>
                )}
              </div>
              <div className="h-[6px] overflow-hidden rounded-full" style={{ background: '#eadcc6' }}>
                <div className="h-full rounded-full" style={{ width: `${score}%`, background: scoreColor }} />
              </div>
            </div>

            <div>
              <span
                className="rounded-full px-3 py-1 text-[10px] font-medium"
                style={{
                  background: conv.nurturing_step > 0 ? '#f3e3bf' : '#f4ead9',
                  color: conv.nurturing_step > 0 ? '#704a14' : '#8a785d',
                }}
              >
                {conv.nurturing_step > 0 ? `Paso ${conv.nurturing_step}/4` : 'En curso'}
              </span>
            </div>

            <span className="text-right text-[11px]" style={{ color: '#8a785d' }}>
              {timeAgo(conv.actualizada_en)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
