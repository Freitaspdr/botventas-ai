import { db } from '../db/client';
import { getEvolutionConfigForEmpresa, sendText } from './whatsapp.service';
import { saveMessage } from './conversation.service';

export interface ContactoListItem {
  id: string;
  telefono: string;
  nombre: string | null;
  estado: string;
  origen: string;
  etiquetas: string[] | null;
  notas: string | null;
  ultima_interaccion_en: string | null;
  total_conversaciones: number;
  total_leads: number;
  total_citas: number;
  lead_estado: string | null;
  lead_nivel: string | null;
  ultima_conversacion_id: string | null;
  ultima_conversacion_estado: string | null;
}

export interface ConversacionListItem {
  id: string;
  contacto_id: string | null;
  cliente_tel: string;
  cliente_nombre: string | null;
  remote_jid: string | null;
  estado: string;
  es_hot_lead: boolean;
  nurturing_step: number;
  actualizada_en: string;
  ultimo_mensaje: string | null;
  ultimo_mensaje_rol: 'user' | 'assistant' | 'human' | null;
  total_mensajes: number;
  lead_nivel: string | null;
  lead_estado: string | null;
  lead_score: number | null;
}

export interface LeadListItem {
  id: string;
  contacto_id: string | null;
  conv_id: string | null;
  cliente_tel: string;
  cliente_nombre: string | null;
  estado: string;
  nivel: string;
  score: number | null;
  interes: string | null;
  notas: string | null;
  ticket_estimado: number | null;
  vehiculo: string | null;
  actualizado_en: string;
}

export async function listContactos(
  empresaId: string,
  params: { q?: string; estado?: string; limit?: number } = {},
): Promise<ContactoListItem[]> {
  const result = await db.query<ContactoListItem>(
    `SELECT
       ct.id,
       ct.telefono,
       ct.nombre,
       ct.estado,
       ct.origen,
       ct.etiquetas,
       ct.notas,
       ct.ultima_interaccion_en::text,
       COALESCE(conv.total_conversaciones, 0)::int AS total_conversaciones,
       COALESCE(ld.total_leads, 0)::int AS total_leads,
       COALESCE(ci.total_citas, 0)::int AS total_citas,
       last_lead.estado AS lead_estado,
       last_lead.nivel AS lead_nivel,
       last_conv.id AS ultima_conversacion_id,
       last_conv.estado AS ultima_conversacion_estado
     FROM contactos ct
     LEFT JOIN LATERAL (
       SELECT COUNT(*) AS total_conversaciones
       FROM conversaciones c
       WHERE c.contacto_id = ct.id
     ) conv ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*) AS total_leads
       FROM leads l
       WHERE l.contacto_id = ct.id
     ) ld ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*) AS total_citas
       FROM citas ci
       WHERE ci.contacto_id = ct.id
     ) ci ON true
     LEFT JOIN LATERAL (
       SELECT l.estado, l.nivel
       FROM leads l
       WHERE l.contacto_id = ct.id
       ORDER BY l.actualizado_en DESC, l.creado_en DESC
       LIMIT 1
     ) last_lead ON true
     LEFT JOIN LATERAL (
       SELECT c.id, c.estado
       FROM conversaciones c
       WHERE c.contacto_id = ct.id
       ORDER BY c.actualizada_en DESC, c.creado_en DESC
       LIMIT 1
     ) last_conv ON true
     WHERE ct.empresa_id = $1
       AND ($2::text IS NULL OR ct.estado = $2)
       AND (
         $3::text IS NULL
         OR ct.telefono ILIKE '%' || $3 || '%'
         OR COALESCE(ct.nombre, '') ILIKE '%' || $3 || '%'
         OR COALESCE(ct.notas, '') ILIKE '%' || $3 || '%'
       )
     ORDER BY COALESCE(ct.ultima_interaccion_en, ct.actualizado_en, ct.creado_en) DESC
     LIMIT $4`,
    [empresaId, params.estado ?? null, params.q ?? null, params.limit ?? 100],
  );

  return result.rows;
}

