import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import supabase from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get('desde');
  const hasta = searchParams.get('hasta');

  let query = supabase
    .from('citas')
    .select('*')
    .eq('empresa_id', session.user.empresaId)
    .order('fecha_hora', { ascending: true });

  if (desde) query = query.gte('fecha_hora', desde);
  if (hasta) query = query.lte('fecha_hora', hasta + 'T23:59:59');

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { cliente_nombre, cliente_tel, servicio, vehiculo, fecha_hora, notas, conv_id } = body;

  if (!cliente_tel || !fecha_hora) return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });

  const { data, error } = await supabase
    .from('citas')
    .insert({
      empresa_id:     session.user.empresaId,
      conv_id:        conv_id ?? null,
      cliente_tel,
      cliente_nombre: cliente_nombre ?? null,
      servicio:       servicio ?? null,
      vehiculo:       vehiculo ?? null,
      fecha_hora,
      notas:          notas ?? null,
      estado:         'pendiente',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
