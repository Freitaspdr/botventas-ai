import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import supabase from '@/lib/db';
import { isUUID } from '@/lib/utils';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!isUUID(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const { estado } = await req.json();
  const allowed = ['pendiente', 'confirmada', 'cancelada', 'completada', 'no_show'];
  if (!allowed.includes(estado)) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });

  const { data, error } = await supabase
    .from('citas')
    .update({ estado })
    .eq('id', id)
    .eq('empresa_id', session.user.empresaId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}
