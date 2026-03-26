import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/pool';
import { isUUID } from '@/lib/utils';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!isUUID(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const [{ rows: convRows }, { rows: mensajes }, { rows: leadRows }, { rows: citaRows }] =
    await Promise.all([
      pool.query(
        `SELECT * FROM conversaciones WHERE id = $1 AND empresa_id = $2`,
        [id, session.user.empresaId],
      ),
      pool.query(
        `SELECT rol, contenido, enviado_en FROM mensajes WHERE conv_id = $1 ORDER BY enviado_en ASC`,
        [id],
      ),
      pool.query(
        `SELECT id, nivel, estado, interes, notas, score, ticket_estimado, vehiculo, creado_en
         FROM leads WHERE conv_id = $1`,
        [id],
      ),
      pool.query(
        `SELECT id, servicio, fecha_hora, estado FROM citas WHERE conv_id = $1 ORDER BY fecha_hora DESC LIMIT 1`,
        [id],
      ),
    ]);

  if (!convRows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    conversacion: convRows[0],
    mensajes,
    lead: leadRows[0] ?? null,
    cita: citaRows[0] ?? null,
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!isUUID(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const { estado } = await req.json();

  const allowed = ['activa', 'cerrada', 'transferida'];
  if (!allowed.includes(estado)) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });

  const { rows } = await pool.query(
    `UPDATE conversaciones SET estado=$1, actualizada_en=NOW() WHERE id=$2 AND empresa_id=$3 RETURNING *`,
    [estado, id, session.user.empresaId],
  );

  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(rows[0]);
}
