# Google Calendar Integration — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El bot puede detectar intención de cita, consultar disponibilidad en Google Calendar y crear el evento, enviando confirmación al cliente con fecha/hora/dirección.

**Architecture:** Un nuevo servicio `calendar.service.ts` encapsula toda la lógica de Google Calendar API (service account). Se añade una nueva etiqueta de IA `[AGENDAR_CITA]` que el webhook procesa: llama al servicio de calendario, crea la cita en BD (tabla `citas` ya existe en schema) y en Google Calendar, y envía confirmación al cliente.

**Tech Stack:** `googleapis` npm package (Google Calendar v3), Service Account credentials (JSON key), PostgreSQL tabla `citas` (ya en schema.sql como pendiente de integración)

---

## Chunk 1: Setup e infraestructura

### Task 1: Instalar dependencia y configurar variables de entorno

**Files:**
- Modify: `package.json`
- Modify: `src/config/env.ts`

- [ ] **Step 1: Instalar googleapis**

```bash
npm install googleapis
npm install --save-dev @types/googleapis
```

Nota: `@types/googleapis` puede no existir — el paquete `googleapis` ya incluye tipos TS, así que si falla el dev install, ignorarlo.

- [ ] **Step 2: Añadir variables de entorno al `.env` (documentar)**

Añadir al `.env` del proyecto:

```env
# Google Calendar (service account)
GOOGLE_CALENDAR_ID=primary                    # o el calendar ID específico
GOOGLE_SERVICE_ACCOUNT_EMAIL=bot@proyecto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Para obtener estas credenciales:
1. Google Cloud Console → IAM → Service Accounts → Crear cuenta
2. Descargar clave JSON
3. En Google Calendar → Compartir calendario con el email de la service account (con permisos "Hacer cambios en eventos")
4. Copiar `client_email` como `GOOGLE_SERVICE_ACCOUNT_EMAIL`
5. Copiar `private_key` como `GOOGLE_PRIVATE_KEY`

- [ ] **Step 3: Añadir env vars al objeto `env` en `src/config/env.ts`**

```typescript
export const env = {
  // ... existentes ...
  GOOGLE_CALENDAR_ID:            process.env.GOOGLE_CALENDAR_ID ?? 'primary',
  GOOGLE_SERVICE_ACCOUNT_EMAIL:  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? '',
  GOOGLE_PRIVATE_KEY:            (process.env.GOOGLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
};
```

Nota: `GOOGLE_PRIVATE_KEY` no es `require()` para que el servidor arranque sin Calendar configurado.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/config/env.ts
git commit -m "chore: add googleapis dependency and Google Calendar env vars"
```

---

## Chunk 2: calendar.service.ts

### Task 2: Crear el servicio de Google Calendar

**Files:**
- Create: `src/services/calendar.service.ts`

- [ ] **Step 1: Crear el servicio con checkAvailability y createAppointment**

```typescript
// ============================================
// BOTVENTAS AI - Servicio Google Calendar
// ============================================
import { google } from 'googleapis';
import { env } from '../config/env';

function getCalendarClient() {
  const auth = new google.auth.JWT({
    email:  env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key:    env.GOOGLE_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  return google.calendar({ version: 'v3', auth });
}

export interface TimeSlot {
  start: Date;
  end:   Date;
}

/**
 * Devuelve los próximos N slots libres de 1 hora dentro del horario laboral (9-19h L-S)
 * buscando en los próximos 7 días
 */
export async function getAvailableSlots(n = 3): Promise<TimeSlot[]> {
  if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL) return [];

  const calendar = getCalendarClient();
  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

  // Obtiene eventos existentes
  const { data } = await calendar.events.list({
    calendarId:   env.GOOGLE_CALENDAR_ID,
    timeMin:      now.toISOString(),
    timeMax:      weekLater.toISOString(),
    singleEvents: true,
    orderBy:      'startTime',
  });

  const busyTimes = (data.items ?? [])
    .filter(e => e.start?.dateTime && e.end?.dateTime)
    .map(e => ({
      start: new Date(e.start!.dateTime!),
      end:   new Date(e.end!.dateTime!),
    }));

  // Genera slots candidatos (cada hora, 9-18h, L-S)
  const slots: TimeSlot[] = [];
  const cursor = new Date(now);
  cursor.setMinutes(0, 0, 0);
  cursor.setHours(cursor.getHours() + 1); // empieza en la siguiente hora completa

  while (slots.length < n && cursor < weekLater) {
    const day = cursor.getDay(); // 0=Dom, 6=Sáb
    const hour = cursor.getHours();

    if (day !== 0 && hour >= 9 && hour < 18) {
      const slotEnd = new Date(cursor.getTime() + 3600 * 1000);
      const isFree = !busyTimes.some(b => cursor < b.end && slotEnd > b.start);
      if (isFree) {
        slots.push({ start: new Date(cursor), end: slotEnd });
      }
    }

    cursor.setHours(cursor.getHours() + 1);
  }

  return slots;
}

export interface AppointmentData {
  clienteNombre:  string;
  clienteTel:     string;
  servicio:       string;
  vehiculo?:      string;
  slot:           TimeSlot;
  direccion?:     string;
}

/**
 * Crea un evento en Google Calendar y devuelve el link
 */
export async function createCalendarEvent(data: AppointmentData): Promise<string | null> {
  if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL) return null;

  const calendar = getCalendarClient();

  const description =
    `Cliente: ${data.clienteNombre} (${data.clienteTel})\n` +
    `Servicio: ${data.servicio}\n` +
    (data.vehiculo ? `Vehículo: ${data.vehiculo}\n` : '');

  const { data: event } = await calendar.events.insert({
    calendarId: env.GOOGLE_CALENDAR_ID,
    requestBody: {
      summary:     `Cita: ${data.clienteNombre} — ${data.servicio}`,
      description,
      location:    data.direccion,
      start: { dateTime: data.slot.start.toISOString() },
      end:   { dateTime: data.slot.end.toISOString()   },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 },
          { method: 'popup', minutes: 15 },
        ],
      },
    },
  });

  return event.htmlLink ?? null;
}

/**
 * Formatea un slot para mostrar al cliente (ej: "martes 25 de marzo a las 11:00")
 */
export function formatSlot(slot: TimeSlot): string {
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const d = slot.start;
  const hora = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]} a las ${hora}`;
}
```

- [ ] **Step 2: Verificar compilación**

```bash
npm run build
```

Esperado: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/services/calendar.service.ts
git commit -m "feat: calendar.service con getAvailableSlots, createCalendarEvent y formatSlot"
```

