import Link from 'next/link';
import { auth } from '@/lib/auth';
import { PeriodSelector } from '@/components/period-selector';
import { SectionCard } from '@/components/section-card';
import { StatsCard } from '@/components/stats-card';
import {
  getDashboardAgenda,
  getDashboardFeed,
  getDashboardFunnel,
  getDashboardRevenue,
  getDashboardStats,
} from '@/lib/data';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function formatDate() {
  return new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function formatCitaDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function citaColor(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  const days = diff / 86_400_000;
  if (days < 1) return '#b8862f';
  if (days < 7) return '#4f8b5f';
  return '#c89b46';
}

function getInitials(name?: string | null) {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function avatarStyle(nivel?: string | null, estado?: string) {
  if (estado === 'transferida') {
    return { bg: 'linear-gradient(135deg, #f8ded9, #f2b8ae)', color: '#8f2f2a' };
  }
  if (nivel === 'alto') {
    return { bg: 'linear-gradient(135deg, #e1f0df, #b9d9b5)', color: '#315f3d' };
  }
  if (nivel === 'medio') {
    return { bg: 'linear-gradient(135deg, #f3e3bf, #dfbd73)', color: '#704a14' };
  }
  return { bg: 'linear-gradient(135deg, #f8efe0, #ead5ad)', color: '#6f5632' };
}

interface FeedItem {
  id: string;
  cliente_nombre: string;
  cliente_tel: string;
  estado: string;
  nurturing_step: number;
  actualizada_en: string;
  ultimo_mensaje: string | null;
  lead_nivel: string | null;
}

interface AgendaItem {
  id: string;
  cliente_nombre: string;
  servicio: string;
  vehiculo: string | null;
  fecha_hora: string;
}

function IconChat() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
}

function IconFlame() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>;
}

function IconCal() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
}

function IconTrend() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>;
}

