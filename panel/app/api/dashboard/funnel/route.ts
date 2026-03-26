import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/pool';

export async function GET() {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const empresaId = session.user.empresaId;

  const { rows } = await pool.query<{
    total_leads: string;
    respondieron: string;
    cualificados: string;
    citas_agendadas: string;
    ventas_cerradas: string;
  }>(
    `SELECT
      (SELECT COUNT(*) FROM leads WHERE empresa_id=$1
        AND DATE_TRUNC('month', creado_en) = DATE_TRUNC('month', CURRENT_DATE)
      ) AS total_leads,
      (SELECT COUNT(*) FROM leads WHERE empresa_id=$1
        AND estado != 'nuevo'
        AND DATE_TRUNC('month', creado_en) = DATE_TRUNC('month', CURRENT_DATE)
      ) AS respondieron,
      (SELECT COUNT(*) FROM leads WHERE empresa_id=$1
        AND nivel IN ('alto', 'medio')
        AND DATE_TRUNC('month', creado_en) = DATE_TRUNC('month', CURRENT_DATE)
      ) AS cualificados,
      (SELECT COUNT(*) FROM citas WHERE empresa_id=$1
        AND DATE_TRUNC('month', creado_en) = DATE_TRUNC('month', CURRENT_DATE)
      ) AS citas_agendadas,
      (SELECT COUNT(*) FROM leads WHERE empresa_id=$1
        AND estado='cerrado'
        AND DATE_TRUNC('month', creado_en) = DATE_TRUNC('month', CURRENT_DATE)
      ) AS ventas_cerradas`,
    [empresaId],
  );

  const r = rows[0];
  const total = Number(r.total_leads);

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return NextResponse.json({
    captados:  { count: total,                          pct: 100 },
    respondieron: { count: Number(r.respondieron),      pct: pct(Number(r.respondieron)) },
    cualificados: { count: Number(r.cualificados),      pct: pct(Number(r.cualificados)) },
    citas:        { count: Number(r.citas_agendadas),   pct: pct(Number(r.citas_agendadas)) },
    ventas:       { count: Number(r.ventas_cerradas),   pct: pct(Number(r.ventas_cerradas)) },
  });
}
