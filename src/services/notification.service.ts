// ============================================
// BOTVENTAS AI - Servicio de Notificaciones
// Alerta al encargado vía WhatsApp
// ============================================

import { sendText } from './whatsapp.service';
import { Empresa } from './conversation.service';
import { db } from '../db/client';
import { env } from '../config/env';

function evoArgs(empresa: Empresa): [string, string, string] {
  return [
    empresa.evolution_instance ?? env.EVOLUTION_INSTANCE,
    empresa.evolution_api_url  ?? env.EVOLUTION_API_URL,
    empresa.evolution_api_key  ?? env.EVOLUTION_API_KEY,
  ];
}

interface NotificationData {
  clienteTel: string;
  clienteNombre?: string;
  servicio?: string;
  vehiculo?: string;
  mensaje?: string;
}

/**
 * Notifica al encargado de la empresa cuando hay un HOT_LEAD
 */
export async function notifyHotLead(
  empresa: Empresa,
  data: NotificationData,
): Promise<void> {
  if (!empresa.notif_hot_leads) return;
  const encargadoTel = await getEncargadoTel(empresa.id);
  if (!encargadoTel) return;

  const msg =
    `🔥 *LEAD CALIENTE*\n\n` +
    `👤 ${data.clienteNombre ?? 'Sin nombre'}\n` +
    `📱 ${data.clienteTel}\n` +
    (data.vehiculo ? `🚗 ${data.vehiculo}\n` : '') +
    (data.servicio ? `🔧 ${data.servicio}\n` : '') +
    `\n_Este cliente tiene alta intención de compra._`;

  await sendText(encargadoTel, msg, ...evoArgs(empresa)).catch(err =>
    console.error('❌ Error enviando notif HOT_LEAD:', err),
  );
}

/**
 * Notifica al encargado cuando se solicita transferencia a humano
 */
export async function notifyTransfer(
  empresa: Empresa,
  data: NotificationData,
): Promise<void> {
  if (!empresa.notif_transfers) return;
  const encargadoTel = await getEncargadoTel(empresa.id);
  if (!encargadoTel) return;

  const msg =
    `📞 *TRANSFERENCIA SOLICITADA*\n\n` +
    `👤 ${data.clienteNombre ?? 'Sin nombre'}\n` +
    `📱 ${data.clienteTel}\n` +
    (data.mensaje ? `💬 Último mensaje: "${data.mensaje.substring(0, 100)}"\n` : '') +
    `\n_El cliente quiere hablar con una persona. Respóndele directamente._`;

  await sendText(encargadoTel, msg, ...evoArgs(empresa)).catch(err =>
    console.error('❌ Error enviando notif TRANSFER:', err),
  );
}

/**
 * Notifica nuevo lead al encargado
 */
export async function notifyNewLead(
  empresa: Empresa,
  data: NotificationData,
): Promise<void> {
  if (!empresa.notif_nuevos) return;
  const encargadoTel = await getEncargadoTel(empresa.id);
  if (!encargadoTel) return;

  const msg =
    `📩 *NUEVO LEAD*\n\n` +
    `👤 ${data.clienteNombre ?? 'Sin nombre'}\n` +
    `📱 ${data.clienteTel}\n` +
    `💬 "${(data.mensaje ?? '').substring(0, 120)}"`;

  await sendText(encargadoTel, msg, ...evoArgs(empresa)).catch(err =>
    console.error('❌ Error enviando notif NEW_LEAD:', err),
  );
}

/**
 * Envía resumen diario al encargado
 */
export async function sendDailySummary(empresaId: string): Promise<void> {
  const empresa = await db.query<Empresa>(
    'SELECT * FROM empresas WHERE id = $1', [empresaId],
  );
  if (!empresa.rows[0]) return;

  const emp = empresa.rows[0];
  if (!emp.notif_resumen) return;
  const encargadoTel = await getEncargadoTel(empresaId);
  if (!encargadoTel) return;

  const stats = await db.query<{
    convs: string; msgs: string; leads: string; hot: string;
  }>(`
    SELECT
      (SELECT COUNT(*) FROM conversaciones WHERE empresa_id = $1 AND creado_en::date = CURRENT_DATE)::text AS convs,
      (SELECT COUNT(*) FROM mensajes m JOIN conversaciones c ON m.conv_id = c.id WHERE c.empresa_id = $1 AND m.enviado_en::date = CURRENT_DATE)::text AS msgs,
      (SELECT COUNT(*) FROM leads WHERE empresa_id = $1 AND creado_en::date = CURRENT_DATE)::text AS leads,
      (SELECT COUNT(*) FROM leads WHERE empresa_id = $1 AND creado_en::date = CURRENT_DATE AND nivel = 'alto')::text AS hot
  `, [empresaId]);

  const s = stats.rows[0];
  const msg =
    `📊 *RESUMEN DEL DÍA - ${emp.nombre}*\n\n` +
    `💬 Conversaciones: ${s.convs}\n` +
    `📨 Mensajes: ${s.msgs}\n` +
    `👤 Leads nuevos: ${s.leads}\n` +
    `🔥 Leads calientes: ${s.hot}\n` +
    `📈 Uso del plan: ${emp.conv_usadas}/${emp.conv_limite}`;

  await sendText(encargadoTel, msg, ...evoArgs(emp)).catch(err =>
    console.error('❌ Error enviando resumen diario:', err),
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Devuelve los IDs de todas las empresas activas
 */
export async function getAllEmpresasActivasIds(): Promise<string[]> {
  const result = await db.query<{ id: string }>(
    `SELECT id FROM empresas WHERE activo = true`,
  );
  return result.rows.map(r => r.id);
}

async function getEncargadoTel(empresaId: string): Promise<string | null> {
  const result = await db.query<{ tel: string }>(
    `SELECT COALESCE(encargado_tel, whatsapp_num) AS tel
     FROM empresas WHERE id = $1`,
    [empresaId],
  );
  const tel = result.rows[0]?.tel;
  return tel || null;
}
