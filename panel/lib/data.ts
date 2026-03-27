/**
 * Server-side data fetchers — call Supabase directly (no fetch to own API routes).
 * Imported only in Server Components / Server Actions.
 */
import { auth } from '@/lib/auth';
import supabase from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

// ── helpers ───────────────────────────────────────────────────────────────────

async function getEmpresaId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.empresaId ?? null;
}

// ── dashboard ─────────────────────────────────────────────────────────────────

export async function getDashboardStats(period: '7d' | 'today' | '30d' = 'today') {
  const empresaId = await getEmpresaId();
  if (!empresaId) return null;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  if (period === 'today') {
    const { data } = await supabase.rpc('get_dashboard_stats', { p_empresa_id: empresaId, p_today: today });
    if (!data) return null;
    const r = data as Record<string, number>;
    const convHoy  = Number(r.conv_hoy),  convAyer  = Number(r.conv_ayer);
    const hotHoy   = Number(r.hot_leads_hoy), hotAyer = Number(r.hot_leads_ayer);
    const total    = Number(r.total_leads), cerrados = Number(r.leads_cerrados);
    const convTotal = Number(r.conv_total), transfer = Number(r.conv_transfer);
    return {
      conversaciones: { value: convHoy, trend: convAyer > 0 ? Math.round(((convHoy - convAyer) / convAyer) * 100) : 0 },
      hotLeads:       { value: hotHoy,  trend: hotAyer  > 0 ? Math.round(((hotHoy  - hotAyer)  / hotAyer)  * 100) : 0 },
      citasHoy: { value: Number(r.citas_hoy), confirmadas: Number(r.citas_hoy_conf), pendientes: Number(r.citas_hoy_pend) },
      conversion: { value: total > 0 ? Math.round((cerrados / total) * 100) : 0 },
      tasaBot:    { value: convTotal > 0 ? Math.round(((convTotal - transfer) / convTotal) * 100) : 100 },
    };
  }

  // 7d / 30d: query directly with date range
  const days = period === '7d' ? 7 : 30;
  const prevDays = days * 2;
  const fromDate = new Date(now); fromDate.setDate(now.getDate() - days);
  const prevDate = new Date(now); prevDate.setDate(now.getDate() - prevDays);

  const [convRes, hotRes, leadsRes, transferRes, citasRes] = await Promise.all([
    supabase.from('conversaciones').select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId).gte('creado_en', fromDate.toISOString()),
    supabase.from('conversaciones').select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId).eq('es_hot_lead', true).gte('creado_en', fromDate.toISOString()),
    supabase.from('leads').select('id, estado', { count: 'exact' })
      .eq('empresa_id', empresaId),
    supabase.from('conversaciones').select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId).eq('estado', 'transferida').gte('creado_en', fromDate.toISOString()),
    supabase.from('citas').select('id, estado', { count: 'exact' })
      .eq('empresa_id', empresaId).gte('fecha_hora', fromDate.toISOString()),
    // previous period for trend
    supabase.from('conversaciones').select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId).gte('creado_en', prevDate.toISOString()).lt('creado_en', fromDate.toISOString()),
  ]);

  const convPrev = await supabase.from('conversaciones').select('id', { count: 'exact', head: true })
    .eq('empresa_id', empresaId).gte('creado_en', prevDate.toISOString()).lt('creado_en', fromDate.toISOString());
  const hotPrev = await supabase.from('conversaciones').select('id', { count: 'exact', head: true })
    .eq('empresa_id', empresaId).eq('es_hot_lead', true).gte('creado_en', prevDate.toISOString()).lt('creado_en', fromDate.toISOString());

  const convVal  = convRes.count ?? 0;
  const convPrevVal = convPrev.count ?? 0;
  const hotVal   = hotRes.count ?? 0;
  const hotPrevVal = hotPrev.count ?? 0;
  const total    = leadsRes.count ?? 0;
  const cerrados = (leadsRes.data ?? []).filter((l: { estado: string }) => l.estado === 'cerrado').length;
  const convTotal = convVal;
  const transfer = transferRes.count ?? 0;
  const citasVal  = citasRes.count ?? 0;
  const citasConf = (citasRes.data ?? []).filter((c: { estado: string }) => c.estado === 'confirmada').length;
  const citasPend = (citasRes.data ?? []).filter((c: { estado: string }) => c.estado === 'pendiente').length;

  return {
    conversaciones: { value: convVal, trend: convPrevVal > 0 ? Math.round(((convVal - convPrevVal) / convPrevVal) * 100) : 0 },
    hotLeads:       { value: hotVal,  trend: hotPrevVal  > 0 ? Math.round(((hotVal  - hotPrevVal)  / hotPrevVal)  * 100) : 0 },
    citasHoy: { value: citasVal, confirmadas: citasConf, pendientes: citasPend },
    conversion: { value: total > 0 ? Math.round((cerrados / total) * 100) : 0 },
    tasaBot:    { value: convTotal > 0 ? Math.round(((convTotal - transfer) / convTotal) * 100) : 100 },
  };
}