export async function getContactoDetalle(empresaId: string, contactoId: string): Promise<unknown | null> {
  const result = await db.query<{ payload: unknown }>(
    `SELECT json_build_object(
       'contacto', to_jsonb(ct),
       'lead', (
         SELECT to_jsonb(l)
         FROM leads l
         WHERE l.contacto_id = ct.id
         ORDER BY l.actualizado_en DESC, l.creado_en DESC
         LIMIT 1
       ),
       'cita', (
         SELECT to_jsonb(ci)
         FROM citas ci
         WHERE ci.contacto_id = ct.id
         ORDER BY ci.fecha_hora DESC
         LIMIT 1
       ),
       'conversaciones', (
         SELECT COALESCE(json_agg(
           json_build_object(
             'id', c.id,
             'estado', c.estado,
             'cliente_nombre', c.cliente_nombre,
             'cliente_tel', c.cliente_tel,
             'actualizada_en', c.actualizada_en
           )
           ORDER BY c.actualizada_en DESC
         ), '[]'::json)
         FROM conversaciones c
         WHERE c.contacto_id = ct.id
       )
     ) AS payload
     FROM contactos ct
     WHERE ct.id = $1
       AND ct.empresa_id = $2`,
    [contactoId, empresaId],
  );

  return result.rows[0]?.payload ?? null;
}

export async function listConversacionesCrm(
  empresaId: string,
  params: { q?: string; estado?: string; limit?: number } = {},
): Promise<ConversacionListItem[]> {
  const result = await db.query<ConversacionListItem>(
    `SELECT
       c.id,
       c.contacto_id,
       c.cliente_tel,
       c.cliente_nombre,
       c.remote_jid,
       c.estado,
       c.es_hot_lead,
       c.nurturing_step,
       c.actualizada_en::text,
       last_message.contenido AS ultimo_mensaje,
       last_message.rol AS ultimo_mensaje_rol,
       totals.total_mensajes::int AS total_mensajes,
       l.nivel AS lead_nivel,
       l.estado AS lead_estado,
       l.score AS lead_score
     FROM conversaciones c
     LEFT JOIN LATERAL (
       SELECT m.contenido, m.rol
       FROM mensajes m
       WHERE m.conv_id = c.id
       ORDER BY m.enviado_en DESC
       LIMIT 1
     ) last_message ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*) AS total_mensajes
       FROM mensajes m
       WHERE m.conv_id = c.id
     ) totals ON true
     LEFT JOIN leads l
       ON l.conv_id = c.id
     WHERE c.empresa_id = $1
       AND ($2::text IS NULL OR c.estado = $2)
       AND (
         $3::text IS NULL
         OR c.cliente_tel ILIKE '%' || $3 || '%'
         OR COALESCE(c.cliente_nombre, '') ILIKE '%' || $3 || '%'
       )
     ORDER BY c.actualizada_en DESC
     LIMIT $4`,
    [empresaId, params.estado ?? null, params.q ?? null, params.limit ?? 100],
  );

  return result.rows;
}

export async function getConversacionCrmDetalle(
  empresaId: string,
  convId: string,
): Promise<unknown | null> {
  const result = await db.query<{ payload: unknown }>(
    `SELECT json_build_object(
       'conversacion', (
         SELECT to_jsonb(c)
         FROM conversaciones c
         WHERE c.id = $1
           AND c.empresa_id = $2
       ),
       'contacto', (
         SELECT to_jsonb(ct)
         FROM conversaciones c
         JOIN contactos ct ON ct.id = c.contacto_id
         WHERE c.id = $1
           AND c.empresa_id = $2
       ),
       'mensajes', (
         SELECT COALESCE(json_agg(
           json_build_object(
             'rol', m.rol,
             'contenido', m.contenido,
             'enviado_en', m.enviado_en
           )
           ORDER BY m.enviado_en
         ), '[]'::json)
         FROM mensajes m
         WHERE m.conv_id = $1
       ),
       'lead', (
         SELECT to_jsonb(l)
         FROM leads l
         WHERE l.conv_id = $1
         ORDER BY l.actualizado_en DESC
         LIMIT 1
       ),
       'cita', (
         SELECT to_jsonb(ci)
         FROM citas ci
         WHERE ci.conv_id = $1
         ORDER BY ci.fecha_hora DESC
         LIMIT 1
       )
     ) AS payload`,
    [convId, empresaId],
  );

  const payload = result.rows[0]?.payload as { conversacion?: unknown } | undefined;
  if (!payload || !payload.conversacion) {
    return null;
  }

  return payload;
}

