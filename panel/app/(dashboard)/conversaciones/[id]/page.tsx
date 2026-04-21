import Link from 'next/link';
import { ArrowUpRight, CircleDot, Phone, ShieldAlert } from 'lucide-react';
import { ChatViewer } from '@/components/chat-viewer';
import { ConversationComposer } from '@/components/conversation-composer';
import { TakeControlButton } from '@/components/take-control-button';
import { getConversacionDetalle } from '@/lib/data';

function stateTone(estado: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    activa: { bg: '#dfeedd', color: '#3f744d', label: 'Activa' },
    cerrada: { bg: '#f4ead9', color: '#8a785d', label: 'Cerrada' },
    transferida: { bg: '#f8ded9', color: '#a33b36', label: 'Humano' },
  };
  return map[estado] ?? map.cerrada;
}

function leadTone(nivel?: string | null) {
  if (nivel === 'alto') return { bg: '#dfeedd', color: '#3f744d', label: 'Hot lead' };
  if (nivel === 'medio') return { bg: '#f3e3bf', color: '#704a14', label: 'Warm lead' };
  return { bg: '#f4ead9', color: '#8a785d', label: 'Sin lead' };
}

function scoreColor(score: number) {
  if (score > 70) return '#4f8b5f';
  if (score > 40) return '#b8862f';
  return '#b8a789';
}

function initials(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map((word) => word[0]).join('').toUpperCase();
}

function formatCompactDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
}

