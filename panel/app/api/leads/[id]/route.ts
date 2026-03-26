import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/pool';
import { isUUID } from '@/lib/utils';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!isUUID(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const body = await req.json();

  const allowed = ['estado', 'notas', 'nivel', 'score', 'ticket_estimado'];
  const fields = Object.entries(body).filter(([k]) => allowed.includes(k));
  if (fields.length === 0) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });

  const sets = fields.map(([k], i) => `${k} = $${i + 3}`).join(', ');
  const values = fields.map(([, v]) => v);

  const { rows } = await pool.query(
    `UPDATE leads SET ${sets}, actualizado_en = NOW() WHERE id = $1 AND empresa_id = $2 RETURNING *`,
    [id, session.user.empresaId, ...values],
  );

  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(rows[0]);
}
