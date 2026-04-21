import { PoolClient } from 'pg';
import { db, withTransaction } from '../db/client';
import { ChatMessage } from './anthropic.service';
import { AI_TAGS, AiTag } from '../prompts/system-prompt';

// Empresa

export interface Empresa {
  id:                 string;
  nombre:             string;
  whatsapp_num:       string;
  crm_api_token:      string | null;
  evolution_instance: string | null;
  evolution_api_url:  string | null;
  evolution_api_key:  string | null;
  plan:               string;
  activo:             boolean;
  bot_nombre:         string;
  bot_tono:           'amigable' | 'profesional' | 'formal';
  bot_objetivo:       string;
  bot_productos:      string;
  bot_horarios:       string;
  bot_ciudad:         string;
  bot_extra:          string | null;
  conv_limite:        number;
  conv_usadas:        number;
  encargado_tel:      string | null;
  notif_hot_leads:    boolean;
  notif_transfers:    boolean;
  notif_nuevos:       boolean;
  notif_resumen:      boolean;
}

export interface Contacto {
  id:                    string;
  empresa_id:            string;
  telefono:              string;
  nombre:                string | null;
  canal:                 'whatsapp';
  estado:                'activo' | 'archivado' | 'bloqueado';
  origen:                'bot' | 'humano' | 'importado' | 'api';
  notas:                 string | null;
  etiquetas:             string[] | null;
  ultimo_mensaje_en:     Date | null;
  ultima_interaccion_en: Date | null;
  creado_en:             Date;
  actualizado_en:        Date;
}

export async function getEmpresaByWhatsapp(whatsappNum: string): Promise<Empresa | null> {
  const result = await db.query<Empresa>(
    'SELECT * FROM empresas WHERE whatsapp_num = $1 AND activo = true',
    [whatsappNum],
  );
  return result.rows[0] ?? null;
}

export async function getEmpresaByInstance(instance: string): Promise<Empresa | null> {
  const result = await db.query<Empresa>(
    'SELECT * FROM empresas WHERE evolution_instance = $1 AND activo = true',
    [instance],
  );
  return result.rows[0] ?? null;
}

export async function getEmpresaById(empresaId: string): Promise<Empresa | null> {
  const result = await db.query<Empresa>(
    'SELECT * FROM empresas WHERE id = $1 AND activo = true',
    [empresaId],
  );
  return result.rows[0] ?? null;
}

export async function getEmpresaByCrmToken(crmToken: string): Promise<Empresa | null> {
  const result = await db.query<Empresa>(
    'SELECT * FROM empresas WHERE crm_api_token = $1 AND activo = true',
    [crmToken],
  );
  return result.rows[0] ?? null;
}

// Conversacion

export interface Conversacion {
  id:             string;
  empresa_id:     string;
  contacto_id:    string | null;
  cliente_tel:    string;
  cliente_nombre: string | null;
  remote_jid:     string | null;
  estado:         string;
  es_hot_lead:    boolean;
}

export async function getOrCreateConversacion(
  empresaId: string,
  clienteTel: string,
  clienteNombre?: string,
  remoteJid?: string,
): Promise<{ conv: Conversacion; isNew: boolean }> {
  return withTransaction(async (client) => {
    const contacto = await getOrCreateContactoTx(client, empresaId, clienteTel, clienteNombre);

    const existing = await client.query<Conversacion>(
      `SELECT * FROM conversaciones
       WHERE empresa_id = $1 AND cliente_tel = $2 AND estado = 'activa'
       LIMIT 1
       FOR UPDATE`,
      [empresaId, clienteTel],
    );

    if (existing.rows[0]) {
      const synced = await client.query<Conversacion>(
        `UPDATE conversaciones
         SET contacto_id = COALESCE(contacto_id, $2),
             cliente_nombre = COALESCE(cliente_nombre, $3),
             remote_jid = COALESCE($4, remote_jid)
         WHERE id = $1
         RETURNING *`,
        [existing.rows[0].id, contacto.id, clienteNombre ?? null, remoteJid ?? null],
      );
      return { conv: synced.rows[0] ?? existing.rows[0], isNew: false };
    }

    const result = await client.query<Conversacion & { inserted: boolean }>(
      `INSERT INTO conversaciones (empresa_id, contacto_id, cliente_tel, cliente_nombre, remote_jid)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (empresa_id, cliente_tel)
       WHERE estado = 'activa'
       DO UPDATE
         SET contacto_id = COALESCE(conversaciones.contacto_id, EXCLUDED.contacto_id),
             cliente_nombre = COALESCE(conversaciones.cliente_nombre, EXCLUDED.cliente_nombre),
             remote_jid = COALESCE(EXCLUDED.remote_jid, conversaciones.remote_jid)
       RETURNING *, (xmax = 0) AS inserted`,
      [empresaId, contacto.id, clienteTel, clienteNombre ?? null, remoteJid ?? null],
    );

    if (result.rows[0]?.inserted) {
      await client.query(
        'UPDATE empresas SET conv_usadas = conv_usadas + 1 WHERE id = $1',
        [empresaId],
      );
    }

    return { conv: result.rows[0], isNew: result.rows[0]?.inserted ?? false };
  });
}

// Mensajes

