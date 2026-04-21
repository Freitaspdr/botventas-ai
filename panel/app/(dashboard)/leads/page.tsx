import { LeadsKanban } from '@/components/leads-kanban';
import { getLeads, getDashboardRevenue, getDashboardStats } from '@/lib/data';

async function getData() {
  const [leads, revenue, stats] = await Promise.all([
    getLeads(),
    getDashboardRevenue(),
    getDashboardStats(),
  ]);

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
      <div
        className="flex items-center justify-between rounded-[28px] p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(255,253,248,0.98), rgba(246,232,207,0.92) 56%, rgba(220,190,130,0.36))',
          border: '1px solid rgba(218,197,160,0.72)',
          boxShadow: '0 20px 52px rgba(116,82,28,0.1)',
        }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-[-0.05em]" style={{ color: '#2c2418' }}>
            Leads
          </h1>
          <span
            className="rounded-full px-3 py-1 text-[10px] font-medium"
            style={{ background: '#f3e3bf', color: '#704a14' }}
          >
            {total}
          </span>
        </div>

        <a
          href="/api/leads/export"
          download
          className="flex items-center gap-1.5 text-[12px] px-4 py-2.5 rounded-[16px] transition-colors hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, #d7ac55, #9b6a24)',
            border: '1px solid rgba(151,102,31,0.22)',
            color: '#fffaf0',
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
