import { Suspense } from 'react';
import { StatsCard } from '@/components/stats-card';
import { AnalyticsChart } from '@/components/analytics-chart';
import { getAnalyticsOverview, getAnalyticsChart, getAnalyticsServices } from '@/lib/data';

type SearchParams = { dias?: string };

interface ServiceRow {
  servicio: string;
  leads: number;
  citas: number;
  cerrados: number;
  ticketMedio: number | null;
  facturacion: number;
}

function IconUsers()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function IconReply()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>; }
function IconStar()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>; }
function IconCal()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function IconBot()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>; }

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const dias = parseInt(sp.dias ?? '30', 10);

  const [overview, chartData, services] = await Promise.all([
    getAnalyticsOverview(dias),
    getAnalyticsChart(dias),
    getAnalyticsServices(dias),
  ]);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <h1 className="text-xl font-medium tracking-tight" style={{ color: '#2c2418' }}>
        Analytics
      </h1>

      {/* KPI cards */}
      <div className="grid grid-cols-5 gap-3">
        <StatsCard
          label="Total leads"
          value={overview?.totalLeads ?? 0}
          icon={<IconUsers />}
        />
        <StatsCard
          label="Tasa respuesta"
          value={`${overview?.tasaRespuesta ?? 0}%`}
          color="#b8862f"
          icon={<IconReply />}
        />
        <StatsCard
          label="Cualificación"
          value={`${overview?.tasaCualificacion ?? 0}%`}
          color="#d9a441"
          icon={<IconStar />}
        />
        <StatsCard
          label="Lead → Cita"
          value={`${overview?.tasaCita ?? 0}%`}
          color="#4f8b5f"
          icon={<IconCal />}
        />
        <StatsCard
          label="Tasa bot"
          value={`${overview?.tasaBot ?? 100}%`}
          color="#8f7246"
          icon={<IconBot />}
          subtext={(overview?.tasaBot ?? 100) > 95 ? 'Indetectable' : undefined}
        />
      </div>

      {/* Chart */}
      <Suspense fallback={<div className="h-52 rounded-xl luxury-card" />}>
        <AnalyticsChart data={chartData ?? []} dias={dias} />
      </Suspense>

      {/* Two columns: bot rendimiento + servicios */}
      <div className="grid grid-cols-5 gap-4">

        {/* Bot performance (2 cols) */}
        <div
          className="col-span-2 rounded-xl p-4 flex flex-col gap-4"
          style={{ background: 'linear-gradient(180deg, rgba(255,253,248,0.98), rgba(249,239,224,0.92))', border: '1px solid rgba(218,197,160,0.72)' }}
        >
          <p className="text-[13px]" style={{ color: '#2c2418' }}>Rendimiento del bot</p>
          {[
            { label: 'Mensajes enviados por IA',         value: String(overview?.mensajesIA ?? 0) },
            { label: 'Conversaciones totales',            value: String(overview?.convTotal ?? 0) },
            { label: 'Escalado a humano',                 value: `${overview?.convTransfer ?? 0} (${100 - (overview?.tasaBot ?? 100)}%)` },
            { label: 'Sin intervención humana',           value: `${overview?.tasaBot ?? 100}%` },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[12px]" style={{ color: '#8a785d' }}>{label}</span>
              <span className="text-[13px] font-medium" style={{ color: '#2c2418' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Services table (3 cols) */}
        <div
          className="col-span-3 rounded-xl overflow-hidden"
          style={{ background: 'linear-gradient(180deg, rgba(255,253,248,0.98), rgba(249,239,224,0.92))', border: '1px solid rgba(218,197,160,0.72)' }}
        >
          <div
            className="px-4 py-3"
            style={{ borderBottom: '1px solid rgba(218,197,160,0.62)' }}
          >
            <p className="text-[13px]" style={{ color: '#2c2418' }}>Servicios más demandados</p>
          </div>

          {!services || services.length === 0 ? (
            <p className="px-4 py-8 text-center text-[12px]" style={{ color: '#8a785d' }}>Sin datos</p>
          ) : (
            <div>
              {/* Table header */}
              <div
                className="grid px-4 py-2 text-[9px] uppercase tracking-wider"
                style={{
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                  color: '#9a8153',
                  borderBottom: '1px solid rgba(218,197,160,0.62)',
                }}
              >
                <span>Servicio</span>
                <span className="text-right">Leads</span>
                <span className="text-right">Citas</span>
                <span className="text-right">Cerrados</span>
                <span className="text-right">Ticket</span>
              </div>

              {(services as ServiceRow[]).map(row => (
                <div
                  key={row.servicio}
                  className="grid px-4 py-2.5"
                  style={{
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                    borderBottom: '1px solid rgba(234,220,198,0.72)',
                  }}
                >
                  <span className="text-[12px] truncate" style={{ color: '#2c2418' }}>{row.servicio}</span>
                  <span className="text-[12px] text-right" style={{ color: '#8a785d' }}>{row.leads}</span>
                  <span className="text-[12px] text-right" style={{ color: '#b8862f' }}>{row.citas}</span>
                  <span className="text-[12px] text-right" style={{ color: '#4f8b5f' }}>{row.cerrados}</span>
                  <span className="text-[12px] text-right" style={{ color: row.ticketMedio ? '#9b6a24' : '#9a8a72' }}>
                    {row.ticketMedio ? `€${row.ticketMedio.toLocaleString('es-ES')}` : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
