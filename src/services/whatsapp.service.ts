import axios from 'axios';
import { env } from '../config/env';

/**
 * Envía un mensaje de texto vía Evolution API.
 * URL, key e instancia se toman del .env por defecto.
 * Si se pasan valores específicos de empresa, se usan en su lugar.
 */
export async function sendText(
  to: string,
  text: string,
  instance: string  = env.EVOLUTION_INSTANCE,
  apiUrl:   string  = env.EVOLUTION_API_URL,
  apiKey:   string  = env.EVOLUTION_API_KEY,
): Promise<void> {
  await axios.post(
    `${apiUrl}/message/sendText/${instance}`,
    { number: to, text },
    { headers: { apikey: apiKey, 'Content-Type': 'application/json' } },
  );
}

/**
 * Devuelve la config completa de Evolution API para una empresa.
 * Campos nulos en BD → fallback al .env global.
 */
export async function getEvolutionConfigForEmpresa(empresaId: string): Promise<{
  instance: string;
  url:      string;
  key:      string;
}> {
  const { db } = await import('../db/client');
  const { rows } = await db.query<{
    evolution_instance: string | null;
    evolution_api_url:  string | null;
    evolution_api_key:  string | null;
  }>(
    'SELECT evolution_instance, evolution_api_url, evolution_api_key FROM empresas WHERE id = $1',
    [empresaId],
  );
  const row = rows[0];
  return {
    instance: row?.evolution_instance ?? env.EVOLUTION_INSTANCE,
    url:      row?.evolution_api_url   ?? env.EVOLUTION_API_URL,
    key:      row?.evolution_api_key   ?? env.EVOLUTION_API_KEY,
  };
}

// ─── Helpers para parsear payloads de Evolution API ─────────────────────────

export interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;   // número@s.whatsapp.net
      fromMe:    boolean;
      id:        string;
    };
    message?: {
      conversation?:         string;
      extendedTextMessage?:  { text: string };
    };
    messageType: string;
    pushName?:   string;
  };
}

export function extractPhone(remoteJid: string): string {
  return remoteJid.split('@')[0];
}

export function extractMessageText(payload: EvolutionWebhookPayload): string | null {
  const msg = payload.data.message;
  if (!msg) return null;
  return msg.conversation ?? msg.extendedTextMessage?.text ?? null;
}