---

## Chunk 3: Nueva tabla citas + servicio de BD

La tabla `citas` está definida en el schema (pendiente) pero tiene estructura básica. Necesitamos verificar su existencia y añadir la función de guardado.

### Task 3: Migración y CRUD de citas

**Files:**
- Create: `src/db/migration-002-citas.sql`
- Modify: `src/services/conversation.service.ts`

- [ ] **Step 1: Crear migración para tabla citas**

```sql
-- migration-002-citas.sql
-- Tabla de citas agendadas via bot
CREATE TABLE IF NOT EXISTS citas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID REFERENCES empresas(id) ON DELETE CASCADE,
  conv_id         UUID REFERENCES conversaciones(id),
  cliente_tel     VARCHAR(20) NOT NULL,
  cliente_nombre  VARCHAR(100),
  servicio        TEXT,
  vehiculo        TEXT,
  fecha_hora      TIMESTAMP NOT NULL,
  google_event_id TEXT,
  google_event_url TEXT,
  estado          VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'cancelada', 'completada')),
  notas           TEXT,
  creado_en       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_citas_empresa ON citas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_citas_fecha   ON citas(fecha_hora);
```

- [ ] **Step 2: Ejecutar migración**

```bash
psql $DATABASE_URL -f src/db/migration-002-citas.sql
```

- [ ] **Step 3: Añadir función saveCita a conversation.service.ts**

Al final de `src/services/conversation.service.ts`, añadir:

