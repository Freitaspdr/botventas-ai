import express from 'express';
import { env } from './config/env';
import { testConnection } from './db/client';
import { webhookRouter } from './routes/webhook';
import { runNurturingCycle } from './services/nurturing.service';
import { sendDeferredMessages } from './services/scheduler.service';
import { sendDailySummary, getAllEmpresasActivasIds } from './services/notification.service';

async function main() {
  // Verifica conexión a la base de datos antes de arrancar
  await testConnection();

  const app = express();

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Rutas
  app.use('/', webhookRouter);

  // 404
  app.use((_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  app.listen(env.PORT, () => {
    console.log(`🚀 BotVentas AI corriendo en http://localhost:${env.PORT}`);
    console.log(`   Entorno: ${env.NODE_ENV}`);
    console.log(`   Instancia WhatsApp: ${env.EVOLUTION_INSTANCE}`);
  });

  // ─── Tareas programadas ──────────────────────────────────────────────────

  // Nurturing: cada 15 minutos
  setInterval(async () => {
    try {
      await runNurturingCycle();
    } catch (err) {
      console.error('❌ Error en ciclo de nurturing:', err);
    }
  }, 15 * 60 * 1000);

  // Mensajes diferidos: cada 5 minutos
  setInterval(async () => {
    try {
      await sendDeferredMessages();
    } catch (err) {
      console.error('❌ Error enviando mensajes diferidos:', err);
    }
  }, 5 * 60 * 1000);

  // Resumen diario: a las 20:00 cada día
  scheduleDailySummary();
  console.log('⏰ Tareas programadas activas: nurturing (15min) + diferidos (5min) + resumen diario (20:00)');
}

function msHastaLas20(): number {
  const now = new Date();
  const target = new Date();
  target.setHours(20, 0, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}

function scheduleDailySummary(): void {
  const delay = msHastaLas20();
  console.log(`📊 Resumen diario programado en ${Math.round(delay / 3600000 * 10) / 10}h`);

  setTimeout(async () => {
    try {
      const empresaIds = await getAllEmpresasActivasIds();
      for (const id of empresaIds) {
        await sendDailySummary(id).catch(err =>
          console.error(`❌ Error enviando resumen diario a empresa ${id}:`, err),
        );
      }
      console.log(`📊 Resumen diario enviado a ${empresaIds.length} empresa(s)`);
    } catch (err) {
      console.error('❌ Error en resumen diario:', err);
    }
    scheduleDailySummary();
  }, delay);
}

main().catch((err) => {
  console.error('Error fatal al iniciar:', err);
  process.exit(1);
});