export async function getDashboardRevenue() {
  const empresaId = await getEmpresaId();
  if (!empresaId) return null;
  const { data } = await supabase.rpc('get_dashboard_revenue', { p_empresa_id: empresaId });
  if (!data) return null;
  const r = data as Record<string, unknown>;
  const mesActual   = Number(r?.mes_actual   ?? 0);
  const mesAnterior = Number(r?.mes_anterior ?? 0);
  const convUsadas  = Number(r?.conv_usadas  ?? 0);
  const cambio = mesAnterior > 0 ? Math.round(((mesActual - mesAnterior) / mesAnterior) * 100) : 0;
  const roi    = convUsadas > 0 && mesActual > 0 ? Math.round(mesActual / (convUsadas * 0.5)) : 0;
  return { mesActual, mesAnterior, cambio, roi, plan: String(r?.plan_nombre ?? 'starter'), convUsadas, convLimite: Number(r?.conv_limite ?? 500) };
}

export async function getDashboardFeed() {
  const empresaId = await getEmpresaId();
  if (!empresaId) return [];
  const { data } = await supabase.rpc('get_dashboard_feed', { p_empresa_id: empresaId });
  return data ?? [];
}

export async function getDashboardAgenda() {
  const empresaId = await getEmpresaId();
  if (!empresaId) return [];
  const { data } = await supabase
    .from('citas')
    .select('id, cliente_nombre, servicio, vehiculo, fecha_hora, estado, google_event_url')
    .eq('empresa_id', empresaId)
    .gte('fecha_hora', new Date().toISOString())
    .neq('estado', 'cancelada')
    .order('fecha_hora', { ascending: true })
    .limit(3);
  return data ?? [];
}

export async function getDashboardFunnel() {
  const empresaId = await getEmpresaId();
  if (!empresaId) return null;
  const { data } = await supabase.rpc('get_dashboard_funnel', { p_empresa_id: empresaId });
  if (!data) return null;
  const r = data as Record<string, number>;
  const total = Number(r.total_leads);
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  return {
    captados:     { count: total,                       pct: 100 },
    respondieron: { count: Number(r.respondieron),      pct: pct(Number(r.respondieron)) },
    cualificados: { count: Number(r.cualificados),      pct: pct(Number(r.cualificados)) },
    citas:        { count: Number(r.citas_agendadas),   pct: pct(Number(r.citas_agendadas)) },
    ventas:       { count: Number(r.ventas_cerradas),   pct: pct(Number(r.ventas_cerradas)) },
  };
}

// ── conversaciones ────────────────────────────────────────────────────────────

export async function getConversaciones(params: { estado?: string; desde?: string; hasta?: string; q?: string }) {
  const empresaId = await getEmpresaId();
  if (!empresaId) return [];
  const { data } = await supabase.rpc('get_conversaciones', {
    p_empresa_id: empresaId,
    p_estado: params.estado ?? null,
    p_desde:  params.desde  ?? null,
    p_hasta:  params.hasta  ?? null,
    p_q:      params.q      ?? null,
  });
  return data ?? [];
}

export async function getConversacionDetalle(id: string) {
  const empresaId = await getEmpresaId();
  if (!empresaId) return null;
  const { data } = await supabase.rpc('get_conversacion_detalle', { p_id: id, p_empresa_id: empresaId });
  if (!data?.conversacion) return null;
  return data as {
    conversacion: { id: string; cliente_nombre: string; cliente_tel: string; estado: string; es_hot_lead: boolean; nurturing_step: number; creado_en: string; actualizada_en: string };
    mensajes: { rol: 'user' | 'assistant'; contenido: string; enviado_en: string }[];
    lead: { id: string; nivel: string; estado: string; interes: string | null; notas: string | null; score: number | null; ticket_estimado: number | null; vehiculo: string | null; creado_en: string } | null;
    cita: { id: string; servicio: string; fecha_hora: string; estado: string } | null;
  };
}

