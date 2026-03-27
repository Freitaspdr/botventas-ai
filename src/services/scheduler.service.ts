// ============================================
// BOTVENTAS AI - Servicio de Mensajes Programados
// Envía mensajes que se difirieron (ej: nocturnos)
// ============================================

import { db } from '../db/client';
import { sendText, getEvolutionConfigForEmpresa } from './whatsapp.service';
import { saveMessage } from './conversation.service';

interface DeferredMessage {
  id:          string;
  conv_id:     string;
  empresa_id:  string;
  cliente_tel: string;
  remote_jid:  string | null;
  contenido:   string;
}

/**
 * Envía todos los mensajes programados cuya hora ya pasó.
 * Llamar desde un setInterval cada 5 minutos.
 */
export async function sendDeferredMessages(): Promise<void> {
  const pending = await db.query<DeferredMessage>(
    `SELECT mp.id, mp.conv_id, mp.cliente_tel, mp.remote_jid, mp.contenido, c.empresa_id
     FROM mensajes_programados mp
     JOIN conversaciones c ON mp.conv_id = c.id
     WHERE mp.enviado = false AND mp.enviar_en <= NOW()
     ORDER BY mp.enviar_en ASC
     LIMIT 10`,
  );

  for (const msg of pending.rows) {
    try {
      const evoCfg = await getEvolutionConfigForEmpresa(msg.empresa_id);
      // Usar remote_jid si está disponible (formato correcto para @lid), si no cliente_tel
      const destination = msg.remote_jid ?? msg.cliente_tel;
      await sendText(destination, msg.contenido, evoCfg.instance, evoCfg.url, evoCfg.key);
      await db.query(
        'UPDATE mensajes_programados SET enviado = true WHERE id = $1',
        [msg.id],
      );
      console.log(`📬 Mensaje diferido enviado → ${destination}`);
    } catch (err) {
      console.error(`❌ Error enviando mensaje diferido ${msg.id}:`, err);
    }
  }
}
