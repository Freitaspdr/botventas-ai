import 'dotenv/config';

function mustGet(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Variable de entorno requerida: ${key}`);
  return value;
}

export const env = {
  PORT:                          parseInt(process.env.PORT ?? '3000', 10),
  NODE_ENV:                      process.env.NODE_ENV ?? 'development',
  DATABASE_URL:                  mustGet('DATABASE_URL'),
  ANTHROPIC_API_KEY:             mustGet('ANTHROPIC_API_KEY'),
  EVOLUTION_API_URL:             mustGet('EVOLUTION_API_URL'),
  EVOLUTION_API_KEY:             mustGet('EVOLUTION_API_KEY'),
  EVOLUTION_INSTANCE:            process.env.EVOLUTION_INSTANCE ?? '', // opcional en multi-tenant
  WEBHOOK_SECRET:                process.env.WEBHOOK_SECRET ?? '',
  // Modo test: si está definido, solo responde a esos números (separados por coma)
  // Ej: TEST_WHITELIST=34612345678,34698765432
  TEST_WHITELIST:                process.env.TEST_WHITELIST ?? '',
  // OpenAI Whisper para transcripción de audios (opcional)
  OPENAI_API_KEY:                process.env.OPENAI_API_KEY ?? '',
  // Google Calendar (opcional — graceful degradation si no está configurado)
  GOOGLE_CALENDAR_ID:            process.env.GOOGLE_CALENDAR_ID ?? 'primary',
  GOOGLE_SERVICE_ACCOUNT_EMAIL:  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? '',
  GOOGLE_PRIVATE_KEY:            (process.env.GOOGLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
  ENABLE_BACKGROUND_JOBS:        process.env.ENABLE_BACKGROUND_JOBS !== 'false',
};