export async function listLeadsCrm(
  empresaId: string,
  params: { estado?: string; nivel?: string; limit?: number } = {},
): Promise<LeadListItem[]> {
  const result = await db.query<LeadListItem>(
    `SELECT
       l.id,
       l.contacto_id,
       l.conv_id,
       l.cliente_tel,
       l.cliente_nombre,
       l.estado,
       l.nivel,
       l.score,
       l.interes,
       l.notas,
       l.ticket_estimado,
       l.vehiculo,
       l.actualizado_en::text
     FROM leads l
     WHERE l.empresa_id = $1
       AND ($2::text IS NULL OR l.estado = $2)
       AND ($3::text IS NULL OR l.nivel = $3)
     ORDER BY l.actualizado_en DESC, l.creado_en DESC
     LIMIT $4`,
    [empresaId, params.estado ?? null, params.nivel ?? null, params.limit ?? 100],
  );

  return result.rows;
}

export async function updateConversacionEstado(
  empresaId: string,
  convId: string,
  estado: 'activa' | 'cerrada' | 'transferida',
): Promise<ConversacionListItem | null> {
  const result = await db.query<ConversacionListItem>(
    `UPDATE conversaciones
     SET estado = $3,
         actualizada_en = NOW()
     WHERE id = $1
       AND empresa_id = $2
     RETURNING
       id,
       contacto_id,
       cliente_tel,
       cliente_nombre,
       remote_jid,
       estado,
       es_hot_lead,
       nurturing_step,
       actualizada_en::text,
       NULL::text AS ultimo_mensaje,
       NULL::varchar(10) AS ultimo_mensaje_rol,
       0::int AS total_mensajes,
       NULL::varchar(10) AS lead_nivel,
       NULL::varchar(20) AS lead_estado,
       NULL::int AS lead_score`,
    [convId, empresaId, estado],
  );

  return result.rows[0] ?? null;
}

export async function sendHumanMessage(
  empresaId: string,
  convId: string,
  text: string,
): Promise<{ ok: true; sentAt: string; estado: string }> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Mensaje vacío');
  }

  const convResult = await db.query<{
    id: string;
    cliente_tel: string;
    remote_jid: string | null;
    estado: string;
  }>(
    `SELECT id, cliente_tel, remote_jid, estado
     FROM conversaciones
     WHERE id = $1
       AND empresa_id = $2
     LIMIT 1`,
    [convId, empresaId],
  );

  const conv = convResult.rows[0];
  if (!conv) {
    throw new Error('Conversación no encontrada');
  }

  const evoCfg = await getEvolutionConfigForEmpresa(empresaId);
  const destination = conv.remote_jid ?? conv.cliente_tel;

  await sendText(destination, trimmed, evoCfg.instance, evoCfg.url, evoCfg.key);
  await saveMessage(convId, 'human', trimmed);
  await db.query(
    `UPDATE conversaciones
     SET estado = 'transferida',
         nurturing_step = 0,
         actualizada_en = NOW()
     WHERE id = $1`,
    [convId],
  );

  return {
    ok: true,
    sentAt: new Date().toISOString(),
    estado: 'transferida',
  };
}
