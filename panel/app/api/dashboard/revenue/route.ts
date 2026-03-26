import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/pool';

export async function GET() {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const empresaId = session.user.empresaId;

  const { rows } = await pool.query<{
    mes_actual: string;
    mes_anterior: string;
    plan_nombre: string;
    conv_usadas: string;
    conv_limite: string;
  }>(
    `SELECT
      (SELECT COALESCE(SUM(ticket_estimado), 0) FROM leads
        WHERE empresa_id=$1 AND estado='cerrado'
          AND DATE_TRUNC('month', actualizado_en) = DATE_TRUNC('month', CURRENT_DATE)
      ) AS mes_actual,
      (SELECT COALESCE(SUM(ticket_estimado), 0) FROM leads
        WHERE empresa_id=$1 AND estado='cerrado'
          AND DATE_TRUNC('month', actualizado_en) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
      ) AS mes_anterior,
      e.plan AS plan_nombre,
      e.conv_usadas,
      e.conv_limite
    FROM empresas e
    WHERE e.id=$1`,
    [empresaId],
  );

  const r = rows[0];
  const mesActual = Number(r?.mes_actual ?? 0);
  const mesAnterior = Number(r?.mes_anterior ?? 0);
  const cambio = mesAnterior > 0 ? Math.round(((mesActual - mesAnterior) / mesAnterior) * 100) : 0;
  const convUsadas = Number(r?.conv_usadas ?? 0);
  const convLimite = Number(r?.conv_limite ?? 500);
  const roi = convUsadas > 0 && mesActual > 0 ? Math.round(mesActual / (convUsadas * 0.5)) : 0;

  return NextResponse.json({
    mesActual,
    mesAnterior,
    cambio,
    roi,
    plan: r?.plan_nombre ?? 'starter',
    convUsadas,
    convLimite,
  });
}
