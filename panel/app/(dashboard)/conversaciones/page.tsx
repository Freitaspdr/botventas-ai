import { ConversationTable } from '@/components/conversation-table';
import { ConversacionesFilters } from '@/components/conversaciones-filters';

type SearchParams = { estado?: string; desde?: string; hasta?: string; q?: string };

async function getConversaciones(params: SearchParams) {
  const q = new URLSearchParams();
  if (params.estado) q.set('estado', params.estado);
  if (params.desde)  q.set('desde',  params.desde);
  if (params.hasta)  q.set('hasta',  params.hasta);
  if (params.q)      q.set('q',      params.q);

  try {
    const res = await fetch(
      `${process.env.NEXTAUTH_URL}/api/conversaciones${q.size ? `?${q}` : ''}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

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
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-medium tracking-tight" style={{ color: '#fafafa' }}>
          Conversaciones
        </h1>
        {activas > 0 && (
          <span
            className="text-[9px] font-medium px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80' }}
          >
            {activas} activas
          </span>
        )}
      </div>

      {/* Filters (client component for interactivity) */}
      <ConversacionesFilters
        estado={sp.estado}
        desde={sp.desde}
        hasta={sp.hasta}
        q={sp.q}
      />

      {/* Table */}
      <ConversationTable conversations={conversations} />
    </div>
  );
}