function IconCheck() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="9 12 11 14 15 10" /></svg>;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const { p } = await searchParams;
  const period = p === '7d' || p === '30d' ? p : 'today';

  const session = await auth();
  const userName = session?.user?.name?.split(' ')[0] ?? '';

  const [stats, revenue, feed, agenda, funnel] = await Promise.all([
    getDashboardStats(period),
    getDashboardRevenue(),
    getDashboardFeed(),
    getDashboardAgenda(),
    getDashboardFunnel(),
  ]);

  const planPct = revenue ? Math.round((revenue.convUsadas / revenue.convLimite) * 100) : 0;
  const planColor = planPct > 90 ? '#c2413c' : planPct > 70 ? '#c89b46' : '#4f8b5f';

  const funnelItems = funnel
    ? [
        { label: 'Leads captados', color: '#b8862f', ...funnel.captados },
        { label: 'Respondieron', color: '#d9a441', ...funnel.respondieron },
        { label: 'Cualificados', color: '#9b6a24', ...funnel.cualificados },
        { label: 'Citas agendadas', color: '#6f8f5f', ...funnel.citas },
        { label: 'Ventas cerradas', color: '#4f8b5f', ...funnel.ventas },
      ]
    : [];

  const feedItems = (feed as FeedItem[]) ?? [];
  const agendaItems = (agenda as AgendaItem[]) ?? [];
  const activeCount = feedItems.filter((item) => item.estado === 'activa').length;
  const transferCount = feedItems.filter((item) => item.estado === 'transferida').length;
  const hotCount = feedItems.filter((item) => item.lead_nivel === 'alto').length;

  return (
    <div className="flex flex-col gap-5">
      <section
        className="relative overflow-hidden rounded-[30px] px-5 py-6 md:px-7 md:py-7"
        style={{
          background:
            'radial-gradient(circle at top right, rgba(255,255,255,0.76), transparent 32%), linear-gradient(135deg, rgba(255,253,248,0.98), rgba(246,232,207,0.92) 48%, rgba(220,190,130,0.36))',
          border: '1px solid rgba(218,197,160,0.72)',
          boxShadow: '0 20px 52px rgba(116,82,28,0.1)',
        }}
      >
        <div className="pointer-events-none absolute -right-16 top-0 h-52 w-52 rounded-full bg-[#d9a441]/20 blur-3xl" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.95fr)]">
          <div className="max-w-[780px]">
            <p className="panel-label text-[11px]">Centro operativo</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-[#2c2418] md:text-5xl">
              {greeting()}
              {userName ? `, ${userName}` : ''}
            </h1>
            <p className="mt-4 max-w-[640px] text-[14px] leading-7 text-[#6f604a] md:text-[15px]">
              {formatDate()}. Aquí tienes una lectura limpia del estado comercial: actividad, citas, conversión y señales que requieren intervención manual.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-[18px] border border-[#e1c99f] bg-white/55 px-4 py-3">
                <p className="panel-label text-[10px]">Conversaciones activas</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#2c2418]">{activeCount}</p>
              </div>
              <div className="rounded-[18px] border border-[#e1c99f] bg-white/55 px-4 py-3">
                <p className="panel-label text-[10px]">Transferencias pendientes</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#2c2418]">{transferCount}</p>
              </div>
              <div className="rounded-[18px] border border-[#e1c99f] bg-white/55 px-4 py-3">
                <p className="panel-label text-[10px]">Leads calientes</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#2c2418]">{hotCount}</p>
              </div>
            </div>
          </div>

          <div className="panel-surface flex flex-col justify-between rounded-[26px] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="panel-label text-[10px]">Ritmo del mes</p>
                <p className="mt-2 text-[28px] font-semibold tracking-[-0.05em] text-[#2c2418]">
                  €{revenue?.mesActual.toLocaleString('es-ES') ?? '0'}
                </p>
                <p className="mt-2 text-[13px] leading-6 text-[#6f604a]">
                  {revenue?.cambio && revenue.cambio >= 0 ? 'Creciendo frente al mes anterior.' : 'Por debajo del mes anterior.'}
                  {' '}El panel está priorizando seguimiento, agenda y cierre.
                </p>
              </div>
              <PeriodSelector />
            </div>

            {revenue && (
              <div className="mt-6 space-y-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#9a8153]">Cambio mensual</p>
                    <p className="mt-1 text-lg font-semibold" style={{ color: revenue.cambio >= 0 ? '#4f8b5f' : '#a33b36' }}>
                      {revenue.cambio >= 0 ? '+' : ''}
                      {revenue.cambio}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#9a8153]">ROI del bot</p>
                    <p className="mt-1 text-lg font-semibold text-[#2c2418]">x{revenue.roi || 0}</p>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-[11px] text-[#8a785d]">
                    <span>Uso del plan {String(revenue.plan)}</span>
                    <span>{revenue.convUsadas}/{revenue.convLimite} conversaciones</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#eadcc6]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(planPct, 100)}%`, background: planColor }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <StatsCard
          label="Conversaciones"
          value={stats?.conversaciones.value ?? 0}
          icon={<IconChat />}
          trend={stats ? { value: stats.conversaciones.trend } : undefined}
        />
        <StatsCard
          label="Hot leads"
          value={stats?.hotLeads.value ?? 0}
          color="#b8862f"
          icon={<IconFlame />}
          trend={stats ? { value: stats.hotLeads.trend } : undefined}
        />
        <StatsCard
          label="Citas hoy"
          value={stats?.citasHoy.value ?? 0}
          color="#8f7246"
          icon={<IconCal />}
          subtext={stats ? `${stats.citasHoy.confirmadas} confirmadas · ${stats.citasHoy.pendientes} pendientes` : undefined}
        />
        <StatsCard
          label="Conversión"
          value={`${stats?.conversion.value ?? 0}%`}
          color="#9b6a24"
          icon={<IconTrend />}
        />
        <StatsCard
          label="Tasa bot"
          value={`${stats?.tasaBot.value ?? 100}%`}
          color="#4f8b5f"
          icon={<IconCheck />}
          subtext={(stats?.tasaBot.value ?? 100) > 95 ? 'Operación estable e indetectable' : undefined}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.95fr)]">
        <SectionCard
          title="Feed en vivo"
          viewAllHref="/conversaciones"
          headerRight={
            <div className="flex items-center gap-2 text-[11px] text-[#8a785d]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#4f8b5f]" />
              {activeCount} activas
            </div>
          }
        >
          {!feedItems.length ? (
            <p className="px-5 py-8 text-center text-[12px] text-[#8a785d]">Sin conversaciones recientes</p>
          ) : (
            <div className="divide-y divide-[#eadcc6]">
              {feedItems.map((item) => {
                const avatar = avatarStyle(item.lead_nivel, item.estado);
                const isTransfer = item.estado === 'transferida';

                return (
                  <Link
                    key={item.id}
                    href={`/conversaciones/${item.id}`}
                    className="grid gap-3 px-4 py-3 transition-colors hover:bg-[#fbf5ea] md:grid-cols-[auto_minmax(0,1fr)_auto]"
                    style={isTransfer ? { background: 'rgba(194,65,60,0.05)' } : undefined}
                  >
                    <div className="relative mt-0.5">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-[14px] text-[11px] font-semibold"
                        style={{ background: avatar.bg, color: avatar.color }}
                      >
                        {getInitials(item.cliente_nombre)}
                      </div>
                      {item.estado === 'activa' && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#fffdfa] bg-[#4f8b5f]" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-[14px] font-medium text-[#2c2418]">
                          {item.cliente_nombre || item.cliente_tel}
                        </span>
                        <span className="text-[11px] text-[#8a785d] md:hidden">{timeAgo(item.actualizada_en)}</span>
                      </div>
                      <p className="mt-1 truncate text-[12px] leading-5 text-[#6f604a]">
                        {isTransfer
                          ? 'Esperando respuesta manual'
                          : item.nurturing_step > 0
                            ? `Nurturing ${item.nurturing_step}/4 en curso`
                            : item.ultimo_mensaje ?? 'Sin mensaje reciente'}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.lead_nivel === 'alto' && (
                          <span className="rounded-full bg-[#dfeedd] px-2 py-1 text-[10px] font-semibold text-[#3f744d]">HOT</span>
                        )}
                        {item.lead_nivel === 'medio' && (
                          <span className="rounded-full bg-[#f3e3bf] px-2 py-1 text-[10px] font-semibold text-[#704a14]">WARM</span>
                        )}
                        {isTransfer && (
                          <span className="rounded-full bg-[#f8ded9] px-2 py-1 text-[10px] font-semibold text-[#a33b36]">TRANSFER</span>
                        )}
                        {item.estado === 'activa' && !item.lead_nivel && (
                          <span className="rounded-full bg-[#f4ead9] px-2 py-1 text-[10px] font-semibold text-[#8a785d]">Activa</span>
                        )}
                      </div>
                    </div>

                    <div className="hidden text-[11px] text-[#8a785d] md:block">{timeAgo(item.actualizada_en)}</div>
                  </Link>
                );
              })}
            </div>
          )}
        </SectionCard>

        <div className="flex flex-col gap-4">
          <SectionCard title="Agenda" viewAllHref="/citas" viewAllLabel="Ver calendario →">
            {!agendaItems.length ? (
              <p className="px-5 py-8 text-center text-[12px] text-[#8a785d]">Sin citas próximas</p>
            ) : (
              <div className="divide-y divide-[#eadcc6]">
                {agendaItems.map((cita) => (
                  <div key={cita.id} className="flex gap-3 px-4 py-3">
                    <div className="mt-1 h-10 w-1 rounded-full" style={{ background: citaColor(cita.fecha_hora) }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-[13px] font-medium text-[#2c2418]">{cita.cliente_nombre}</span>
                        <span className="text-right text-[10px] text-[#8a785d]">{formatCitaDate(cita.fecha_hora)}</span>
                      </div>
                      <p className="mt-1 truncate text-[12px] text-[#6f604a]">
                        {cita.servicio}
                        {cita.vehiculo ? ` · ${cita.vehiculo}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Embudo este mes">
            <div className="px-4 py-4">
              <div className="space-y-3">
                {funnelItems.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-[#6f604a]">{item.label}</span>
                      <span className="text-[11px] text-[#2c2418]">
                        {item.count} · {item.pct}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#eadcc6]">
                      <div className="h-full rounded-full transition-all" style={{ width: `${item.pct}%`, background: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
