import { LeadsKanban } from '@/components/leads-kanban';

async function getData() {
  const base = process.env.NEXTAUTH_URL ?? 'http://localhost:3001';
  const [leadsRes, revenueRes, statsRes] = await Promise.all([
    fetch(`${base}/api/leads`, { cache: 'no-store' }),
    fetch(`${base}/api/dashboard/revenue`, { cache: 'no-store' }),
    fetch(`${base}/api/dashboard/stats`, { cache: 'no-store' }),
  ]);

  const leads   = leadsRes.ok   ? await leadsRes.json()   : [];
  const revenue = revenueRes.ok ? await revenueRes.json() : null;
  const stats   = statsRes.ok   ? await statsRes.json()   : null;

  // Ticket medio de leads con ticket_estimado
  const leadsConTicket = leads.filter((l: { ticket_estimado?: number }) => l.ticket_estimado);
  const ticketMedio = leadsConTicket.length > 0
    ? Math.round(leadsConTicket.reduce((s: number, l: { ticket_estimado: number }) => s + l.ticket_estimado, 0) / leadsConTicket.length)
    : 0;

  return {
    leads,
    metrics: {
      ticketMedio,
      facturacion: revenue?.mesActual ?? 0,
      tasaBot: stats?.tasaBot?.value ?? 100,
    },
  };
}

export default async function LeadsPage() {
  const { leads, metrics } = await getData();
  const total = leads.length;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-medium tracking-tight" style={{ color: '#fafafa' }}>
            Leads
          </h1>
          <span
            className="text-[9px] font-medium px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#a1a1aa' }}
          >
            {total}
          </span>
        </div>

        <a
          href="/api/leads/export"
          download
          className="flex items-center gap-1.5 text-[12px] px-3 py-2 rounded-[10px] transition-colors hover:bg-white/[0.04]"
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: '0.5px solid rgba(255,255,255,0.05)',
            color: '#a1a1aa',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Exportar CSV
        </a>
      </div>

      <LeadsKanban initialLeads={leads} metrics={metrics} />
    </div>
  );
}
