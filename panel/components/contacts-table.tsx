import Link from 'next/link';

interface Contact {
  id: string;
  telefono: string;
  nombre: string | null;
  estado: string;
  origen: string;
  etiquetas: string[] | null;
  notas: string | null;
  ultima_interaccion_en: string | null;
  total_conversaciones: number;
  total_leads: number;
  total_citas: number;
  lead_estado: string | null;
  lead_nivel: string | null;
  ultima_conversacion_id: string | null;
  ultima_conversacion_estado: string | null;
}

function timeAgo(iso?: string | null) {
  if (!iso) return 'Sin actividad';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'Ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function initials(name?: string | null) {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function leadTone(level?: string | null) {
  if (level === 'alto') return { bg: '#dfeedd', color: '#3f744d', label: 'Hot' };
  if (level === 'medio') return { bg: '#f3e3bf', color: '#704a14', label: 'Warm' };
  return { bg: '#f4ead9', color: '#8a785d', label: 'Sin lead' };
}

function stateTone(state?: string | null) {
  if (state === 'transferida') return { bg: '#f8ded9', color: '#a33b36', label: 'Humano' };
  if (state === 'activa') return { bg: '#dfeedd', color: '#3f744d', label: 'Activa' };
  if (state === 'cerrada') return { bg: '#f4ead9', color: '#8a785d', label: 'Cerrada' };
  return { bg: '#f4ead9', color: '#8a785d', label: 'Sin chat' };
}

export function ContactsTable({ contacts }: { contacts: Contact[] }) {
  if (contacts.length === 0) {
    return (
      <div
        className="rounded-[28px] py-18 text-center text-[13px]"
        style={{
          background: 'linear-gradient(180deg, rgba(255,253,248,0.96), rgba(249,239,224,0.9))',
          border: '1px solid rgba(218,197,160,0.72)',
          color: '#8a785d',
        }}
      >
        Sin contactos todavía.
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-[28px]"
      style={{
        background: 'linear-gradient(180deg, rgba(255,253,248,0.98), rgba(249,239,224,0.92))',
        border: '1px solid rgba(218,197,160,0.72)',
        boxShadow: '0 14px 34px rgba(116,82,28,0.08)',
      }}
    >
      <div
        className="grid px-5 py-4 text-[10px] uppercase tracking-[0.2em]"
        style={{
          gridTemplateColumns: '2.2fr 1.1fr 1fr 0.9fr 1fr 120px',
          color: '#9a8153',
          borderBottom: '1px solid rgba(218,197,160,0.62)',
          background: 'rgba(248,239,224,0.58)',
        }}
      >
        <span>Contacto</span>
        <span>Estado CRM</span>
        <span>Actividad</span>
        <span>Pipeline</span>
        <span>Última nota</span>
        <span className="text-right">Acción</span>
      </div>

      {contacts.map((contact) => {
        const lead = leadTone(contact.lead_nivel);
        const state = stateTone(contact.ultima_conversacion_estado);

        return (
          <div
            key={contact.id}
            className="grid items-center px-5 py-4"
            style={{
              gridTemplateColumns: '2.2fr 1.1fr 1fr 0.9fr 1fr 120px',
              borderBottom: '1px solid rgba(234,220,198,0.72)',
            }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="flex size-11 items-center justify-center rounded-[16px] text-[11px] font-semibold"
                style={{
                  background: 'linear-gradient(135deg, #f8efe0, #ead5ad)',
                  color: '#6f5632',
                }}
              >
                {initials(contact.nombre)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium" style={{ color: '#2c2418' }}>
                  {contact.nombre || 'Sin nombre'}
                </p>
                <p className="truncate text-[11px]" style={{ color: '#8a785d' }}>
                  {contact.telefono}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className="rounded-full px-3 py-1 text-[10px] font-medium"
                style={{ background: state.bg, color: state.color }}
              >
                {state.label}
              </span>
              <span
                className="rounded-full px-3 py-1 text-[10px] font-medium"
                style={{ background: lead.bg, color: lead.color }}
              >
                {lead.label}
              </span>
            </div>

            <div>
              <p className="text-[12px]" style={{ color: '#5f513e' }}>
                {timeAgo(contact.ultima_interaccion_en)}
              </p>
              <p className="mt-1 text-[10px]" style={{ color: '#9a8a72' }}>
                {contact.total_conversaciones} conversaciones
              </p>
            </div>

            <div>
              <p className="text-[12px]" style={{ color: '#5f513e' }}>
                {contact.total_leads} leads
              </p>
              <p className="mt-1 text-[10px]" style={{ color: '#9a8a72' }}>
                {contact.total_citas} citas
              </p>
            </div>

            <div className="pr-4">
              <p className="line-clamp-2 text-[12px]" style={{ color: '#6f604a' }}>
                {contact.notas || 'Sin notas CRM. Puedes empezar desde la conversación.'}
              </p>
            </div>

            <div className="flex justify-end">
              {contact.ultima_conversacion_id ? (
                <Link
                  href={`/conversaciones/${contact.ultima_conversacion_id}`}
                  className="rounded-full px-3 py-2 text-[11px] font-medium transition-colors hover:bg-[#f3e5ce]"
                  style={{
                    background: 'rgba(248,239,224,0.72)',
                    border: '1px solid rgba(218,197,160,0.62)',
                    color: '#79521d',
                  }}
                >
                  Abrir inbox
                </Link>
              ) : (
                <span className="text-[11px]" style={{ color: '#8a785d' }}>
                  Sin chat
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
