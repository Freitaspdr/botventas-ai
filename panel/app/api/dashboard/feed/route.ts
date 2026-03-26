import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/pool';

interface FeedRow {
  id: string;
  cliente_tel: string;
  cliente_nombre: string;
  estado: string;
  nurturing_step: number;
  es_hot_lead: boolean;
  actualizada_en: string;
  ultimo_mensaje: string | null;
  ultimo_rol: string | null;
  lead_nivel: string | null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rows } = await pool.query<FeedRow>(
    `SELECT c.id, c.cliente_tel, c.cliente_nombre, c.estado, c.nurturing_step, c.es_hot_lead,
       c.actualizada_en,
       (SELECT contenido FROM mensajes WHERE conv_id = c.id ORDER BY enviado_en DESC LIMIT 1) AS ultimo_mensaje,
       (SELECT rol     FROM mensajes WHERE conv_id = c.id ORDER BY enviado_en DESC LIMIT 1) AS ultimo_rol,
       l.nivel AS lead_nivel
     FROM conversaciones c
     LEFT JOIN leads l ON l.conv_id = c.id
     WHERE c.empresa_id = $1
     ORDER BY c.actualizada_en DESC
     LIMIT 7`,
    [session.user.empresaId],
  );

  return NextResponse.json(rows);
}
