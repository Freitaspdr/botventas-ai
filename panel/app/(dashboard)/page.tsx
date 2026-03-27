import Link from 'next/link';
import { auth } from '@/lib/auth';
import { StatsCard } from '@/components/stats-card';
import { SectionCard } from '@/components/section-card';
import { getDashboardStats, getDashboardRevenue, getDashboardFeed, getDashboardAgenda, getDashboardFunnel } from '@/lib/data';

// ── helpers ──────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function formatDate() {
  const d = new Date();
  const days   = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function formatCitaDate(iso: string) {
  const d = new Date(iso);
  const days   = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
                  'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} · ${hh}:${mm}`;
}

function citaColor(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  const days = diff / 86_400_000;
  if (days < 1)  return '#3b82f6'; // hoy / mañana → azul
  if (days < 7)  return '#22c55e'; // esta semana → verde
  return '#f59e0b';                // próxima semana → amarillo
}

function getInitials(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function avatarStyle(nivel?: string | null, estado?: string) {
  if (estado === 'transferida') return { bg: 'linear-gradient(135deg,#450a0a,#7f1d1d)', color: '#fca5a5' };
  if (nivel === 'alto')         return { bg: 'linear-gradient(135deg,#064e3b,#065f46)', color: '#6ee7b7' };
  if (nivel === 'medio')        return { bg: 'linear-gradient(135deg,#1e1b4b,#312e81)', color: '#a5b4fc' };
  return { bg: 'rgba(255,255,255,0.04)', color: '#a1a1aa' };
}

interface Stats {
  conversaciones: { value: number; trend: number };
  hotLeads:       { value: number; trend: number };
  citasHoy:       { value: number; confirmadas: number; pendientes: number };
  conversion:     { value: number };
  tasaBot:        { value: number };
}

interface Revenue {
  mesActual: number;
  cambio: number;
  roi: number;
  plan: string;
  convUsadas: number;
  convLimite: number;
}

interface FeedItem {
  id: string;
  cliente_nombre: string;
  cliente_tel: string;
  estado: string;
  nurturing_step: number;
  es_hot_lead: boolean;
  actualizada_en: string;
  ultimo_mensaje: string | null;
  ultimo_rol: string | null;
  lead_nivel: string | null;
}

interface AgendaItem {
  id: string;
  cliente_nombre: string;
  servicio: string;
  vehiculo: string | null;
  fecha_hora: string;
  estado: string;
}

interface FunnelData {
  captados:     { count: number; pct: number };
  respondieron: { count: number; pct: number };
  cualificados: { count: number; pct: number };
  citas:        { count: number; pct: number };
  ventas:       { count: number; pct: number };
}

// ── icons (inline SVG) ────────────────────────────────────────────────────────

function IconChat()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>; }
function IconFlame()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>; }
function IconCal()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function IconTrend()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>; }
function IconCheck()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>; }

