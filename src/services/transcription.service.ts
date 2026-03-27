import axios from 'axios';
import OpenAI from 'openai';
import { Readable } from 'stream';
import { env } from '../config/env';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

/**
 * Descarga el audio de Evolution API en base64 y lo transcribe con Whisper.
 * Devuelve el texto transcrito, o null si falla.
 */
export async function transcribeAudio(
  messageKey: { id: string; remoteJid: string; fromMe: boolean },
  instance: string,
  apiUrl:   string,
  apiKey:   string,
): Promise<string | null> {
  // 1. Descargar audio en base64 desde Evolution API
  const b64Response = await axios.post(
    `${apiUrl}/chat/getBase64FromMediaMessage/${instance}`,
    { key: messageKey },
    { headers: { apikey: apiKey, 'Content-Type': 'application/json' } },
  );

  const base64: string = b64Response.data?.base64;
  if (!base64) return null;

  // 2. Convertir base64 a buffer y crear un File para Whisper
  const buffer = Buffer.from(base64, 'base64');
  const file = new File([buffer], 'audio.ogg', { type: 'audio/ogg' });

  // 3. Transcribir con Whisper
  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'es',
  });

  const text = transcription.text?.trim();
  console.log(`🎙️  Audio transcrito: "${text}"`);
  return text || null;
}