```typescript
// ─── Citas ────────────────────────────────────────────────────────────────────

export async function saveCita(params: {
  empresaId:      string;
  convId:         string;
  clienteTel:     string;
  clienteNombre?: string;
  servicio:       string;
  vehiculo?:      string;
  fechaHora:      Date;
  googleEventId?: string;
  googleEventUrl?: string;
}): Promise<void> {
  await db.query(
    `INSERT INTO citas
       (empresa_id, conv_id, cliente_tel, cliente_nombre, servicio, vehiculo, fecha_hora, google_event_id, google_event_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      params.empresaId, params.convId, params.clienteTel,
      params.clienteNombre ?? null, params.servicio,
      params.vehiculo ?? null, params.fechaHora,
      params.googleEventId ?? null, params.googleEventUrl ?? null,
    ],
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/db/migration-002-citas.sql src/services/conversation.service.ts
git commit -m "feat: tabla citas y saveCita en conversation.service"
```

---

## Chunk 4: Nuevo tag [AGENDAR_CITA] y flujo en webhook

### Task 4: Añadir tag AGENDAR_CITA al system prompt

**Files:**
- Modify: `src/prompts/system-prompt.ts`

- [ ] **Step 1: Añadir el tag AGENDAR_CITA al objeto AI_TAGS**

```typescript
export const AI_TAGS = {
  HOT_LEAD:       '[HOT_LEAD]',
  WARM_LEAD:      '[WARM_LEAD]',
  TRANSFER_HUMAN: '[TRANSFER_HUMAN]',
  AGENDAR_CITA:   '[AGENDAR_CITA]',    // ← nuevo
} as const;
```

- [ ] **Step 2: Añadir instrucción para el tag en buildSystemPrompt**

Al final de la sección `## INSTRUCCIONES DE COMPORTAMIENTO`, antes de `${config.bot_extra...}`, añadir:

```typescript
8. AGENDAMIENTO DE CITAS:
   - Cuando el cliente quiera agendar, programar o fijar una cita, fecha o visita, incluye al final de tu respuesta: [AGENDAR_CITA]
   - Solo usa este tag cuando el cliente haya expresado claramente que QUIERE venir, no cuando solo "lo piense".
   - Antes de poner el tag, asegúrate de tener: nombre del cliente, teléfono (ya lo tienes), qué servicio necesita y el vehículo si aplica.
   - No inventes fechas ni horarios. El sistema ofrecerá disponibilidad automáticamente.
```

- [ ] **Step 3: Compilar para verificar**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/prompts/system-prompt.ts
git commit -m "feat: añadir tag [AGENDAR_CITA] al system prompt"
```

---

### Task 5: Procesar [AGENDAR_CITA] en el webhook

**Files:**
- Modify: `src/routes/webhook.ts`

Este es el cambio más complejo. Cuando Claude detecta intención de cita:
1. Obtener 3 slots disponibles del calendario
2. Enviar al cliente los slots como opciones de respuesta
3. Esperar a que el cliente elija (en el siguiente mensaje)
4. Crear el evento en Google Calendar
5. Guardar en tabla `citas`
6. Confirmar al cliente

**Enfoque simplificado para V1:** Al detectar `[AGENDAR_CITA]`, el webhook busca slots y envía los próximos 3 al cliente. La elección del slot se maneja enviando un mensaje de seguimiento. La confirmación del slot elegido requiere que Claude reconozca la elección en el siguiente turno (el cliente responderá "el martes a las 11", etc.) — en ese punto, el webhook puede confirmar y crear el evento.

Para V1, implementamos solo el paso de "ofrecer slots". La confirmación final la gestiona Claude en el siguiente turno con otro `[AGENDAR_CITA]` cuando el cliente elige.

- [ ] **Step 1: Importar servicios de calendario en webhook.ts**

Añadir imports al inicio de `src/routes/webhook.ts`:

```typescript
import { getAvailableSlots, createCalendarEvent, formatSlot } from '../services/calendar.service';
import { saveCita } from '../services/conversation.service';
```

- [ ] **Step 2: Añadir handler para AGENDAR_CITA después del procesamiento de tags existente**

Después del bloque `if (aiResponse.tags.includes(AI_TAGS.TRANSFER_HUMAN)) { notifyTransfer... }`, añadir:

```typescript
    if (aiResponse.tags.includes(AI_TAGS.AGENDAR_CITA)) {
      await handleAgendarCita(conv, empresa, clienteNombre);
    }
