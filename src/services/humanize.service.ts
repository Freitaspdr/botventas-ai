// ============================================
// BOTVENTAS AI - Sistema de Delays Humanizados
// Simula tiempos de respuesta humanos reales
// ============================================

/**
 * Calcula un delay aleatorio basado en la hora del día
 * para simular comportamiento humano real.
 * 
 * - Mañana (9-13): respuesta rápida (20-90s)
 * - Comida (14-16): respuesta lenta (120-360s)  
 * - Tarde (16-20): respuesta media (45-180s)
 * - Noche (20-22): respuesta lenta (90-300s)
 * - Madrugada (22-9): NO responder, programar para las 9:00
 */
export function calculateDelay(isFirstMessage: boolean): {
  delayMs: number;
  shouldDefer: boolean;
  deferUntilHour?: number;
} {
  const now = new Date();
  const hour = now.getHours();

  // Madrugada: no responder ahora
  if (hour >= 22 || hour < 9) {
    return { delayMs: 0, shouldDefer: true, deferUntilHour: 9 };
  }

  let minSeconds: number;
  let maxSeconds: number;

  if (hour >= 9 && hour < 14) {
    // Mañana: respuesta rápida
    minSeconds = 20;
    maxSeconds = 90;
  } else if (hour >= 14 && hour < 16) {
    // Comida: respuesta lenta
    minSeconds = 120;
    maxSeconds = 360;
  } else if (hour >= 16 && hour < 20) {
    // Tarde: respuesta media
    minSeconds = 45;
    maxSeconds = 180;
  } else {
    // Noche temprana (20-22): respuesta lenta
    minSeconds = 90;
    maxSeconds = 300;
  }

  // Primer mensaje del lead: siempre más rápido (máx 45s)
  if (isFirstMessage) {
    minSeconds = Math.min(minSeconds, 10);
    maxSeconds = Math.min(maxSeconds, 45);
  }

  const delayMs = (Math.floor(Math.random() * (maxSeconds - minSeconds)) + minSeconds) * 1000;

  return { delayMs, shouldDefer: false };
}

/**
 * Divide un mensaje largo en fragmentos para enviar
 * como mensajes separados (simula escritura real).
 * Retorna array de { text, delayBefore } 
 */
export function splitMessage(text: string): { text: string; delayBeforeMs: number }[] {
  // Si el mensaje es corto, enviarlo de una vez
  if (text.length < 120) {
    return [{ text, delayBeforeMs: 0 }];
  }

  // Dividir por saltos de línea naturales
  const lines = text.split('\n').filter(l => l.trim());

  if (lines.length <= 2) {
    return [{ text, delayBeforeMs: 0 }];
  }

  // Agrupar en chunks de 1-2 líneas
  const chunks: string[] = [];
  for (let i = 0; i < lines.length; i += 2) {
    chunks.push(lines.slice(i, i + 2).join('\n'));
  }

  return chunks.map((chunk, i) => ({
    text: chunk,
    // 1.5-4 segundos entre mensajes (simula "escribiendo...")
    delayBeforeMs: i === 0 ? 0 : Math.floor(Math.random() * 2500) + 1500,
  }));
}

/**
 * Sleep helper
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
