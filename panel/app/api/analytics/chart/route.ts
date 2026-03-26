import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/pool';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dias = Math.max(1, Math.min(365, parseInt(searchParams.get('dias') ?? '30', 10) || 30));
  const empresaId = session.user.empresaId;

  const [{ rows: leadsRows }, { rows: citasRows }, { rows: convRows }] = await Promise.all([
    pool.query(
      `SELECT DATE(creado_en) AS fecha, COUNT(*) AS count
       FROM leads WHERE empresa_id=$1 AND creado_en >= NOW() - ($2 || ' days')::interval
       GROUP BY fecha ORDER BY fecha`,
      [empresaId, dias],
    ),
    pool.query(
      `SELECT DATE(creado_en) AS fecha, COUNT(*) AS count
       FROM citas WHERE empresa_id=$1 AND creado_en >= NOW() - ($2 || ' days')::interval
       GROUP BY fecha ORDER BY fecha`,
      [empresaId, dias],
    ),
    pool.query(
      `SELECT DATE(creado_en) AS fecha, COUNT(*) AS count
       FROM conversaciones WHERE empresa_id=$1 AND creado_en >= NOW() - ($2 || ' days')::interval
       GROUP BY fecha ORDER BY fecha`,
      [empresaId, dias],
    ),
  ]);

  // Build date index
  const fechas = new Set<string>();
  [...leadsRows, ...citasRows, ...convRows].forEach(r => fechas.add(String(r.fecha).slice(0, 10)));

  const sorted = Array.from(fechas).sort();
  const leadsMap = Object.fromEntries(leadsRows.map(r => [String(r.fecha).slice(0, 10), Number(r.count)]));
  const citasMap = Object.fromEntries(citasRows.map(r => [String(r.fecha).slice(0, 10), Number(r.count)]));
  const convMap  = Object.fromEntries(convRows.map(r => [String(r.fecha).slice(0, 10), Number(r.count)]));

  const data = sorted.map(fecha => ({
    fecha,
    leads:          leadsMap[fecha] ?? 0,
    citas:          citasMap[fecha] ?? 0,
    conversaciones: convMap[fecha]  ?? 0,
  }));

  return NextResponse.json(data);
}
