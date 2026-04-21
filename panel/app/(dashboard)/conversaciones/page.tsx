import { ConversationTable } from '@/components/conversation-table';
import { ConversacionesFilters } from '@/components/conversaciones-filters';
import { getConversaciones } from '@/lib/data';

type SearchParams = { estado?: string; desde?: string; hasta?: string; q?: string };

export default async function ConversacionesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const conversations = await getConversaciones(sp);
  const activas = conversations.filter((c: { estado: string }) => c.estado === 'activa').length;

  return (
    <div className="flex flex-col gap-5">
      <div
        className="rounded-[28px] p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(255,253,248,0.98), rgba(246,232,207,0.92) 56%, rgba(220,190,130,0.36))',
          border: '1px solid rgba(218,197,160,0.72)',
          boxShadow: '0 20px 52px rgba(116,82,28,0.1)',
        }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-[-0.05em]" style={{ color: '#2c2418' }}>
            Conversaciones
          </h1>
          {activas > 0 && (
            <span
              className="rounded-full px-3 py-1 text-[10px] font-medium"
              style={{ background: '#dfeedd', color: '#3f744d' }}
            >
              {activas} activas
            </span>
          )}
        </div>
        <p className="mt-3 text-[14px]" style={{ color: '#6f604a' }}>
          Revisa actividad reciente, estado del lead y seguimientos activos desde una sola tabla.
        </p>
      </div>
      <ConversacionesFilters
        estado={sp.estado}
        desde={sp.desde}
        hasta={sp.hasta}
        q={sp.q}
      />
      <ConversationTable conversations={conversations} />
    </div>
  );
}
