import Link from 'next/link';
import { ChatViewer } from '@/components/chat-viewer';
import { TakeControlButton } from '@/components/take-control-button';

interface Lead {
  id: string;
  nivel: string;
  estado: string;
  interes: string | null;
  notas: string | null;
  score: number | null;
  ticket_estimado: number | null;
  vehiculo: string | null;
  creado_en: string;
}

interface Cita {
  id: string;
  servicio: string;
  fecha_hora: string;
  estado: string;
}

interface ConvData {
  conversacion: {
    id: string;
    cliente_nombre: string;
    cliente_tel: string;
    estado: string;
    es_hot_lead: boolean;
    nurturing_step: number;
    creado_en: string;
    actualizada_en: string;
  };
  mensajes: { rol: 'user' | 'assistant'; contenido: string; enviado_en: string }[];
  lead: Lead | null;
  cita: Cita | null;
}

async function getConversacion(id: string): Promise<ConvData | null> {
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/conversaciones/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function nivelBadge(nivel: string) {
  const map: Record<string, { bg: string; color: string }> = {
    alto:  { bg: 'rgba(34,197,94,0.1)',  color: '#4ade80' },
    medio: { bg: 'rgba(245,158,11,0.1)', color: '#fbbf24' },
    bajo:  { bg: 'rgba(255,255,255,0.04)', color: '#a1a1aa' },
  };
  return map[nivel] ?? map.bajo;
}

function estadoBadge(estado: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    activa:      { bg: 'rgba(34,197,94,0.1)',   color: '#4ade80', label: 'Activa' },
    cerrada:     { bg: 'rgba(255,255,255,0.04)', color: '#a1a1aa', label: 'Cerrada' },
    transferida: { bg: 'rgba(239,68,68,0.1)',   color: '#f87171', label: 'Transferida' },
  };
  return map[estado] ?? map.cerrada;
}

