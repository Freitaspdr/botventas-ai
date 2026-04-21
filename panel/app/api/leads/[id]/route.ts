import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import supabase from '@/lib/db';
import { isUUID } from '@/lib/utils';

const ALLOWED_ESTADOS = new Set(['nuevo', 'contactado', 'cerrado', 'perdido']);
const ALLOWED_NIVELES = new Set(['bajo', 'medio', 'alto']);

function numberInRange(value: unknown, min: number, max: number): number | null {
  if (value === null || value === '') return null;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return null;
  return Math.min(max, Math.max(min, Math.round(numberValue)));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!isUUID(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const body = await req.json();
  const update: Record<string, unknown> = {};

  if (typeof body.estado === 'string' && ALLOWED_ESTADOS.has(body.estado)) {
    update.estado = body.estado;
  }
  if (typeof body.nivel === 'string' && ALLOWED_NIVELES.has(body.nivel)) {
    update.nivel = body.nivel;
  }
  if (typeof body.notas === 'string' || body.notas === null) {
    update.notas = typeof body.notas === 'string' ? body.notas.trim() || null : null;
  }
  if ('score' in body) {
    const score = numberInRange(body.score, 0, 100);
    if (score !== null) update.score = score;
  }
  if ('ticket_estimado' in body) {
    const ticket = numberInRange(body.ticket_estimado, 0, 1000000);
    if (ticket !== null) update.ticket_estimado = ticket;
  }

  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });

  const { data, error } = await supabase
    .from('leads')
    .update({ ...update, actualizado_en: new Date().toISOString() })
    .eq('id', id)
    .eq('empresa_id', session.user.empresaId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}
