import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/pool';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dias = Math.max(1, Math.min(365, parseInt(searchParams.get('dias') ?? '30', 10) || 30));
  const empresaId = session.user.empresaId;

  const { rows } = await pool.query<{
    total_leads: string;
    respondieron: string;
    cualificados: string;
    citas_agendadas: string;
    mensajes_ia: string;
    conv_total: string;
    conv_transfer: string;
  }>(
    `SELECT
      (SELECT COUNT(*) FROM leads WHERE empresa_id=$1 AND creado_en >= NOW() - ($2 || ' days')::interval) AS total_leads,
      (SELECT COUNT(*) FROM leads WHERE empresa_id=$1 AND estado != 'nuevo'
        AND creado_en >= NOW() - ($2 || ' days')::interval) AS respondieron,
      (SELECT COUNT(*) FROM leads WHERE empresa_id=$1 AND nivel IN ('alto','medio')
        AND creado_en >= NOW() - ($2 || ' days')::interval) AS cualificados,
      (SELECT COUNT(*) FROM citas WHERE empresa_id=$1
        AND creado_en >= NOW() - ($2 || ' days')::interval) AS citas_agendadas,
      (SELECT COUNT(*) FROM mensajes m
        JOIN conversaciones c ON c.id = m.conv_id
        WHERE c.empresa_id=$1 AND m.rol='assistant'
          AND m.enviado_en >= NOW() - ($2 || ' days')::interval) AS mensajes_ia,
      (SELECT COUNT(*) FROM conversaciones WHERE empresa_id=$1
        AND creado_en >= NOW() - ($2 || ' days')::interval) AS conv_total,
      (SELECT COUNT(*) FROM conversaciones WHERE empresa_id=$1 AND estado='transferida'
        AND creado_en >= NOW() - ($2 || ' days')::interval) AS conv_transfer`,
    [empresaId, dias],
  );

  const r = rows[0];
  const totalLeads   = Number(r.total_leads);
  const respondieron = Number(r.respondieron);
  const cualificados = Number(r.cualificados);
  const citas        = Number(r.citas_agendadas);
  const convTotal    = Number(r.conv_total);
  const convTransfer = Number(r.conv_transfer);

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

  return NextResponse.json({
    totalLeads,
    tasaRespuesta:    pct(respondieron, totalLeads),
    tasaCualificacion: pct(cualificados, respondieron),
    tasaCita:         pct(citas, cualificados),
    tasaBot:          pct(convTotal - convTransfer, convTotal),
    mensajesIA:       Number(r.mensajes_ia),
    convTotal,
    convTransfer,
  });
}
