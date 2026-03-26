import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import supabase from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase.rpc('get_dashboard_revenue', {
    p_empresa_id: session.user.empresaId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const r = data as Record<string, unknown>;
  const mesActual   = Number(r?.mes_actual   ?? 0);
  const mesAnterior = Number(r?.mes_anterior ?? 0);
  const convUsadas  = Number(r?.conv_usadas  ?? 0);
  const cambio = mesAnterior > 0 ? Math.round(((mesActual - mesAnterior) / mesAnterior) * 100) : 0;
  const roi    = convUsadas > 0 && mesActual > 0 ? Math.round(mesActual / (convUsadas * 0.5)) : 0;

  return NextResponse.json({
    mesActual,
    mesAnterior,
    cambio,
    roi,
    plan:        r?.plan_nombre ?? 'starter',
    convUsadas,
    convLimite:  Number(r?.conv_limite ?? 500),
  });
}
