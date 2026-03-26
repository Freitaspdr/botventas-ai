import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/pool';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get('desde');
  const hasta = searchParams.get('hasta');

  const conditions = ['empresa_id = $1'];
  const values: unknown[] = [session.user.empresaId];
  let idx = 2;

  if (desde) { conditions.push(`fecha_hora >= $${idx++}`); values.push(desde); }
  if (hasta) { conditions.push(`fecha_hora <= $${idx++}`); values.push(hasta + 'T23:59:59'); }

  const { rows } = await pool.query(
    `SELECT * FROM citas WHERE ${conditions.join(' AND ')} ORDER BY fecha_hora ASC`,
    values,
  );

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { cliente_nombre, cliente_tel, servicio, vehiculo, fecha_hora, notas, conv_id } = body;

  if (!cliente_tel || !fecha_hora) return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });

  const { rows } = await pool.query(
    `INSERT INTO citas (empresa_id, conv_id, cliente_tel, cliente_nombre, servicio, vehiculo, fecha_hora, notas, estado)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pendiente')
     RETURNING *`,
    [session.user.empresaId, conv_id ?? null, cliente_tel, cliente_nombre ?? null,
     servicio ?? null, vehiculo ?? null, fecha_hora, notas ?? null],
  );

  return NextResponse.json(rows[0], { status: 201 });
}
