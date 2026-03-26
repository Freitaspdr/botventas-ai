import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import supabase from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dias = Math.max(1, Math.min(365, parseInt(searchParams.get('dias') ?? '30', 10) || 30));

  const { data, error } = await supabase.rpc('get_analytics_services', {
    p_empresa_id: session.user.empresaId,
    p_dias: dias,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    (data ?? []).map((r: Record<string, unknown>) => ({
      servicio:    r.servicio,
      leads:       Number(r.leads),
      citas:       Number(r.citas),
      cerrados:    Number(r.cerrados),
      ticketMedio: r.ticket_medio ? Number(r.ticket_medio) : null,
      facturacion: Number(r.facturacion),
    })),
  );
}
