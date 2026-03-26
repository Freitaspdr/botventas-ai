import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import supabase from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.rpc('get_dashboard_stats', {
    p_empresa_id: session.user.empresaId,
    p_today: today,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const r = data as Record<string, number>;
  const convHoy    = Number(r.conv_hoy);
  const convAyer   = Number(r.conv_ayer);
  const hotHoy     = Number(r.hot_leads_hoy);
  const hotAyer    = Number(r.hot_leads_ayer);
  const totalLeads = Number(r.total_leads);
  const cerrados   = Number(r.leads_cerrados);
  const convTotal  = Number(r.conv_total);
  const transfer   = Number(r.conv_transfer);

  return NextResponse.json({
    conversaciones: { value: convHoy, trend: convAyer > 0 ? Math.round(((convHoy - convAyer) / convAyer) * 100) : 0 },
    hotLeads:       { value: hotHoy,  trend: hotAyer  > 0 ? Math.round(((hotHoy  - hotAyer)  / hotAyer)  * 100) : 0 },
    citasHoy: {
      value:       Number(r.citas_hoy),
      confirmadas: Number(r.citas_hoy_conf),
      pendientes:  Number(r.citas_hoy_pend),
    },
    conversion: { value: totalLeads > 0 ? Math.round((cerrados / totalLeads) * 100) : 0 },
    tasaBot:    { value: convTotal  > 0 ? Math.round(((convTotal - transfer) / convTotal) * 100) : 100 },
  });
}