export default async function ConversacionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getConversacionDetalle(id);

  if (!data) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/conversaciones"
          className="flex items-center gap-1.5 text-[12px] transition-colors hover:text-[#79521d]"
          style={{ color: '#8a785d' }}
        >
          ← Conversaciones
        </Link>
        <p className="text-[13px]" style={{ color: '#7b8a86' }}>
          Conversación no encontrada.
        </p>
      </div>
    );
  }

  const { conversacion: conv, contacto, mensajes, lead, cita } = data;
  const state = stateTone(conv.estado);
  const leadBadge = leadTone(lead?.nivel);
  const score = lead?.score ?? 0;
  const avatarLabel = initials(conv.cliente_nombre || contacto?.nombre);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-[12px]" style={{ color: '#8a785d' }}>
        <Link href="/conversaciones" className="transition-colors hover:text-[#79521d]">
          Conversaciones
        </Link>
        <span>/</span>
        <span style={{ color: '#2c2418' }}>{conv.cliente_nombre || conv.cliente_tel}</span>
      </div>

      <div
        className="rounded-[30px] p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(255,253,248,0.98), rgba(246,232,207,0.92) 56%, rgba(220,190,130,0.36))',
          border: '1px solid rgba(218,197,160,0.72)',
          boxShadow: '0 20px 52px rgba(116,82,28,0.1)',
        }}
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-start gap-4">
            <div
              className="flex size-16 items-center justify-center rounded-[22px] text-[18px] font-semibold"
              style={{
                background: 'linear-gradient(135deg, #f8efe0, #ead5ad)',
                color: '#6f5632',
              }}
            >
              {avatarLabel}
            </div>
            <div className="max-w-[620px]">
              <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: '#9a8153' }}>
                Inbox CRM
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em]" style={{ color: '#2c2418' }}>
                {conv.cliente_nombre || contacto?.nombre || 'Sin nombre'}
              </h1>
              <p className="mt-3 text-[14px]" style={{ color: '#6f604a' }}>
                Conversación conectada al contacto CRM. Puedes tomar control, responder desde el panel y reutilizar este historial desde otro frontend vía API.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-3 py-1.5 text-[11px] font-medium"
              style={{ background: state.bg, color: state.color }}
            >
              {state.label}
            </span>
            <span
              className="rounded-full px-3 py-1.5 text-[11px] font-medium"
              style={{ background: leadBadge.bg, color: leadBadge.color }}
            >
              {leadBadge.label}
            </span>
            {cita && (
              <span
                className="rounded-full px-3 py-1.5 text-[11px] font-medium"
                style={{ background: '#f3e3bf', color: '#704a14' }}
              >
                Cita {formatCompactDate(cita.fecha_hora)}
              </span>
            )}
            {conv.es_hot_lead && (
              <span
                className="rounded-full px-3 py-1.5 text-[11px] font-medium"
                style={{ background: '#dfeedd', color: '#3f744d' }}
              >
                Prioridad alta
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <div className="flex flex-col gap-5">
          <div
            className="overflow-hidden rounded-[28px]"
            style={{
              background: 'linear-gradient(180deg, rgba(255,253,248,0.98), rgba(249,239,224,0.92))',
              border: '1px solid rgba(218,197,160,0.72)',
              boxShadow: '0 14px 34px rgba(116,82,28,0.08)',
            }}
          >
            <div
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              style={{ borderBottom: '1px solid rgba(218,197,160,0.62)' }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex size-10 items-center justify-center rounded-[14px]"
                  style={{ background: '#f4ead9', color: '#6f5632' }}
                >
                  {avatarLabel}
                </span>
                <div>
                  <p className="text-[13px] font-medium" style={{ color: '#2c2418' }}>
                    {conv.cliente_nombre || contacto?.nombre || 'Sin nombre'}
                  </p>
                  <p className="text-[11px]" style={{ color: '#8a785d' }}>
                    {conv.cliente_tel}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <TakeControlButton convId={conv.id} tel={conv.cliente_tel} />
                <a
                  href={`https://wa.me/${conv.cliente_tel.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-[14px] px-3 py-2 text-[11px] transition-colors hover:bg-[#f3e5ce]"
                  style={{
                    background: 'rgba(248,239,224,0.72)',
                    border: '1px solid rgba(218,197,160,0.62)',
                    color: '#79521d',
                  }}
                >
                  WhatsApp
                  <ArrowUpRight size={12} />
                </a>
              </div>
            </div>

            <ChatViewer mensajes={mensajes} />
          </div>

          <ConversationComposer convId={conv.id} disabled={conv.estado === 'cerrada'} />
        </div>

        <div className="flex flex-col gap-5">
          <div
            className="rounded-[28px] p-5"
            style={{
              background: 'linear-gradient(180deg, rgba(255,253,248,0.98), rgba(249,239,224,0.92))',
              border: '1px solid rgba(218,197,160,0.72)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex size-12 items-center justify-center rounded-[18px] text-[14px] font-semibold"
                style={{ background: '#f4ead9', color: '#6f5632' }}
              >
                {avatarLabel}
              </div>
              <div>
                <p className="text-[14px] font-medium" style={{ color: '#2c2418' }}>
                  {contacto?.nombre || conv.cliente_nombre || 'Sin nombre'}
                </p>
                <p className="text-[11px]" style={{ color: '#8a785d' }}>
                  Contacto CRM
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              {[
                { label: 'Teléfono', value: contacto?.telefono || conv.cliente_tel },
                { label: 'Origen', value: contacto?.origen || 'bot' },
                { label: 'Estado contacto', value: contacto?.estado || 'activo' },
                { label: 'Inicio de chat', value: formatCompactDate(conv.creado_en) },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 rounded-[18px] px-3 py-3"
                  style={{ background: '#f8efe0', border: '1px solid rgba(218,197,160,0.62)' }}
                >
                  <span className="text-[11px]" style={{ color: '#8a785d' }}>
                    {item.label}
                  </span>
                  <span className="text-[12px] capitalize" style={{ color: '#2c2418' }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            {contacto?.notas && (
              <div
                className="mt-4 rounded-[18px] p-4"
                style={{ background: '#f8efe0', border: '1px solid rgba(218,197,160,0.62)' }}
              >
                <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: '#9a8153' }}>
                  Nota CRM
                </p>
                <p className="mt-2 text-[12px] leading-6" style={{ color: '#6f604a' }}>
                  {contacto.notas}
                </p>
              </div>
            )}
          </div>

          <div
            className="rounded-[28px] p-5"
            style={{
              background: 'linear-gradient(180deg, rgba(255,253,248,0.98), rgba(249,239,224,0.92))',
              border: '1px solid rgba(218,197,160,0.72)',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium" style={{ color: '#2c2418' }}>
                  Contexto comercial
                </p>
                <p className="mt-1 text-[11px]" style={{ color: '#8a785d' }}>
                  Lead, score y siguiente movimiento.
                </p>
              </div>
              <span
                className="rounded-full px-3 py-1 text-[10px] font-medium"
                style={{ background: leadBadge.bg, color: leadBadge.color }}
              >
                {leadBadge.label}
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-4">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px]" style={{ color: '#8a785d' }}>
                    Lead score
                  </span>
                  <span className="text-[12px]" style={{ color: scoreColor(score) }}>
                    {score}
                  </span>
                </div>
                <div className="h-[7px] overflow-hidden rounded-full" style={{ background: '#eadcc6' }}>
                  <div className="h-full rounded-full" style={{ width: `${score}%`, background: scoreColor(score) }} />
                </div>
              </div>

              {[
                { label: 'Estado lead', value: lead?.estado || 'Sin registrar' },
                { label: 'Interés', value: lead?.interes || 'Pendiente' },
                { label: 'Vehículo', value: lead?.vehiculo || 'Sin datos' },
                { label: 'Ticket estimado', value: lead?.ticket_estimado ? `€${lead.ticket_estimado.toLocaleString('es-ES')}` : 'No definido' },
                { label: 'Nurturing', value: conv.nurturing_step > 0 ? `Paso ${conv.nurturing_step}/4` : 'No activo' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3">
                  <span className="text-[11px]" style={{ color: '#8a785d' }}>
                    {item.label}
                  </span>
                  <span className="max-w-[58%] text-right text-[12px]" style={{ color: '#2c2418' }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-[28px] p-5"
            style={{
              background: 'linear-gradient(180deg, rgba(255,253,248,0.98), rgba(249,239,224,0.92))',
              border: '1px solid rgba(218,197,160,0.72)',
            }}
          >
            <div className="flex items-start gap-3">
              <span
                className="mt-0.5 flex size-9 items-center justify-center rounded-[14px]"
                style={{ background: '#f3e3bf', color: '#704a14' }}
              >
                <ShieldAlert size={16} />
              </span>
              <div>
                <p className="text-[13px] font-medium" style={{ color: '#2c2418' }}>
                  Acción recomendada
                </p>
                <p className="mt-2 text-[12px] leading-6" style={{ color: '#6f604a' }}>
                  {conv.estado === 'transferida'
                    ? 'La conversación ya está en modo humano. Responde desde el composer para mantener el historial centralizado.'
                    : 'Si vas a negociar precio, resolver objeciones o cerrar la cita, toma control antes de responder para que el bot no interfiera.'}
                </p>
                <div className="mt-4 flex items-center gap-2 text-[11px]" style={{ color: '#8a785d' }}>
                  <CircleDot size={12} />
                  {cita ? `Siguiente hito: cita ${formatCompactDate(cita.fecha_hora)}` : 'Siguiente hito: convertir en cita o cierre'}
                </div>
                <div className="mt-4">
                  <a
                    href={`tel:${conv.cliente_tel}`}
                    className="inline-flex items-center gap-2 rounded-[14px] px-3 py-2 text-[11px] transition-colors hover:bg-[#f3e5ce]"
                    style={{
                      background: 'rgba(248,239,224,0.72)',
                      border: '1px solid rgba(218,197,160,0.62)',
                      color: '#79521d',
                    }}
                  >
                    <Phone size={12} />
                    Llamar
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
