import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/pool';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get('estado');
  const desde  = searchParams.get('desde');
  const hasta  = searchParams.get('hasta');
  const q      = searchParams.get('q');

  const conditions: string[] = ['c.empresa_id = $1'];
  const values: unknown[]    = [session.user.empresaId];
  let idx = 2;

  if (estado) { conditions.push(`c.estado = $${idx++}`); values.push(estado); }
  if (desde)  { conditions.push(`c.creado_en >= $${idx++}`); values.push(desde); }
  if (hasta)  { conditions.push(`c.creado_en <= $${idx++}`); values.push(hasta + 'T23:59:59'); }
  if (q)      { conditions.push(`(c.cliente_nombre ILIKE $${idx} OR c.cliente_tel ILIKE $${idx++})`); values.push(`%${q}%`); }

  const where = conditions.join(' AND ');

  const { rows } = await pool.query(
    `SELECT
       c.id, c.cliente_tel, c.cliente_nombre, c.estado, c.es_hot_lead,
       c.nurturing_step, c.creado_en, c.actualizada_en,
       (SELECT contenido FROM mensajes WHERE conv_id = c.id ORDER BY enviado_en DESC LIMIT 1) AS ultimo_mensaje,
       (SELECT COUNT(*) FROM mensajes WHERE conv_id = c.id) AS total_mensajes,
       l.nivel AS lead_nivel,
       l.score AS lead_score
     FROM conversaciones c
     LEFT JOIN leads l ON l.conv_id = c.id
     WHERE ${where}
     ORDER BY c.actualizada_en DESC
     LIMIT 100`,
    values,
  );

  return NextResponse.json(rows);
}
