import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/pool';

export async function GET() {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const empresaId = session.user.empresaId;
  const today = new Date().toISOString().slice(0, 10);

  const { rows } = await pool.query<{
    conv_hoy: string;
    conv_ayer: string;
    hot_leads_hoy: string;
    hot_leads_ayer: string;
    citas_hoy: string;
    citas_hoy_confirmadas: string;
    citas_hoy_pendientes: string;
    total_leads: string;
    leads_cerrados: string;
    conv_total: string;
    conv_transfer: string;
  }>(
    `SELECT
      (SELECT COUNT(*) FROM conversaciones WHERE empresa_id=$1 AND DATE(creado_en)=$2) AS conv_hoy,
      (SELECT COUNT(*) FROM conversaciones WHERE empresa_id=$1 AND DATE(creado_en)=$2::date - 1) AS conv_ayer,
      (SELECT COUNT(*) FROM leads WHERE empresa_id=$1 AND nivel='alto' AND DATE(creado_en)=$2) AS hot_leads_hoy,
      (SELECT COUNT(*) FROM leads WHERE empresa_id=$1 AND nivel='alto' AND DATE(creado_en)=$2::date - 1) AS hot_leads_ayer,
      (SELECT COUNT(*) FROM citas WHERE empresa_id=$1 AND DATE(fecha_hora)=$2) AS citas_hoy,
      (SELECT COUNT(*) FROM citas WHERE empresa_id=$1 AND DATE(fecha_hora)=$2 AND estado='confirmada') AS citas_hoy_confirmadas,
      (SELECT COUNT(*) FROM citas WHERE empresa_id=$1 AND DATE(fecha_hora)=$2 AND estado='pendiente') AS citas_hoy_pendientes,
      (SELECT COUNT(*) FROM leads WHERE empresa_id=$1) AS total_leads,
      (SELECT COUNT(*) FROM leads WHERE empresa_id=$1 AND estado='cerrado') AS leads_cerrados,
      (SELECT COUNT(*) FROM conversaciones WHERE empresa_id=$1) AS conv_total,
      (SELECT COUNT(*) FROM conversaciones WHERE empresa_id=$1 AND estado='transferida') AS conv_transfer`,
    [empresaId, today],
  );

  const r = rows[0];
  const convHoy = Number(r.conv_hoy);
  const convAyer = Number(r.conv_ayer);
  const hotHoy = Number(r.hot_leads_hoy);
  const hotAyer = Number(r.hot_leads_ayer);
  const totalLeads = Number(r.total_leads);
  const leadsCerrados = Number(r.leads_cerrados);
  const convTotal = Number(r.conv_total);
  const convTransfer = Number(r.conv_transfer);

  const convTrend = convAyer > 0 ? Math.round(((convHoy - convAyer) / convAyer) * 100) : 0;
  const hotTrend = hotAyer > 0 ? Math.round(((hotHoy - hotAyer) / hotAyer) * 100) : 0;
  const conversion = totalLeads > 0 ? Math.round((leadsCerrados / totalLeads) * 100) : 0;
  const tasaBot = convTotal > 0 ? Math.round(((convTotal - convTransfer) / convTotal) * 100) : 100;

  return NextResponse.json({
    conversaciones: { value: convHoy, trend: convTrend },
    hotLeads: { value: hotHoy, trend: hotTrend },
    citasHoy: {
      value: Number(r.citas_hoy),
      confirmadas: Number(r.citas_hoy_confirmadas),
      pendientes: Number(r.citas_hoy_pendientes),
    },
    conversion: { value: conversion },
    tasaBot: { value: tasaBot },
  });
}
