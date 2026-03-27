import { Suspense } from 'react';
import { StatsCard } from '@/components/stats-card';
import { AnalyticsChart } from '@/components/analytics-chart';
import { getAnalyticsOverview, getAnalyticsChart, getAnalyticsServices } from '@/lib/data';

type SearchParams = { dias?: string };

interface Overview {
  totalLeads: number;
  tasaRespuesta: number;
  tasaCualificacion: number;
  tasaCita: number;
  tasaBot: number;
  mensajesIA: number;
  convTotal: number;
  convTransfer: number;
}

interface ChartPoint { fecha: string; leads: number; citas: number; conversaciones: number }

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
      <h1 className="text-xl font-medium tracking-tight" style={{ color: '#fafafa' }}>
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
          color="#60a5fa"
          icon={<IconReply />}
        />
        <StatsCard
          label="Cualificación"
          value={`${overview?.tasaCualificacion ?? 0}%`}
          color="#fbbf24"
          icon={<IconStar />}
        />
        <StatsCard
          label="Lead → Cita"
          value={`${overview?.tasaCita ?? 0}%`}
          color="#4ade80"
          icon={<IconCal />}
        />
        <StatsCard
          label="Tasa bot"
          value={`${overview?.tasaBot ?? 100}%`}
          color="#c4b5fd"
          icon={<IconBot />}
          subtext={(overview?.tasaBot ?? 100) > 95 ? 'Indetectable' : undefined}
        />
      </div>

      {/* Chart */}
      <Suspense fallback={<div className="h-52 rounded-xl" style={{ background: 'rgba(255,255,255,0.025)' }} />}>
        <AnalyticsChart data={chartData ?? []} dias={dias} />
      </Suspense>

      {/* Two columns: bot rendimiento + servicios */}
      <div className="grid grid-cols-5 gap-4">

        {/* Bot performance (2 cols) */}
        <div
          className="col-span-2 rounded-xl p-4 flex flex-col gap-4"
          style={{ background: 'rgba(255,255,255,0.025)', border: '0.5px solid rgba(255,255,255,0.05)' }}
        >
          <p className="text-[13px]" style={{ color: '#a1a1aa' }}>Rendimiento del bot</p>
          {[
            { label: 'Mensajes enviados por IA',         value: String(overview?.mensajesIA ?? 0) },
            { label: 'Conversaciones totales',            value: String(overview?.convTotal ?? 0) },
            { label: 'Escalado a humano',                 value: `${overview?.convTransfer ?? 0} (${100 - (overview?.tasaBot ?? 100)}%)` },
            { label: 'Sin intervención humana',           value: `${overview?.tasaBot ?? 100}%` },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[12px]" style={{ color: '#a1a1aa' }}>{label}</span>
              <span className="text-[13px] font-medium" style={{ color: '#a1a1aa' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Services table (3 cols) */}
        <div
          className="col-span-3 rounded-xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.025)', border: '0.5px solid rgba(255,255,255,0.05)' }}
        >
          <div
            className="px-4 py-3"
            style={{ borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}
          >
            <p className="text-[13px]" style={{ color: '#a1a1aa' }}>Servicios más demandados</p>
          </div>

          {!services || services.length === 0 ? (
            <p className="px-4 py-8 text-center text-[12px]" style={{ color: '#71717a' }}>Sin datos</p>
          ) : (
            <div>
              {/* Table header */}
              <div
                className="grid px-4 py-2 text-[9px] uppercase tracking-wider"
                style={{
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                  color: '#71717a',
                  borderBottom: '0.5px solid rgba(255,255,255,0.04)',
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
                    borderBottom: '0.5px solid rgba(255,255,255,0.03)',
                  }}
                >
                  <span className="text-[12px] truncate" style={{ color: '#e4e4e7' }}>{row.servicio}</span>
                  <span className="text-[12px] text-right" style={{ color: '#a1a1aa' }}>{row.leads}</span>
                  <span className="text-[12px] text-right" style={{ color: '#60a5fa' }}>{row.citas}</span>
                  <span className="text-[12px] text-right" style={{ color: '#4ade80' }}>{row.cerrados}</span>
                  <span className="text-[12px] text-right" style={{ color: row.ticketMedio ? '#fbbf24' : '#71717a' }}>
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
