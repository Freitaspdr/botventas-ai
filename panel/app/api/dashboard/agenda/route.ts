import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/pool';

export async function GET() {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rows } = await pool.query(
    `SELECT id, cliente_nombre, servicio, vehiculo, fecha_hora, estado, google_event_url
     FROM citas
     WHERE empresa_id = $1 AND fecha_hora >= NOW() AND estado != 'cancelada'
     ORDER BY fecha_hora ASC
     LIMIT 3`,
    [session.user.empresaId],
  );

  return NextResponse.json(rows);
}
