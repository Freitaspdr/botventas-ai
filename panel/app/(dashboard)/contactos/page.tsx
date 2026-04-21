import { ContactsTable } from '@/components/contacts-table';
import { getContactos } from '@/lib/data';

type SearchParams = {
  q?: string;
  estado?: string;
};

export default async function ContactosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const contacts = await getContactos({ q: sp.q, estado: sp.estado });

  const withLead = contacts.filter((contact: { lead_nivel: string | null }) => !!contact.lead_nivel).length;
  const withConversation = contacts.filter((contact: { ultima_conversacion_id: string | null }) => !!contact.ultima_conversacion_id).length;
  const activeHuman = contacts.filter((contact: { ultima_conversacion_estado: string | null }) => contact.ultima_conversacion_estado === 'transferida').length;

  return (
    <div className="flex flex-col gap-5">
      <div
        className="rounded-[30px] p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(255,253,248,0.98), rgba(246,232,207,0.92) 56%, rgba(220,190,130,0.36))',
          border: '1px solid rgba(218,197,160,0.72)',
          boxShadow: '0 20px 52px rgba(116,82,28,0.1)',
        }}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[720px]">
            <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: '#9a8153' }}>
              CRM Core
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em]" style={{ color: '#2c2418' }}>
              Contactos
            </h1>
            <p className="mt-3 max-w-[560px] text-[14px]" style={{ color: '#6f604a' }}>
              Aquí ya no ves chats sueltos: ves personas. Cada contacto concentra conversaciones, leads y citas para que luego puedas reutilizar este CRM desde cualquier otro proyecto.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Total contactos', value: contacts.length, tone: '#2c2418' },
              { label: 'Con lead activo', value: withLead, tone: '#b8862f' },
              { label: 'En control humano', value: activeHuman, tone: '#a33b36' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[22px] px-4 py-3"
                style={{
                  background: 'rgba(255,253,248,0.58)',
                  border: '1px solid rgba(218,197,160,0.62)',
                }}
              >
                <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: '#9a8153' }}>
                  {item.label}
                </p>
                <p className="mt-2 text-[24px] font-semibold tracking-tight" style={{ color: item.tone }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <form
        className="grid gap-3 rounded-[24px] p-4 md:grid-cols-[1.6fr_220px_180px]"
        style={{
          background: 'linear-gradient(180deg, rgba(255,253,248,0.98), rgba(249,239,224,0.9))',
          border: '1px solid rgba(218,197,160,0.72)',
          boxShadow: '0 14px 34px rgba(116,82,28,0.08)',
        }}
      >
        <input
          type="text"
          name="q"
          defaultValue={sp.q}
          placeholder="Buscar por nombre, teléfono o nota"
          className="h-11 rounded-[16px] px-4 text-[13px] outline-none"
          style={{
            background: 'rgba(255,253,248,0.82)',
            border: '1px solid rgba(218,197,160,0.68)',
            color: '#2c2418',
          }}
        />
        <select
          name="estado"
          defaultValue={sp.estado ?? ''}
          className="h-11 rounded-[16px] px-4 text-[13px] outline-none"
          style={{
            background: 'rgba(255,253,248,0.82)',
            border: '1px solid rgba(218,197,160,0.68)',
            color: '#2c2418',
          }}
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="archivado">Archivados</option>
          <option value="bloqueado">Bloqueados</option>
        </select>
        <div className="flex items-center justify-between gap-3">
          <button
            type="submit"
            className="h-11 flex-1 rounded-[16px] text-[13px] font-medium transition-opacity hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #d7ac55, #9b6a24)',
              border: '1px solid rgba(151,102,31,0.22)',
              color: '#fffaf0',
            }}
          >
            Filtrar
          </button>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: '#9a8153' }}>
              Con conversación
            </p>
            <p className="mt-1 text-[14px] font-medium" style={{ color: '#2c2418' }}>
              {withConversation}
            </p>
          </div>
        </div>
      </form>

      <ContactsTable contacts={contacts} />
    </div>
  );
}
