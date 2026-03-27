import { db } from '../db/client';
import { ChatMessage } from './anthropic.service';
import { AI_TAGS, AiTag } from '../prompts/system-prompt';

// ─── Empresa ────────────────────────────────────────────────────────────────

export interface Empresa {
  id:                 string;
  nombre:             string;
  whatsapp_num:       string;
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

// ─── Conversación ────────────────────────────────────────────────────────────

export interface Conversacion {
  id:             string;
  empresa_id:     string;
  cliente_tel:    string;
  cliente_nombre: string | null;
  estado:         string;
  es_hot_lead:    boolean;
}

export async function getOrCreateConversacion(
  empresaId: string,
  clienteTel: string,
  clienteNombre?: string,
): Promise<{ conv: Conversacion; isNew: boolean }> {
  // Busca conversación activa existente
  const existing = await db.query<Conversacion>(
    `SELECT * FROM conversaciones
     WHERE empresa_id = $1 AND cliente_tel = $2 AND estado = 'activa'`,
    [empresaId, clienteTel],
  );

  if (existing.rows[0]) return { conv: existing.rows[0], isNew: false };

  // Crea nueva conversación
  const result = await db.query<Conversacion>(
    `INSERT INTO conversaciones (empresa_id, cliente_tel, cliente_nombre)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [empresaId, clienteTel, clienteNombre ?? null],
  );

  // Incrementa contador de uso de la empresa
  await db.query(
    'UPDATE empresas SET conv_usadas = conv_usadas + 1 WHERE id = $1',
    [empresaId],
  );

  return { conv: result.rows[0], isNew: true };
}

// ─── Mensajes ────────────────────────────────────────────────────────────────

export async function saveMessage(
  convId: string,
  rol: 'user' | 'assistant',
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
}

export async function getHistory(convId: string, limit = 25): Promise<ChatMessage[]> {
  const result = await db.query<{ rol: 'user' | 'assistant'; contenido: string }>(
    `SELECT rol, contenido FROM mensajes
     WHERE conv_id = $1
     ORDER BY enviado_en DESC
     LIMIT $2`,
    [convId, limit],
  );
  // Retorna en orden cronológico
  return result.rows.reverse().map((r) => ({ role: r.rol, content: r.contenido }));
}

// ─── Tags de IA ──────────────────────────────────────────────────────────────

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
        `UPDATE conversaciones SET estado = 'transferida' WHERE id = $1`,
        [conv.id],
      );
      console.log(`📞 [TRANSFER] Empresa: ${empresa.nombre} | Cliente: ${conv.cliente_tel}`);
    }

    if (tag === AI_TAGS.HOT_LEAD) {
      await db.query(
        'UPDATE conversaciones SET es_hot_lead = true WHERE id = $1',
        [conv.id],
      );
      console.log(`🔥 [HOT_LEAD] Empresa: ${empresa.nombre} | Cliente: ${conv.cliente_tel}`);
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
    `INSERT INTO leads (empresa_id, conv_id, cliente_tel, cliente_nombre, nivel)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT DO NOTHING`,
    [empresa.id, conv.id, conv.cliente_tel, clienteNombre ?? conv.cliente_nombre, nivel],
  );
}

// ─── Límite de plan ──────────────────────────────────────────────────────────

export function isWithinLimit(empresa: Empresa): boolean {
  return empresa.conv_usadas < empresa.conv_limite;
}

// ─── Citas ────────────────────────────────────────────────────────────────────

export async function saveCita(params: {
  empresaId:       string;
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
       (empresa_id, conv_id, cliente_tel, cliente_nombre, servicio, vehiculo,
        fecha_hora, google_event_id, google_event_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      params.empresaId,      params.convId,          params.clienteTel,
      params.clienteNombre ?? null, params.servicio, params.vehiculo ?? null,
      params.fechaHora,      params.googleEventId ?? null, params.googleEventUrl ?? null,
    ],
  );
}
