import { Router, Request, Response } from 'express';
import {
  EvolutionWebhookPayload,
  extractPhone,
  extractMessageText,
  isAudioMessage,
  sendText,
  getEvolutionConfigForEmpresa,
  connectEvolutionInstance,
  getEvolutionInstanceStatus,
} from '../services/whatsapp.service';
import { transcribeAudio } from '../services/transcription.service';
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

// ─── Debounce de mensajes ──────────────────────────────────────────────────────
// Agrupa mensajes del mismo cliente enviados en ráfaga (ej: "¿cuánto cuesta?" + "jajaja")
// Espera DEBOUNCE_MS tras el último mensaje antes de llamar a Claude.

const DEBOUNCE_MS = 4500; // ms de espera tras el último mensaje del cliente

interface BurstEntry {
  timer:        NodeJS.Timeout;
  parts:        string[];   // textos individuales recibidos en la ráfaga
  convId:       string;
  isNew:        boolean;    // ¿era conversación nueva cuando llegó el primer mensaje?
  remoteJid:    string;
  clienteTel:   string;
  clienteNombre?: string;
  empresa:      Empresa;
  evoCfg:       { instance: string; url: string; key: string };
}

const pendingBursts = new Map<string, BurstEntry>();

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

  const remoteJid     = payload.data.key.remoteJid;
  const clienteTel    = extractPhone(remoteJid);
  const clienteNombre = payload.data.pushName;

  let messageText = extractMessageText(payload);

  // Si es un audio y Whisper está configurado, transcribir
  if (!messageText && isAudioMessage(payload) && env.OPENAI_API_KEY) {
    try {
      // Necesitamos evoCfg para descargar el audio — lookup rápido por instancia
      const empresa = await getEmpresaByInstance(payload.instance)
        ?? await getEmpresaByWhatsapp(env.EVOLUTION_INSTANCE);
      if (empresa) {
        const evoCfg = await getEvolutionConfigForEmpresa(empresa.id);
        console.log(`🎙️  Audio recibido de ${clienteTel}, transcribiendo...`);
        messageText = await transcribeAudio(
          payload.data.key,
          payload.data.message as Record<string, unknown> | undefined,
          evoCfg.instance, evoCfg.url, evoCfg.key,
        );
      }
    } catch (err) {
      console.error('❌ Error transcribiendo audio:', err);
    }
  }

  if (!messageText?.trim()) return;

  // Modo test: ignorar cualquier número que no esté en la whitelist
  if (env.TEST_WHITELIST) {
    const allowed = env.TEST_WHITELIST.split(',').map(n => n.trim());
    if (!allowed.includes(clienteTel)) {
      console.log(`🔒 [TEST MODE] Ignorado: ${clienteTel}`);
      return;
    }
  }

  console.log(`📩 [${payload.instance}] ${clienteTel}: ${messageText}`);

  try {
    // 1. Busca la empresa
    const empresa = await getEmpresaByInstance(payload.instance)
      ?? await getEmpresaByWhatsapp(env.EVOLUTION_INSTANCE);

    if (!empresa) {
      console.warn(`⚠️  Empresa no encontrada para instancia: ${payload.instance}`);
      return;
    }

    // 2. Config Evolution API
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

    // 4. Obtiene o crea la conversación
    const { conv, isNew } = await getOrCreateConversacion(empresa.id, clienteTel, clienteNombre);

    if (conv.estado === 'transferida') {
      console.log(`👤 Conversación ${conv.id} ya transferida a humano, ignorando.`);
      return;
    }

    // 5. Guarda el mensaje en BD inmediatamente (para no perderlo)
    await saveMessage(conv.id, 'user', messageText);

    if (!isNew) await resetNurturing(conv.id);

    // 6. Debounce: acumular mensajes del mismo cliente y esperar DEBOUNCE_MS
    const burstKey = `${empresa.id}:${clienteTel}`;
    const existing = pendingBursts.get(burstKey);

    if (existing) {
      // Ya hay un timer activo → cancelarlo, añadir el nuevo texto, reiniciar timer
      clearTimeout(existing.timer);
      existing.parts.push(messageText);
      console.log(`⏸️  Burst acumulado [${clienteTel}]: ${existing.parts.length} mensajes`);
    }

    const entry: BurstEntry = existing ?? {
      parts:        [messageText],
      convId:       conv.id,
      isNew,
      remoteJid,
      clienteTel,
      clienteNombre: clienteNombre ?? undefined,
      empresa,
      evoCfg,
      timer: null as unknown as NodeJS.Timeout, // se asigna justo abajo
    };

    entry.timer = setTimeout(
      () => processBurst(burstKey, entry),
      DEBOUNCE_MS,
    );

    if (!existing) pendingBursts.set(burstKey, entry);

  } catch (err) {
    console.error('❌ Error procesando mensaje:', err);
  }
});

