import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { testConnection, withAdvisoryLock } from './db/client';
import { webhookRouter } from './routes/webhook';
import { crmRouter } from './routes/crm';
import { runNurturingCycle } from './services/nurturing.service';
import { sendDeferredMessages } from './services/scheduler.service';
import { sendDailySummary, getAllEmpresasActivasIds } from './services/notification.service';

function createNonOverlappingRunner(name: string, task: () => Promise<void>) {
  let running = false;

  return async () => {
    if (running) {
      console.log(`⏭️ Job omitido por solape: ${name}`);
      return;
    }

    running = true;
    try {
      const lock = await withAdvisoryLock(`jobs:${name}`, async () => {
        await task();
      });

      if (!lock.acquired) {
        console.log(`🔒 Job activo en otra instancia: ${name}`);
      }
    } finally {
      running = false;
    }
  };
}

async function sendDailySummaries(): Promise<void> {
  const empresaIds = await getAllEmpresasActivasIds();
  for (const id of empresaIds) {
    await sendDailySummary(id).catch(err =>
      console.error(`❌ Error enviando resumen diario a empresa ${id}:`, err),
    );
  }
  console.log(`📊 Resumen diario enviado a ${empresaIds.length} empresa(s)`);
}

async function main() {
  await testConnection();

  const app = express();

  app.use(cors({
    origin: ['http://localhost:8080', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'apikey', 'x-webhook-secret', 'x-botventas-secret', 'x-crm-token', 'x-empresa-id'],
  }));

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/', (_req, res) => {
    res.json({
      ok: true,
      service: 'botventas-ai',
      health: '/crm/health',
      webhook: '/webhook',
    });
  });

  app.use('/', webhookRouter);
  app.use('/crm', crmRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  app.listen(env.PORT, () => {
    console.log(`🚀 BotVentas AI corriendo en http://localhost:${env.PORT}`);
    console.log(`   Entorno: ${env.NODE_ENV}`);
    console.log(`   Instancia WhatsApp: ${env.EVOLUTION_INSTANCE}`);
  });

  if (!env.ENABLE_BACKGROUND_JOBS) {
    console.log('⏸️ Background jobs desactivados por ENABLE_BACKGROUND_JOBS=false');
    return;
  }

  const runNurturingJob = createNonOverlappingRunner('nurturing', runNurturingCycle);
  const runDeferredJob = createNonOverlappingRunner('deferred-messages', sendDeferredMessages);
  const runDailySummaryJob = createNonOverlappingRunner('daily-summary', sendDailySummaries);

  setInterval(async () => {
    try {
      await runNurturingJob();
    } catch (err) {
      console.error('❌ Error en ciclo de nurturing:', err);
    }
  }, 15 * 60 * 1000);

  setInterval(async () => {
    try {
      await runDeferredJob();
    } catch (err) {
      console.error('❌ Error enviando mensajes diferidos:', err);
    }
  }, 5 * 60 * 1000);

  scheduleDailySummary(runDailySummaryJob);
  console.log('⏰ Tareas programadas activas: nurturing (15min) + diferidos (5min) + resumen diario (20:00)');
}

function msHastaLas20(): number {
  const now = new Date();
  const target = new Date();
  target.setHours(20, 0, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}

function scheduleDailySummary(runDailySummaryJob: () => Promise<void>): void {
  const delay = msHastaLas20();
  console.log(`📊 Resumen diario programado en ${Math.round(delay / 3600000 * 10) / 10}h`);

  setTimeout(async () => {
    try {
      await runDailySummaryJob();
    } catch (err) {
      console.error('❌ Error en resumen diario:', err);
    }
    scheduleDailySummary(runDailySummaryJob);
  }, delay);
}

main().catch((err) => {
  console.error('Error fatal al iniciar:', err);
  process.exit(1);
});
