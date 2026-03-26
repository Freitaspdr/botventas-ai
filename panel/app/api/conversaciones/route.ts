import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import supabase from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get('estado') ?? undefined;
  const desde  = searchParams.get('desde')  ?? undefined;
  const hasta  = searchParams.get('hasta')  ?? undefined;
  const q      = searchParams.get('q')      ?? undefined;

  const { data, error } = await supabase.rpc('get_conversaciones', {
    p_empresa_id: session.user.empresaId,
    p_estado: estado ?? null,
    p_desde:  desde  ?? null,
    p_hasta:  hasta  ?? null,
    p_q:      q      ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