// ─── Procesa el burst cuando el timer dispara ─────────────────────────────────
async function processBurst(burstKey: string, entry: BurstEntry): Promise<void> {
  pendingBursts.delete(burstKey);

  const { parts, convId, isNew, remoteJid, clienteTel, clienteNombre, empresa, evoCfg } = entry;

  // Combina todos los mensajes del burst en uno solo para Claude
  const combinedText = parts.join('\n');

  if (parts.length > 1) {
    console.log(`🔀 Burst procesado [${clienteTel}]: ${parts.length} mensajes → "${combinedText}"`);
  }

  try {
    // Historial excluyendo los mensajes del burst (ya guardados en BD)
    const history = await getHistory(convId);
    const effectiveHistory = isNew
      ? []
      : history.slice(0, -parts.length);

    // Llama a Claude con el texto combinado
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
      combinedText,
    );

    // Guarda respuesta del bot
    await saveMessage(convId, 'assistant', aiResponse.text);

    // Procesa etiquetas
    const conv = { id: convId, empresa_id: empresa.id, cliente_tel: clienteTel, cliente_nombre: clienteNombre ?? null, estado: 'activa', es_hot_lead: false };
    await handleAiTags(conv, empresa, aiResponse.tags, clienteNombre);

    // Notificaciones al encargado
    if (aiResponse.tags.includes(AI_TAGS.HOT_LEAD)) {
      notifyHotLead(empresa, { clienteTel, clienteNombre });
    }
    if (aiResponse.tags.includes(AI_TAGS.TRANSFER_HUMAN)) {
      notifyTransfer(empresa, { clienteTel, clienteNombre, mensaje: combinedText });
    }
    if (isNew) {
      notifyNewLead(empresa, { clienteTel, clienteNombre, mensaje: combinedText });
    }
    if (aiResponse.tags.includes(AI_TAGS.AGENDAR_CITA)) {
      handleAgendarCita(conv, empresa, evoCfg, clienteNombre).catch(err =>
        console.error('❌ Error en handleAgendarCita:', err),
      );
    }

    // Delay humanizado
    const { delayMs, shouldDefer } = calculateDelay(isNew);

    if (shouldDefer) {
      console.log(`🌙 Fuera de horario, respuesta diferida para las 9:00 → ${clienteTel}`);
      await saveDeferredMessage(convId, clienteTel, remoteJid, aiResponse.text);
      return;
    }

    if (delayMs > 0) {
      console.log(`⏳ Delay ${Math.round(delayMs / 1000)}s antes de responder → ${clienteTel}`);
      await sleep(delayMs);
    }

    // Envía respuesta fragmentada
    const chunks = splitMessage(aiResponse.text);
    for (const chunk of chunks) {
      if (chunk.delayBeforeMs > 0) await sleep(chunk.delayBeforeMs);
      await sendText(remoteJid, chunk.text, evoCfg.instance, evoCfg.url, evoCfg.key);
    }

    console.log(
      `✅ Respondido | tokens: ${aiResponse.inputTokens}in/${aiResponse.outputTokens}out` +
      (aiResponse.tags.length ? ` | tags: ${aiResponse.tags.join(', ')}` : '') +
      ` | delay: ${Math.round(delayMs / 1000)}s | chunks: ${chunks.length}` +
      (parts.length > 1 ? ` | burst: ${parts.length} msgs` : ''),
    );
  } catch (err) {
    console.error('❌ Error en processBurst:', err);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

import { db } from '../db/client';

async function saveDeferredMessage(
  convId: string,
  clienteTel: string,
  remoteJid: string,
  contenido: string,
): Promise<void> {
  const tomorrow9am = new Date();
  tomorrow9am.setDate(tomorrow9am.getDate() + 1);
  tomorrow9am.setHours(9, 0, 0, 0);

  await db.query(
    `INSERT INTO mensajes_programados (conv_id, cliente_tel, remote_jid, contenido, enviar_en)
     VALUES ($1, $2, $3, $4, $5)`,
    [convId, clienteTel, remoteJid, contenido, tomorrow9am],
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