// ── page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name?.split(' ')[0] ?? '';

  const [stats, revenue, feed, agenda, funnel] = await Promise.all([
    getDashboardStats(),
    getDashboardRevenue(),
    getDashboardFeed(),
    getDashboardAgenda(),
    getDashboardFunnel(),
  ]);

  const planPct = revenue ? Math.round((revenue.convUsadas / revenue.convLimite) * 100) : 0;
  const planColor = planPct > 90 ? '#ef4444' : planPct > 70 ? '#f59e0b' : '#22c55e';

  const funnelItems = funnel ? [
    { label: 'Leads captados',   color: '#3b82f6', ...funnel.captados },
    { label: 'Respondieron',     color: '#a78bfa', ...funnel.respondieron },
    { label: 'Cualificados',     color: '#f59e0b', ...funnel.cualificados },
    { label: 'Citas agendadas',  color: '#22c55e', ...funnel.citas },
    { label: 'Ventas cerradas',  color: '#4ade80', ...funnel.ventas },
  ] : [];

  const activeCount = (feed as FeedItem[])?.filter(f => f.estado === 'activa').length ?? 0;

  return (
    <div className="flex flex-col gap-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-medium tracking-tight" style={{ color: '#fafafa' }}>
            {greeting()}{userName ? `, ${userName}` : ''}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: '#71717a' }}>
            {formatDate()} · Panel BotVentas AI
          </p>
        </div>

        {/* Period selector — visual only for now */}
        <div
          className="flex items-center rounded-lg overflow-hidden text-[11px]"
          style={{ border: '0.5px solid rgba(255,255,255,0.05)' }}
        >
          {['7d', 'Hoy', '30d'].map((p, i) => (
            <button
              key={p}
              className="px-3 py-1.5 transition-colors"
              style={{
                background: i === 1 ? 'rgba(255,255,255,0.06)' : 'transparent',
                color:      i === 1 ? '#fafafa' : '#a1a1aa',
                borderRight: i < 2 ? '0.5px solid rgba(255,255,255,0.05)' : undefined,
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Revenue banner ── */}
      {revenue && (
        <div
          className="rounded-xl px-5 py-4 flex items-center justify-between"
          style={{
            background: 'linear-gradient(to right, rgba(34,197,94,0.06), rgba(34,197,94,0.02))',
            border: '0.5px solid rgba(34,197,94,0.12)',
          }}
        >
          <div>
            <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: '#4ade80' }}>
              Facturación generada este mes
            </p>
            <p className="text-3xl font-medium tracking-tight" style={{ color: '#fafafa' }}>
              €{revenue.mesActual.toLocaleString('es-ES')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] mb-1" style={{ color: '#a1a1aa' }}>vs mes anterior</p>
            <p
              className="text-[15px] font-medium"
              style={{ color: revenue.cambio >= 0 ? '#4ade80' : '#f87171' }}
            >
              {revenue.cambio >= 0 ? '+' : ''}{revenue.cambio}%
            </p>
            {revenue.roi > 0 && (
              <p className="text-[11px] mt-0.5" style={{ color: '#a1a1aa' }}>
                ROI del bot: x{revenue.roi}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Stats row ── */}
      <div className="grid grid-cols-5 gap-3">
        <StatsCard
          label="Conversaciones"
          value={stats?.conversaciones.value ?? 0}
          icon={<IconChat />}
          trend={stats ? { value: stats.conversaciones.trend } : undefined}
        />
        <StatsCard
          label="Hot leads"
          value={stats?.hotLeads.value ?? 0}
          color="#fbbf24"
          icon={<IconFlame />}
          trend={stats ? { value: stats.hotLeads.trend } : undefined}
        />
        <StatsCard
          label="Citas hoy"
          value={stats?.citasHoy.value ?? 0}
          color="#60a5fa"
          icon={<IconCal />}
          subtext={stats ? `${stats.citasHoy.confirmadas} conf. ${stats.citasHoy.pendientes} pend.` : undefined}
        />
        <StatsCard
          label="Conversión"
          value={`${stats?.conversion.value ?? 0}%`}
          color="#c4b5fd"
          icon={<IconTrend />}
        />
        <StatsCard
          label="Tasa bot"
          value={`${stats?.tasaBot.value ?? 100}%`}
          color="#4ade80"
          icon={<IconCheck />}
          subtext={(stats?.tasaBot.value ?? 100) > 95 ? 'Indetectable' : undefined}
        />
      </div>

      {/* ── Two columns ── */}
      <div className="grid grid-cols-5 gap-4">

        {/* ── Feed en vivo (60% = 3 cols) ── */}
        <div className="col-span-3">
          <SectionCard
            title="Feed en vivo"
            viewAllHref="/conversaciones"
            headerRight={
              <div className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: '#22c55e' }}
                />
                <span className="text-[11px]" style={{ color: '#a1a1aa' }}>
                  {activeCount} activas
                </span>
              </div>
            }
          >
            {!feed || feed.length === 0 ? (
              <p className="px-3 py-6 text-center text-[12px]" style={{ color: '#71717a' }}>
                Sin conversaciones recientes
              </p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                {(feed as FeedItem[]).map((item) => {
                  const av = avatarStyle(item.lead_nivel, item.estado);
                  const isTransfer = item.estado === 'transferida';
                  return (
                    <Link
                      key={item.id}
                      href={`/conversaciones/${item.id}`}
                      className="flex items-start gap-3 px-3 py-2.5 transition-colors hover:bg-white/[0.02]"
                      style={isTransfer ? { background: 'rgba(239,68,68,0.03)' } : undefined}
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0 mt-0.5">
                        <div
                          className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[10px] font-medium select-none"
                          style={{ background: av.bg, color: av.color }}
                        >
                          {getInitials(item.cliente_nombre)}
                        </div>
                        {item.estado === 'activa' && (
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                            style={{ background: '#22c55e', border: '2px solid #09090b' }}
                          />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-medium truncate" style={{ color: '#e4e4e7' }}>
                            {item.cliente_nombre || item.cliente_tel}
                          </span>
                          <span className="text-[10px] flex-shrink-0" style={{ color: '#a1a1aa' }}>
                            {timeAgo(item.actualizada_en)}
                          </span>
                        </div>

                        {/* Last message */}
                        <p className="text-[11px] truncate mt-0.5" style={{ color: '#a1a1aa' }}>
                          {isTransfer
                            ? '⚠ Esperando tu respuesta'
                            : item.nurturing_step > 0
                              ? `Nurturing ${item.nurturing_step}/4`
                              : item.ultimo_mensaje ?? '—'}
                        </p>

                        {/* Badges */}
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {item.lead_nivel === 'alto' && (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                              style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80' }}>
                              HOT
                            </span>
                          )}
                          {item.lead_nivel === 'medio' && (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                              style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24' }}>
                              WARM
                            </span>
                          )}
                          {isTransfer && (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                              TRANSFER
                            </span>
                          )}
                          {item.estado === 'activa' && !item.lead_nivel && (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                              style={{ background: 'rgba(255,255,255,0.04)', color: '#a1a1aa' }}>
                              Activa
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── Right column (40% = 2 cols) ── */}
        <div className="col-span-2 flex flex-col gap-4">

          {/* Agenda */}
          <SectionCard title="Agenda" viewAllHref="/citas" viewAllLabel="Ver calendario →">
            {!agenda || agenda.length === 0 ? (
              <p className="px-3 py-5 text-center text-[12px]" style={{ color: '#71717a' }}>
                Sin citas próximas
              </p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                {(agenda as AgendaItem[]).map((cita) => (
                  <div key={cita.id} className="flex items-stretch gap-3 px-3 py-2.5">
                    {/* Color bar */}
                    <div
                      className="w-[3px] rounded-full flex-shrink-0"
                      style={{ background: citaColor(cita.fecha_hora) }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-medium truncate" style={{ color: '#e4e4e7' }}>
                          {cita.cliente_nombre}
                        </span>
                        <span className="text-[10px] flex-shrink-0" style={{ color: '#a1a1aa' }}>
                          {formatCitaDate(cita.fecha_hora)}
                        </span>
                      </div>
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: '#a1a1aa' }}>
                        {cita.servicio}{cita.vehiculo ? ` · ${cita.vehiculo}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Funnel */}
          <SectionCard title="Embudo este mes">
            <div className="px-3 py-3 flex flex-col gap-2.5">
              {funnelItems.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px]" style={{ color: '#a1a1aa' }}>{item.label}</span>
                    <span className="text-[11px]" style={{ color: '#a1a1aa' }}>
                      {item.count} ({item.pct}%)
                    </span>
                  </div>
                  <div
                    className="h-[5px] rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${item.pct}%`, background: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Plan usage */}
          {revenue && (
            <div
              className="rounded-xl px-3 py-2.5"
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '0.5px solid rgba(255,255,255,0.05)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px]" style={{ color: '#a1a1aa' }}>
                  Plan <span style={{ color: '#a1a1aa' }}>{String(revenue.plan)}</span>
                </span>
                <span className="text-[11px]" style={{ color: '#a1a1aa' }}>
                  {revenue.convUsadas}/{revenue.convLimite} conv.
                </span>
              </div>
              <div
                className="h-[4px] rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(planPct, 100)}%`, background: planColor }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
