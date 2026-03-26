import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import supabase from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dias = Math.max(1, Math.min(365, parseInt(searchParams.get('dias') ?? '30', 10) || 30));

  const { data, error } = await supabase.rpc('get_analytics_overview', {
    p_empresa_id: session.user.empresaId,
    p_dias: dias,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const r = data as Record<string, number>;
  const totalLeads   = Number(r.total_leads);
  const respondieron = Number(r.respondieron);
  const cualificados = Number(r.cualificados);
  const citas        = Number(r.citas_agendadas);
  const convTotal    = Number(r.conv_total);
  const convTransfer = Number(r.conv_transfer);

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

  return NextResponse.json({
    totalLeads,
    tasaRespuesta:     pct(respondieron, totalLeads),
    tasaCualificacion: pct(cualificados, respondieron),
    tasaCita:          pct(citas, cualificados),
    tasaBot:           pct(convTotal - convTransfer, convTotal),
    mensajesIA:        Number(r.mensajes_ia),
    convTotal,
    convTransfer,
  });
}
