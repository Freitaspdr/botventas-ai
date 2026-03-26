import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import supabase from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const nivel  = searchParams.get('nivel');
  const estado = searchParams.get('estado');

  const { data, error } = await supabase.rpc('get_leads_export', {
    p_empresa_id: session.user.empresaId,
    p_nivel:  nivel  ?? null,
    p_estado: estado ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const headers = ['Nombre', 'Teléfono', 'Nivel', 'Estado', 'Interés', 'Notas', 'Fecha'];
  const csvLines = [
    headers.join(';'),
    ...rows.map((r) => [
      escapeCsv(String(r.cliente_nombre ?? '')),
      escapeCsv(String(r.cliente_tel    ?? '')),
      escapeCsv(String(r.nivel          ?? '')),
      escapeCsv(String(r.estado         ?? '')),
      escapeCsv(String(r.interes        ?? '')),
      escapeCsv(String(r.notas          ?? '')),
      escapeCsv(new Date(String(r.creado_en)).toLocaleString('es-ES')),
    ].join(';')),
  ];

  const csv   = '\uFEFF' + csvLines.join('\r\n');
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
