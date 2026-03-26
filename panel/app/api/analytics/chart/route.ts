import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import supabase from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dias = Math.max(1, Math.min(365, parseInt(searchParams.get('dias') ?? '30', 10) || 30));

  const { data, error } = await supabase.rpc('get_analytics_chart', {
    p_empresa_id: session.user.empresaId,
    p_dias: dias,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(
    (data ?? []).map((r: Record<string, unknown>) => ({
      fecha:          String(r.fecha).slice(0, 10),
      leads:          Number(r.leads),
      citas:          Number(r.citas),
      conversaciones: Number(r.conversaciones),
    })),
  );
}
