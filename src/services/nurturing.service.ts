// ============================================
// BOTVENTAS AI - Servicio de Nurturing
// Seguimiento automático de leads que no responden
// ============================================

import { db } from '../db/client';
import { chat } from './anthropic.service';
import { sendText, getEvolutionConfigForEmpresa } from './whatsapp.service';
import { saveMessage, getHistory, Empresa } from './conversation.service';

interface PendingFollowUp {
  conv_id: string;
  empresa_id: string;
  cliente_tel: string;
  cliente_nombre: string | null;
  nurturing_step: number;
  minutes_since_last: number;
  // Empresa fields
  emp_nombre: string;
  bot_nombre: string;
  bot_tono: 'amigable' | 'profesional' | 'formal';
  bot_objetivo: string;
  bot_productos: string;
  bot_horarios: string;
  bot_ciudad: string;
  bot_extra: string | null;
}

// Tiempos de espera entre pasos de nurturing (en minutos)
const NURTURING_DELAYS: Record<number, number> = {
  0: 30,    // Paso 0→1: 30 minutos sin respuesta
  1: 1440,  // Paso 1→2: 24 horas
  2: 4320,  // Paso 2→3: 72 horas (3 días)
  3: 10080, // Paso 3→4: 7 días
};

// Ángulos de seguimiento para que cada mensaje sea diferente
const NURTURING_ANGLES: Record<number, string> = {
  1: 'Haz una pregunta técnica específica sobre su coche o servicio para retomar la conversación. Algo como preguntar un detalle que te faltó.',
  2: 'Menciona un caso real reciente (invéntalo de forma creíble) de un trabajo similar al que le interesaba. Ofrece enviar fotos del resultado.',
  3: 'Crea un poco de urgencia mencionando que tienes la agenda bastante llena esta semana/próxima semana, pero puedes guardarle un hueco si le interesa.',
  4: 'Cierre suave y respetuoso. Dile que le dejas tranquilo, que cuando se decida ahí estarás. Despedida amable.',
};

const MAX_STEPS = 4;

/**
 * Ejecutar ciclo de nurturing.
 * Llamar desde un cron job o setInterval cada 15 minutos.
 */
export async function runNurturingCycle(): Promise<void> {
  const now = new Date();
  const hour = now.getHours();

  // No enviar nurturing fuera de horario comercial
  if (hour < 9 || hour >= 21) {
    return;
  }

  // Buscar conversaciones que necesitan seguimiento
  const pending = await db.query<PendingFollowUp>(`
    SELECT 
      c.id AS conv_id,
      c.empresa_id,
      c.cliente_tel,
      c.cliente_nombre,
      COALESCE(c.nurturing_step, 0) AS nurturing_step,
      EXTRACT(EPOCH FROM (NOW() - c.actualizada_en)) / 60 AS minutes_since_last,
      e.nombre AS emp_nombre,
      e.bot_nombre,
      e.bot_tono,
      e.bot_objetivo,
      e.bot_productos,
      e.bot_horarios,
      e.bot_ciudad,
      e.bot_extra
    FROM conversaciones c
    JOIN empresas e ON c.empresa_id = e.id
    WHERE c.estado = 'activa'
      AND e.activo = true
      AND COALESCE(c.nurturing_step, 0) < $1
      AND c.id IN (
        -- Solo conversaciones donde el último mensaje es del bot (el lead no respondió)
        SELECT m1.conv_id FROM mensajes m1
        WHERE m1.enviado_en = (
          SELECT MAX(m2.enviado_en) FROM mensajes m2 WHERE m2.conv_id = m1.conv_id
        )
        AND m1.rol = 'assistant'
      )
    ORDER BY c.actualizada_en ASC
    LIMIT 20
  `, [MAX_STEPS]);

  for (const item of pending.rows) {
    const requiredDelay = NURTURING_DELAYS[item.nurturing_step] ?? Infinity;

    if (item.minutes_since_last < requiredDelay) {
      continue; // Todavía no toca enviar
    }

    const nextStep = item.nurturing_step + 1;
    const angle = NURTURING_ANGLES[nextStep];

    if (!angle) continue;

    try {
      await sendFollowUp(item, nextStep, angle);
    } catch (err) {
      console.error(`❌ Error nurturing conv ${item.conv_id}:`, err);
    }
  }
}

async function sendFollowUp(
  item: PendingFollowUp,
  step: number,
  angle: string,
): Promise<void> {
  // Obtener historial para contexto
  const history = await getHistory(item.conv_id, 6);

  // Generar mensaje con Claude usando el ángulo específico
  const nurturingPrompt =
    `CONTEXTO: Estás haciendo seguimiento a un cliente que no respondió tu último mensaje. ` +
    `Este es el intento de seguimiento número ${step} de máximo ${MAX_STEPS}. ` +
    `ÁNGULO A USAR: ${angle} ` +
    `IMPORTANTE: Escribe UN solo mensaje corto (1-3 líneas). No saludes con "Hola" si ya lo hiciste antes. ` +
    `Sé natural, como si te acabases de acordar del cliente.`;

  const aiResponse = await chat(
    {
      bot_nombre: item.bot_nombre,
      nombre: item.emp_nombre,
      bot_tono: item.bot_tono,
      bot_objetivo: item.bot_objetivo,
      bot_productos: item.bot_productos,
      bot_horarios: item.bot_horarios,
      bot_ciudad: item.bot_ciudad,
      bot_extra: item.bot_extra,
    },
    history,
    nurturingPrompt,
  );

  // Guardar y enviar
  await saveMessage(item.conv_id, 'assistant', aiResponse.text);
  const evoCfg = await getEvolutionConfigForEmpresa(item.empresa_id);
  await sendText(item.cliente_tel, aiResponse.text, evoCfg.instance, evoCfg.url, evoCfg.key);

  // Actualizar paso de nurturing
  await db.query(
    'UPDATE conversaciones SET nurturing_step = $1, actualizada_en = NOW() WHERE id = $2',
    [step, item.conv_id],
  );

  // Si es el último paso, marcar como fría
  if (step >= MAX_STEPS) {
    await db.query(
      `UPDATE conversaciones SET estado = 'cerrada' WHERE id = $1`,
      [item.conv_id],
    );
  }

  console.log(`📤 [NURTURING] Step ${step}/${MAX_STEPS} → ${item.cliente_tel} (${item.emp_nombre})`);
}