// ── leads ─────────────────────────────────────────────────────────────────────

export async function getLeads() {
  const empresaId = await getEmpresaId();
  if (!empresaId) return [];
  const { data } = await supabase.rpc('get_leads', { p_empresa_id: empresaId });
  return data ?? [];
}

// ── citas ─────────────────────────────────────────────────────────────────────

export async function getCitas(params?: { desde?: string; hasta?: string }) {
  const empresaId = await getEmpresaId();
  if (!empresaId) return [];
  let query = supabase.from('citas').select('*').eq('empresa_id', empresaId).order('fecha_hora', { ascending: true });
  if (params?.desde) query = query.gte('fecha_hora', params.desde);
  if (params?.hasta) query = query.lte('fecha_hora', params.hasta + 'T23:59:59');
  const { data } = await query;
  return data ?? [];
}

// ── empresa ───────────────────────────────────────────────────────────────────

const EMPRESA_FIELDS = [
  'nombre', 'bot_nombre', 'bot_tono', 'bot_objetivo', 'bot_productos', 'bot_horarios',
  'bot_ciudad', 'bot_extra', 'encargado_tel',
  'evolution_instance', 'evolution_api_url', 'evolution_api_key',
  'plan', 'conv_limite', 'conv_usadas',
  'notif_hot_leads', 'notif_transfers', 'notif_nuevos', 'notif_resumen',
].join(', ');

type EmpresaData = {
  nombre: string; bot_nombre: string; bot_tono: string; bot_objetivo: string;
  bot_productos: string; bot_horarios: string; bot_ciudad: string; bot_extra: string;
  encargado_tel: string; evolution_instance: string; evolution_api_url: string;
  evolution_api_key: string; plan: string; conv_limite: number; conv_usadas: number;
  notif_hot_leads: boolean; notif_transfers: boolean; notif_nuevos: boolean; notif_resumen: boolean;
};

export async function getEmpresa(): Promise<EmpresaData | null> {
  const empresaId = await getEmpresaId();
  if (!empresaId) return null;
  const { data } = await getSupabase().from('empresas').select(EMPRESA_FIELDS).eq('id', empresaId).single();
  return (data as unknown as EmpresaData) ?? null;
}

// ── analytics ─────────────────────────────────────────────────────────────────

export async function getAnalyticsOverview(dias: number) {
  const empresaId = await getEmpresaId();
  if (!empresaId) return null;
  const { data } = await supabase.rpc('get_analytics_overview', { p_empresa_id: empresaId, p_dias: dias });
  if (!data) return null;
  const r = data as Record<string, number>;
  const totalLeads   = Number(r.total_leads);
  const respondieron = Number(r.respondieron);
  const cualificados = Number(r.cualificados);
  const citas        = Number(r.citas_agendadas);
  const convTotal    = Number(r.conv_total);
  const convTransfer = Number(r.conv_transfer);
  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
  return {
    totalLeads,
    tasaRespuesta:     pct(respondieron, totalLeads),
    tasaCualificacion: pct(cualificados, respondieron),
    tasaCita:          pct(citas, cualificados),
    tasaBot:           pct(convTotal - convTransfer, convTotal),
    mensajesIA:        Number(r.mensajes_ia),
    convTotal,
    convTransfer,
  };
}

export async function getAnalyticsChart(dias: number) {
  const empresaId = await getEmpresaId();
  if (!empresaId) return [];
  const { data } = await supabase.rpc('get_analytics_chart', { p_empresa_id: empresaId, p_dias: dias });
  return data ?? [];
}

export async function getAnalyticsServices(dias: number) {
  const empresaId = await getEmpresaId();
  if (!empresaId) return [];
  const { data } = await supabase.rpc('get_analytics_services', { p_empresa_id: empresaId, p_dias: dias });
  // map snake_case to camelCase for the UI
  return (data ?? []).map((r: Record<string, unknown>) => ({
    servicio:    r.servicio,
    leads:       r.leads,
    citas:       r.citas,
    cerrados:    r.cerrados,
    ticketMedio: r.ticket_medio ?? null,
    facturacion: r.facturacion  ?? 0,
  }));
}
