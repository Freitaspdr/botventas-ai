import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/pool';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const nivel  = searchParams.get('nivel');
  const estado = searchParams.get('estado');

  const conditions: string[] = ['empresa_id = $1'];
  const values: unknown[]    = [session.user.empresaId];
  let idx = 2;

  if (nivel)  { conditions.push(`nivel = $${idx++}`);  values.push(nivel); }
  if (estado) { conditions.push(`estado = $${idx++}`); values.push(estado); }

  const { rows } = await pool.query(
    `SELECT cliente_nombre, cliente_tel, nivel, estado, interes, notas, creado_en
     FROM leads WHERE ${conditions.join(' AND ')}
     ORDER BY creado_en DESC`,
    values,
  );

  const headers = ['Nombre', 'Teléfono', 'Nivel', 'Estado', 'Interés', 'Notas', 'Fecha'];
  const csvLines = [
    headers.join(';'),
    ...rows.map((r) => [
      escapeCsv(r.cliente_nombre ?? ''),
      escapeCsv(r.cliente_tel    ?? ''),
      escapeCsv(r.nivel          ?? ''),
      escapeCsv(r.estado         ?? ''),
      escapeCsv(r.interes        ?? ''),
      escapeCsv(r.notas          ?? ''),
      escapeCsv(new Date(r.creado_en).toLocaleString('es-ES')),
    ].join(';')),
  ];

  const csv  = '\uFEFF' + csvLines.join('\r\n'); // BOM para Excel en Windows
  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leads-${fecha}.csv"`,
    },
  });
}

function escapeCsv(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