```

- [ ] **Step 3: Añadir la función handleAgendarCita al final del archivo (zona de helpers)**

```typescript
async function handleAgendarCita(
  conv: Conversacion,
  empresa: Empresa,
  clienteNombre?: string,
): Promise<void> {
  try {
    const slots = await getAvailableSlots(3);

    if (slots.length === 0) {
      // Sin disponibilidad, notificamos al encargado
      const encargadoResult = await db.query<{ tel: string }>(
        `SELECT COALESCE(encargado_tel, whatsapp_num) AS tel FROM empresas WHERE id = $1`,
        [empresa.id],
      );
      const encargadoTel = encargadoResult.rows[0]?.tel;
      if (encargadoTel) {
        await sendText(encargadoTel,
          `📅 *CITA SOLICITADA — SIN DISPONIBILIDAD AUTOMÁTICA*\n\n` +
          `👤 ${clienteNombre ?? 'Sin nombre'}\n` +
          `📱 ${conv.cliente_tel}\n\n` +
          `_El bot no encontró huecos en los próximos 7 días. Coordina manualmente._`
        ).catch(() => {});
      }
      return;
    }

    // Guarda el primer slot como cita provisional en BD
    await saveCita({
      empresaId:    empresa.id,
      convId:       conv.id,
      clienteTel:   conv.cliente_tel,
      clienteNombre: clienteNombre ?? conv.cliente_nombre ?? undefined,
      servicio:     'Por confirmar',
      fechaHora:    slots[0].start,
    });

    // Muestra opciones al cliente (serán enviadas por el flujo normal del webhook)
    // El bot ya respondió — aquí solo logueamos para debug
    const opcionesTexto = slots.map((s, i) =>
      `${i + 1}. ${formatSlot(s)}`
    ).join('\n');
    console.log(`📅 [CITA] Slots ofrecidos a ${conv.cliente_tel}:\n${opcionesTexto}`);

    // Notificar encargado que hay solicitud de cita
    const encargadoResult = await db.query<{ tel: string }>(
      `SELECT COALESCE(encargado_tel, whatsapp_num) AS tel FROM empresas WHERE id = $1`,
      [empresa.id],
    );
    const encargadoTel = encargadoResult.rows[0]?.tel;
    if (encargadoTel) {
      await sendText(encargadoTel,
        `📅 *SOLICITUD DE CITA*\n\n` +
        `👤 ${clienteNombre ?? 'Sin nombre'}\n` +
        `📱 ${conv.cliente_tel}\n\n` +
        `Slots ofrecidos:\n${opcionesTexto}`
      ).catch(() => {});
    }
  } catch (err) {
    console.error('❌ Error procesando AGENDAR_CITA:', err);
  }
}
```

- [ ] **Step 4: Importar Conversacion en webhook.ts si no está ya**

Verificar que `Conversacion` está importado desde `conversation.service`:

```typescript
import {
  // ...existentes...
  saveCita,     // ← añadir
  Conversacion, // ← añadir si no está
} from '../services/conversation.service';
```

- [ ] **Step 5: Compilar**

```bash
npm run build
```

Esperado: sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/routes/webhook.ts
git commit -m "feat: webhook procesa [AGENDAR_CITA] — ofrece slots y notifica al encargado"
```

---

## Chunk 5: Instrucciones de configuración y pruebas manuales

### Task 6: Documentar setup de Google Calendar

- [ ] **Step 1: Verificar que el servidor arranca sin credenciales de Calendar**

```bash
npm run dev
```

Esperado: el servidor arranca normalmente. Sin `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `getAvailableSlots` devuelve `[]` sin lanzar error.

- [ ] **Step 2: Con credenciales configuradas, probar getAvailableSlots en un script rápido**

Crear `src/scripts/test-calendar.ts` temporalmente:

```typescript
import '../config/env'; // carga dotenv
import { getAvailableSlots, formatSlot } from '../services/calendar.service';

(async () => {
  const slots = await getAvailableSlots(3);
  console.log('Slots disponibles:');
  slots.forEach(s => console.log(' -', formatSlot(s)));
})();
```

Ejecutar:

```bash
npx ts-node src/scripts/test-calendar.ts
```

Esperado: lista de 3 slots.

- [ ] **Step 3: Borrar el script de prueba**

```bash
rm src/scripts/test-calendar.ts
```

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "feat: Google Calendar integration completa — detección de cita, slots, creación de evento, notificación al encargado"
```

---

## Resultado esperado

Al terminar este plan:
- Cuando un cliente dice "quiero venir el martes" o "¿cuándo tenéis hueco?", Claude incluye `[AGENDAR_CITA]`
- El bot recupera slots libres del Google Calendar de la empresa
- El encargado recibe notificación por WhatsApp con los slots ofrecidos
- La cita queda guardada en la tabla `citas` para verla desde el panel
- El servidor funciona normalmente aunque Google Calendar no esté configurado (graceful degradation)

## Limitaciones conocidas de V1

- La elección del slot por parte del cliente no crea el evento automáticamente en Google Calendar — el encargado debe confirmar manualmente. V2 puede añadir un segundo turno de confirmación.
- No hay vista de citas en el panel todavía (ver Plan 3: Panel Improvements).
