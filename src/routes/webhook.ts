import { Router, Request, Response } from 'express';
import {
  EvolutionWebhookPayload,
  extractPhone,
  extractMessageText,
  sendText,
  getEvolutionConfigForEmpresa,
  connectEvolutionInstance,
  getEvolutionInstanceStatus,
} from '../services/whatsapp.service';
import {
  getEmpresaByWhatsapp,
  getEmpresaByInstance,
  getOrCreateConversacion,
  getHistory,
  saveMessage,
  handleAiTags,
  isWithinLimit,
  saveCita,
  Conversacion,
  Empresa,
} from '../services/conversation.service';
import { chat } from '../services/anthropic.service';
import { calculateDelay, splitMessage, sleep } from '../services/humanize.service';
import { notifyHotLead, notifyTransfer, notifyNewLead } from '../services/notification.service';
import { getAvailableSlots, formatSlot } from '../services/calendar.service';
import { AI_TAGS } from '../prompts/system-prompt';
import { env } from '../config/env';

export const webhookRouter = Router();

// ─── Health check ─────────────────────────────────────────────────────────────
webhookRouter.get('/webhook', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Endpoints de estado/conexión de instancia (para frontend Evolution manager local) ──
webhookRouter.get('/instance/status/:instance', async (req: Request, res: Response) => {
  const instance = req.params.instance;
  try {
    const result = await getEvolutionInstanceStatus(instance);
    res.json({ ok: true, ...result.data });
  } catch (err: any) {
    console.error('❌ Error getting instance status:', instance, err?.message ?? err);
    res.status(err?.response?.status || 500).json({ ok: false, error: err?.message || 'Error interno' });
  }
});

webhookRouter.post('/instance/connect/:instance', async (req: Request, res: Response) => {
  const instance = req.params.instance;
  try {
    const result = await connectEvolutionInstance(instance);
    res.json({ ok: true, ...result.data });
  } catch (err: any) {
    console.error('❌ Error connecting instance:', instance, err?.message ?? err);
    res.status(err?.response?.status || 500).json({ ok: false, error: err?.message || 'Error interno' });
  }
});

// ─── Webhook principal de Evolution API ───────────────────────────────────────
webhookRouter.post('/webhook', async (req: Request, res: Response) => {
  // Responde 200 rápido para que Evolution API no reintente
  res.sendStatus(200);

  const payload = req.body as EvolutionWebhookPayload;

  // Solo procesamos mensajes entrantes de texto
  if (payload.event !== 'messages.upsert') return;
  if (payload.data.key.fromMe) return;
  if (payload.data.key.remoteJid.endsWith('@g.us')) return; // ignorar grupos

  const remoteJid  = payload.data.key.remoteJid;          // JID completo (puede ser @lid)
  const clienteTel = extractPhone(remoteJid);               // Solo para BD
  const clienteNombre = payload.data.pushName;
  const messageText = extractMessageText(payload);

  if (!messageText?.trim()) return;

  console.log(`📩 [${payload.instance}] ${clienteTel}: ${messageText}`);

  try {
    // 1. Busca la empresa por el nombre de instancia del webhook (multi-tenant)
    //    Fallback: usa EVOLUTION_INSTANCE del .env para compatibilidad legacy
    const empresa = await getEmpresaByInstance(payload.instance)
      ?? await getEmpresaByWhatsapp(env.EVOLUTION_INSTANCE);

    if (!empresa) {
      console.warn(`⚠️  Empresa no encontrada para instancia: ${payload.instance}`);
      return;
    }

    // 2. Resuelve config Evolution API de esta empresa (con fallback al .env)
    const evoCfg = await getEvolutionConfigForEmpresa(empresa.id);

    // 3. Verifica límite del plan
    if (!isWithinLimit(empresa)) {
      await sendText(
        remoteJid,
        '⚠️ El servicio de atención automática está temporalmente suspendido. ' +
        'Nos comunicaremos contigo pronto.',
        evoCfg.instance, evoCfg.url, evoCfg.key,
      );
      return;
    }

    // 3. Obtiene o crea la conversación
    const { conv, isNew } = await getOrCreateConversacion(empresa.id, clienteTel, clienteNombre);

    // Si ya fue transferida a humano, no respondemos automáticamente
    if (conv.estado === 'transferida') {
      console.log(`👤 Conversación ${conv.id} ya transferida a humano, ignorando.`);
      return;
    }

    // 4. Guarda mensaje del cliente
    await saveMessage(conv.id, 'user', messageText);

    // Si el lead estaba en nurturing y responde, resetear nurturing
    if (!isNew) {
      await resetNurturing(conv.id);
    }

    // 5. Recupera historial (incluye el mensaje que acabamos de guardar)
    const history = await getHistory(conv.id);

    // Si es conversación nueva, inyectamos contexto de bienvenida al historial
    // para que Claude sepa que debe presentarse
    const effectiveHistory = isNew
      ? []  // sin historial previo — Claude sabrá que es el primer mensaje
      : history.slice(0, -1); // historial sin el último (que es el mensaje actual)

    // 6. Llama a Claude
    const aiResponse = await chat(
      {
        bot_nombre:    empresa.bot_nombre,
        nombre:        empresa.nombre,
        bot_tono:      empresa.bot_tono,
        bot_objetivo:  empresa.bot_objetivo,
        bot_productos: empresa.bot_productos,
        bot_horarios:  empresa.bot_horarios,
        bot_ciudad:    empresa.bot_ciudad,
        bot_extra:     empresa.bot_extra,
      },
      effectiveHistory,
      messageText,
    );

    // 7. Guarda respuesta del bot
    await saveMessage(conv.id, 'assistant', aiResponse.text);

    // 8. Procesa etiquetas (HOT_LEAD, TRANSFER_HUMAN, etc.)
    await handleAiTags(conv, empresa, aiResponse.tags, clienteNombre);

    // 8b. Envía notificaciones al encargado
    if (aiResponse.tags.includes(AI_TAGS.HOT_LEAD)) {
      notifyHotLead(empresa, { clienteTel, clienteNombre: clienteNombre ?? undefined });
    }
    if (aiResponse.tags.includes(AI_TAGS.TRANSFER_HUMAN)) {
      notifyTransfer(empresa, { clienteTel, clienteNombre: clienteNombre ?? undefined, mensaje: messageText });
    }
    if (isNew) {
      notifyNewLead(empresa, { clienteTel, clienteNombre: clienteNombre ?? undefined, mensaje: messageText });
    }
    if (aiResponse.tags.includes(AI_TAGS.AGENDAR_CITA)) {
      handleAgendarCita(conv, empresa, evoCfg, clienteNombre).catch(err =>
        console.error('❌ Error en handleAgendarCita:', err),
      );
    }

    // 9. Delay humanizado antes de responder
    const { delayMs, shouldDefer } = calculateDelay(isNew);

    if (shouldDefer) {
      // Fuera de horario: programar para mañana a las 9
      console.log(`🌙 Fuera de horario, respuesta diferida para las 9:00 → ${clienteTel}`);
      await saveDeferredMessage(conv.id, clienteTel, aiResponse.text);
      return;
    }

    if (delayMs > 0) {
      console.log(`⏳ Delay ${Math.round(delayMs / 1000)}s antes de responder → ${clienteTel}`);
      await sleep(delayMs);
    }

    // 10. Envía respuesta por WhatsApp (fragmentada si es larga)
    const chunks = splitMessage(aiResponse.text);
    for (const chunk of chunks) {
      if (chunk.delayBeforeMs > 0) await sleep(chunk.delayBeforeMs);
      await sendText(remoteJid, chunk.text, evoCfg.instance, evoCfg.url, evoCfg.key);
    }

    console.log(
      `✅ Respondido | tokens: ${aiResponse.inputTokens}in/${aiResponse.outputTokens}out` +
      (aiResponse.tags.length ? ` | tags: ${aiResponse.tags.join(', ')}` : '') +
      ` | delay: ${Math.round(delayMs / 1000)}s | chunks: ${chunks.length}`,
    );
  } catch (err) {
    console.error('❌ Error procesando mensaje:', err);
  }
});

// ─── Helpers ────────────────────────────────────────────────────────────────

import { db } from '../db/client';

async function saveDeferredMessage(
  convId: string,
  clienteTel: string,
  contenido: string,
): Promise<void> {
  const tomorrow9am = new Date();
  tomorrow9am.setDate(tomorrow9am.getDate() + 1);
  tomorrow9am.setHours(9, 0, 0, 0);

  await db.query(
    `INSERT INTO mensajes_programados (conv_id, cliente_tel, contenido, enviar_en)
     VALUES ($1, $2, $3, $4)`,
    [convId, clienteTel, contenido, tomorrow9am],
  );
}

async function resetNurturing(convId: string): Promise<void> {
  await db.query(
    'UPDATE conversaciones SET nurturing_step = 0 WHERE id = $1',
    [convId],
  );
}

async function handleAgendarCita(
  conv: Conversacion,
  empresa: Empresa,
  evoCfg: { instance: string; url: string; key: string },
  clienteNombre?: string,
): Promise<void> {
  const slots = await getAvailableSlots(3);

  const encResult = await db.query<{ tel: string }>(
    `SELECT COALESCE(encargado_tel, whatsapp_num) AS tel FROM empresas WHERE id = $1`,
    [empresa.id],
  );
  const encargadoTel = encResult.rows[0]?.tel ?? null;

  if (slots.length === 0) {
    if (encargadoTel) {
      await sendText(encargadoTel,
        `📅 *CITA SOLICITADA — SIN DISPONIBILIDAD AUTOMÁTICA*\n\n` +
        `👤 ${clienteNombre ?? 'Sin nombre'}\n` +
        `📱 ${conv.cliente_tel}\n\n` +
        `_No hay huecos en los próximos 7 días. Coordina manualmente._`,
        evoCfg.instance, evoCfg.url, evoCfg.key,
      ).catch(() => {});
    }
    console.log(`📅 [CITA] Sin slots para ${conv.cliente_tel}`);
    return;
  }

  await saveCita({
    empresaId:     empresa.id,
    convId:        conv.id,
    clienteTel:    conv.cliente_tel,
    clienteNombre: clienteNombre ?? conv.cliente_nombre ?? undefined,
    servicio:      'Por confirmar',
    fechaHora:     slots[0].start,
  });

  const opcionesTexto = slots
    .map((s, i) => `${i + 1}. ${formatSlot(s)}`)
    .join('\n');

  console.log(`📅 [CITA] Slots ofrecidos a ${conv.cliente_tel}:\n${opcionesTexto}`);

  if (encargadoTel) {
    await sendText(encargadoTel,
      `📅 *SOLICITUD DE CITA*\n\n` +
      `👤 ${clienteNombre ?? 'Sin nombre'}\n` +
      `📱 ${conv.cliente_tel}\n\n` +
      `Slots ofrecidos al cliente:\n${opcionesTexto}`,
      evoCfg.instance, evoCfg.url, evoCfg.key,
    ).catch(() => {});
  }
}