function getInitials(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function scoreColor(s: number) {
  if (s > 70) return '#22c55e';
  if (s > 40) return '#f59e0b';
  return '#a1a1aa';
}

export default async function ConversacionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getConversacion(id);

  if (!data) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/conversaciones"
          className="flex items-center gap-1.5 text-[12px] transition-colors hover:text-[#a1a1aa]"
          style={{ color: '#a1a1aa' }}
        >
          ← Conversaciones
        </Link>
        <p className="text-[13px]" style={{ color: '#71717a' }}>Conversación no encontrada.</p>
      </div>
    );
  }

  const { conversacion: conv, mensajes, lead, cita } = data;
  const badgeEst = estadoBadge(conv.estado);
  const score = lead?.score ?? 0;
  const initials = getInitials(conv.cliente_nombre);

  const avatarBg = conv.estado === 'transferida'
    ? 'linear-gradient(135deg,#450a0a,#7f1d1d)'
    : lead?.nivel === 'alto'
      ? 'linear-gradient(135deg,#064e3b,#065f46)'
      : lead?.nivel === 'medio'
        ? 'linear-gradient(135deg,#1e1b4b,#312e81)'
        : 'rgba(255,255,255,0.04)';

  const avatarColor = conv.estado === 'transferida' ? '#fca5a5'
    : lead?.nivel === 'alto' ? '#6ee7b7'
    : lead?.nivel === 'medio' ? '#a5b4fc'
    : '#a1a1aa';

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12px]">
        <Link
          href="/conversaciones"
          className="transition-colors hover:text-[#a1a1aa]"
          style={{ color: '#a1a1aa' }}
        >
          Conversaciones
        </Link>
        <span style={{ color: '#71717a' }}>/</span>
        <span style={{ color: '#a1a1aa' }}>
          {conv.cliente_nombre || conv.cliente_tel}
        </span>
      </div>

      {/* Two columns */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 280px' }}>

        {/* ── Left: Chat ── */}
        <div
          className="rounded-xl flex flex-col overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: '0.5px solid rgba(255,255,255,0.05)',
          }}
        >
          {/* Chat header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[10px] font-medium select-none"
                style={{ background: avatarBg, color: avatarColor }}
              >
                {initials}
              </div>
              <div>
                <p className="text-[13px] font-medium" style={{ color: '#fafafa' }}>
                  {conv.cliente_nombre || 'Sin nombre'}
                </p>
                <p className="text-[11px]" style={{ color: '#a1a1aa' }}>
                  {conv.cliente_tel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Estado badge */}
              <span
                className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                style={{ background: badgeEst.bg, color: badgeEst.color }}
              >
                {badgeEst.label}
              </span>

              {/* HOT badge */}
              {conv.es_hot_lead && (
                <span
                  className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80' }}
                >
                  HOT
                </span>
              )}

              {/* Cita badge */}
              {cita && (
                <span
                  className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}
                >
                  Cita {new Date(cita.fecha_hora).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </span>
              )}

              {/* Tomar control button */}
              {conv.estado !== 'transferida' && (
                <TakeControlButton convId={conv.id} tel={conv.cliente_tel} />
              )}
            </div>
          </div>

          {/* Messages */}
          <ChatViewer mensajes={mensajes} />
        </div>

        {/* ── Right: Lead card ── */}
        <div
          className="rounded-xl flex flex-col overflow-hidden h-fit"
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: '0.5px solid rgba(255,255,255,0.05)',
          }}
        >
          {/* Avatar + nombre */}
          <div
            className="flex flex-col items-center gap-2 px-4 py-5"
            style={{ borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}
          >
            <div
              className="w-12 h-12 rounded-[10px] flex items-center justify-center text-[14px] font-medium select-none"
              style={{ background: avatarBg, color: avatarColor }}
            >
              {initials}
            </div>
            <p className="text-[14px] font-medium text-center" style={{ color: '#fafafa' }}>
              {conv.cliente_nombre || 'Sin nombre'}
            </p>
            <a
              href={`https://wa.me/${conv.cliente_tel.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="text-[12px] transition-colors hover:text-[#4ade80]"
              style={{ color: '#a1a1aa' }}
            >
              {conv.cliente_tel}
            </a>
          </div>

          {/* Lead data */}
          <div className="px-4 py-3 flex flex-col gap-3">
            {lead && (
              <>
                {/* Nivel */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px]" style={{ color: '#a1a1aa' }}>Nivel</span>
                  <span
                    className="text-[9px] font-medium px-1.5 py-0.5 rounded capitalize"
                    style={nivelBadge(lead.nivel)}
                  >
                    {lead.nivel}
                  </span>
                </div>

                {/* Vehículo */}
                {lead.vehiculo && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px]" style={{ color: '#a1a1aa' }}>Vehículo</span>
                    <span className="text-[12px] text-right" style={{ color: '#a1a1aa' }}>{lead.vehiculo}</span>
                  </div>
                )}

                {/* Interés */}
                {lead.interes && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px]" style={{ color: '#a1a1aa' }}>Interés</span>
                    <span className="text-[12px] text-right" style={{ color: '#a1a1aa' }}>{lead.interes}</span>
                  </div>
                )}

                {/* Ticket */}
                {lead.ticket_estimado && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px]" style={{ color: '#a1a1aa' }}>Ticket est.</span>
                    <span className="text-[12px] font-medium" style={{ color: '#4ade80' }}>
                      €{lead.ticket_estimado.toLocaleString('es-ES')}
                    </span>
                  </div>
                )}

                {/* Lead score */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px]" style={{ color: '#a1a1aa' }}>Lead score</span>
                    <span className="text-[11px]" style={{ color: scoreColor(score) }}>{score}</span>
                  </div>
                  <div className="h-[4px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${score}%`, background: scoreColor(score) }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Nurturing */}
            <div className="flex items-center justify-between">
              <span className="text-[11px]" style={{ color: '#a1a1aa' }}>Nurturing</span>
              <span className="text-[12px]" style={{ color: conv.nurturing_step > 0 ? '#fbbf24' : '#71717a' }}>
                {conv.nurturing_step > 0 ? `Paso ${conv.nurturing_step}/4` : 'No necesario'}
              </span>
            </div>

            {/* Inicio */}
            <div className="flex items-center justify-between">
              <span className="text-[11px]" style={{ color: '#a1a1aa' }}>Inicio</span>
              <span className="text-[12px]" style={{ color: '#a1a1aa' }}>
                {new Date(conv.creado_en).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Transfer button */}
          {conv.estado !== 'transferida' && (
            <div className="px-4 pb-4">
              <TakeControlButton convId={conv.id} tel={conv.cliente_tel} variant="full" />
            </div>
          )}

          {conv.estado === 'transferida' && (
            <div className="px-4 pb-4">
              <div
                className="rounded-lg px-3 py-2 text-center text-[12px]"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}
              >
                Esperando tu respuesta
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
