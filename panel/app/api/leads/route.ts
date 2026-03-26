import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/pool';

export async function GET() {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rows } = await pool.query(
    `SELECT l.id, l.cliente_tel, l.cliente_nombre, l.nivel, l.estado, l.interes,
       l.notas, l.score, l.ticket_estimado, l.vehiculo, l.conv_id, l.creado_en, l.actualizado_en,
       c.nurturing_step, c.actualizada_en AS conv_actualizada_en,
       (SELECT id FROM citas WHERE conv_id = l.conv_id ORDER BY fecha_hora DESC LIMIT 1) AS cita_id,
       (SELECT fecha_hora FROM citas WHERE conv_id = l.conv_id ORDER BY fecha_hora DESC LIMIT 1) AS cita_fecha
     FROM leads l
     LEFT JOIN conversaciones c ON c.id = l.conv_id
     WHERE l.empresa_id = $1
     ORDER BY l.creado_en DESC`,
    [session.user.empresaId],
  );

  return NextResponse.json(rows);
}
