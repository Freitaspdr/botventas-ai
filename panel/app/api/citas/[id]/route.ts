import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/pool';
import { isUUID } from '@/lib/utils';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!isUUID(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const { estado } = await req.json();

  const allowed = ['pendiente', 'confirmada', 'cancelada', 'completada', 'no_show'];
  if (!allowed.includes(estado)) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });

  const { rows } = await pool.query(
    `UPDATE citas SET estado = $1 WHERE id = $2 AND empresa_id = $3 RETURNING *`,
    [estado, id, session.user.empresaId],
  );

  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(rows[0]);
}