export async function saveMessage(
  convId: string,
  rol: 'user' | 'assistant' | 'human',
  contenido: string,
): Promise<void> {
  await db.query(
    'INSERT INTO mensajes (conv_id, rol, contenido) VALUES ($1, $2, $3)',
    [convId, rol, contenido],
  );
  await db.query(
    'UPDATE conversaciones SET actualizada_en = NOW() WHERE id = $1',
    [convId],
  );
  await db.query(
    `UPDATE contactos
     SET ultimo_mensaje_en = NOW(),
         ultima_interaccion_en = NOW(),
         actualizado_en = NOW()
     WHERE id = (
       SELECT contacto_id
       FROM conversaciones
       WHERE id = $1
     )`,
    [convId],
  );
}

export async function getHistory(convId: string, limit = 25): Promise<ChatMessage[]> {
  const result = await db.query<{ rol: 'user' | 'assistant' | 'human'; contenido: string }>(
    `SELECT rol, contenido FROM mensajes
     WHERE conv_id = $1
     ORDER BY enviado_en DESC
     LIMIT $2`,
    [convId, limit],
  );

  return result.rows.reverse().map((row) => ({
    role: row.rol === 'human' ? 'assistant' : row.rol,
    content: row.contenido,
  }));
}

// Tags IA

export async function handleAiTags(
  conv: Conversacion,
  empresa: Empresa,
  tags: AiTag[],
  clienteNombre?: string,
): Promise<void> {
  for (const tag of tags) {
    if (tag === AI_TAGS.HOT_LEAD || tag === AI_TAGS.WARM_LEAD) {
      await registerLead(conv, empresa, tag, clienteNombre);
    }

    if (tag === AI_TAGS.TRANSFER_HUMAN) {
      await db.query(
        'UPDATE conversaciones SET estado = $2 WHERE id = $1',
        [conv.id, 'transferida'],
      );
      console.log(`[TRANSFER] Empresa: ${empresa.nombre} | Cliente: ${conv.cliente_tel}`);
    }

    if (tag === AI_TAGS.HOT_LEAD) {
      await db.query(
        'UPDATE conversaciones SET es_hot_lead = true WHERE id = $1',
        [conv.id],
      );
      console.log(`[HOT_LEAD] Empresa: ${empresa.nombre} | Cliente: ${conv.cliente_tel}`);
    }
  }
}

async function registerLead(
  conv: Conversacion,
  empresa: Empresa,
  tag: AiTag,
  clienteNombre?: string,
): Promise<void> {
  const nivel = tag === AI_TAGS.HOT_LEAD ? 'alto' : 'medio';

  await db.query(
    `INSERT INTO leads (empresa_id, contacto_id, conv_id, cliente_tel, cliente_nombre, nivel)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (empresa_id, cliente_tel)
     DO UPDATE
       SET contacto_id = COALESCE(leads.contacto_id, EXCLUDED.contacto_id),
           conv_id = EXCLUDED.conv_id,
           cliente_nombre = COALESCE(leads.cliente_nombre, EXCLUDED.cliente_nombre),
           nivel = CASE
             WHEN leads.nivel = 'alto' OR EXCLUDED.nivel = 'alto' THEN 'alto'
             WHEN leads.nivel = 'medio' OR EXCLUDED.nivel = 'medio' THEN 'medio'
             ELSE 'bajo'
           END,
           actualizado_en = NOW()`,
    [empresa.id, conv.contacto_id, conv.id, conv.cliente_tel, clienteNombre ?? conv.cliente_nombre, nivel],
  );
}

// Limite de plan

export function isWithinLimit(empresa: Empresa): boolean {
  return empresa.conv_usadas < empresa.conv_limite;
}

// Citas

export async function saveCita(params: {
  empresaId:       string;
  contactoId?:     string | null;
  convId:          string;
  clienteTel:      string;
  clienteNombre?:  string;
  servicio:        string;
  vehiculo?:       string;
  fechaHora:       Date;
  googleEventId?:  string;
  googleEventUrl?: string;
}): Promise<void> {
  await db.query(
    `INSERT INTO citas
       (empresa_id, contacto_id, conv_id, cliente_tel, cliente_nombre, servicio, vehiculo,
        fecha_hora, google_event_id, google_event_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      params.empresaId,
      params.contactoId ?? null,
      params.convId,
      params.clienteTel,
      params.clienteNombre ?? null,
      params.servicio,
      params.vehiculo ?? null,
      params.fechaHora,
      params.googleEventId ?? null,
      params.googleEventUrl ?? null,
    ],
  );
}

async function getOrCreateContactoTx(
  client: PoolClient,
  empresaId: string,
  telefono: string,
  nombre?: string,
): Promise<Contacto> {
  const result = await client.query<Contacto>(
    `INSERT INTO contactos (empresa_id, telefono, nombre, ultimo_mensaje_en, ultima_interaccion_en)
     VALUES ($1, $2, $3, NOW(), NOW())
     ON CONFLICT (empresa_id, telefono)
     DO UPDATE
       SET nombre = COALESCE(contactos.nombre, EXCLUDED.nombre),
           ultima_interaccion_en = NOW(),
           actualizado_en = NOW()
     RETURNING *`,
    [empresaId, telefono, nombre ?? null],
  );

  return result.rows[0];
}
