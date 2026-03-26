import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/pool';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dias = Math.max(1, Math.min(365, parseInt(searchParams.get('dias') ?? '30', 10) || 30));
  const empresaId = session.user.empresaId;

  const { rows } = await pool.query(
    `SELECT
       COALESCE(l.interes, 'Sin especificar') AS servicio,
       COUNT(*) AS leads,
       COUNT(ci.id) AS citas,
       COUNT(*) FILTER (WHERE l.estado = 'cerrado') AS cerrados,
       ROUND(AVG(l.ticket_estimado) FILTER (WHERE l.ticket_estimado IS NOT NULL)) AS ticket_medio,
       COALESCE(SUM(l.ticket_estimado) FILTER (WHERE l.estado = 'cerrado'), 0) AS facturacion
     FROM leads l
     LEFT JOIN citas ci ON ci.conv_id = l.conv_id
     WHERE l.empresa_id = $1 AND l.creado_en >= NOW() - ($2 || ' days')::interval
     GROUP BY l.interes
     ORDER BY leads DESC
     LIMIT 15`,
    [empresaId, dias],
  );

  return NextResponse.json(
    rows.map(r => ({
      servicio:    r.servicio,
      leads:       Number(r.leads),
      citas:       Number(r.citas),
      cerrados:    Number(r.cerrados),
      ticketMedio: r.ticket_medio ? Number(r.ticket_medio) : null,
      facturacion: Number(r.facturacion),
    })),
  );
}
