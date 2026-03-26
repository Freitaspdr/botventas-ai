import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import supabase from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase.rpc('get_dashboard_funnel', {
    p_empresa_id: session.user.empresaId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const r = data as Record<string, number>;
  const total = Number(r.total_leads);
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return NextResponse.json({
    captados:     { count: total,                              pct: 100 },
    respondieron: { count: Number(r.respondieron),             pct: pct(Number(r.respondieron)) },
    cualificados: { count: Number(r.cualificados),             pct: pct(Number(r.cualificados)) },
    citas:        { count: Number(r.citas_agendadas),          pct: pct(Number(r.citas_agendadas)) },
    ventas:       { count: Number(r.ventas_cerradas),          pct: pct(Number(r.ventas_cerradas)) },
  });
}
