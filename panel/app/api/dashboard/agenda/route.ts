import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import supabase from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('citas')
    .select('id, cliente_nombre, servicio, vehiculo, fecha_hora, estado, google_event_url')
    .eq('empresa_id', session.user.empresaId)
    .gte('fecha_hora', new Date().toISOString())
    .neq('estado', 'cancelada')
    .order('fecha_hora', { ascending: true })
    .limit(3);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
