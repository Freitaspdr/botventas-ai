# Quick Wins (Alta Prioridad) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir el campo `encargado_tel` para que las notificaciones lleguen al número correcto, exponerlo en el panel, y activar el resumen diario automático a las 20:00.

**Architecture:** Tres cambios pequeños e independientes: (1) fix de query SQL en notification.service, (2) dos toques en la API y formulario del panel, (3) un scheduler en index.ts que dispara sendDailySummary para todas las empresas activas a las 20:00.

**Tech Stack:** TypeScript/Node.js (backend), Next.js 16 App Router + Supabase JS client (panel), PostgreSQL

---

## Chunk 1: Fix encargado_tel en el backend

### Estado actual
`getEncargadoTel` en `src/services/notification.service.ts` (línea 123) **ignora** la columna `encargado_tel` que ya existe en la tabla y siempre devuelve `whatsapp_num`. El comentario dice que debería priorizar `encargado_tel`, pero la query solo mira `whatsapp_num`.

### Task 1: Corregir getEncargadoTel

**Files:**
- Modify: `src/services/notification.service.ts:123-134`

- [ ] **Step 1: Corregir la query de getEncargadoTel**

Cambiar la función `getEncargadoTel` (líneas 123-134) para que use `COALESCE(encargado_tel, whatsapp_num)`:

```typescript
async function getEncargadoTel(empresaId: string): Promise<string | null> {
  const result = await db.query<{ tel: string }>(
    `SELECT COALESCE(encargado_tel, whatsapp_num) AS tel
     FROM empresas WHERE id = $1`,
    [empresaId],
  );
  const tel = result.rows[0]?.tel;
  return tel || null;
}
```

- [ ] **Step 2: Verificar compilación TypeScript**

```bash
npm run build
```

Esperado: sin errores de compilación.

- [ ] **Step 3: Commit**

```bash
git add src/services/notification.service.ts
git commit -m "fix: notificaciones usan encargado_tel si está definido, sino whatsapp_num"
```

---

## Chunk 2: Exponer encargado_tel en el panel

### Task 2: API del panel — incluir encargado_tel

**Files:**
- Modify: `panel/app/api/empresa/route.ts`

- [ ] **Step 1: Añadir encargado_tel al SELECT del GET**

En `panel/app/api/empresa/route.ts` línea 11, añadir `encargado_tel` a los campos seleccionados:

```typescript
  const { data, error } = await supabase
    .from('empresas')
    .select('nombre, bot_nombre, bot_tono, bot_objetivo, bot_productos, bot_horarios, bot_ciudad, bot_extra, bot_extra, encargado_tel, plan, conv_limite, conv_usadas')
    .eq('id', session.user.empresaId)
    .single();
```

- [ ] **Step 2: Añadir encargado_tel a campos permitidos en PATCH**

En la línea 24, añadir `'encargado_tel'` al array `allowed`:

```typescript
  const allowed = ['bot_nombre', 'bot_tono', 'bot_objetivo', 'bot_productos', 'bot_horarios', 'bot_ciudad', 'bot_extra', 'encargado_tel'];
```

### Task 3: Formulario del panel — campo encargado_tel

**Files:**
- Modify: `panel/components/bot-config-form.tsx`

- [ ] **Step 1: Añadir encargado_tel al handleSubmit**

En el `body: JSON.stringify({...})` del handleSubmit, añadir:

```typescript
body: JSON.stringify({
  bot_nombre:    form.bot_nombre,
  bot_tono:      form.bot_tono,
  bot_objetivo:  form.bot_objetivo,
  bot_productos: form.bot_productos,
  bot_horarios:  form.bot_horarios,
  bot_ciudad:    form.bot_ciudad,
  bot_extra:     form.bot_extra,
  encargado_tel: form.encargado_tel,   // ← nuevo
}),
```

- [ ] **Step 2: Añadir el campo de input en el formulario JSX**

Después del campo `bot_ciudad` (línea ~83 aprox), añadir:

```tsx
      <div className="space-y-1.5">
        <Label className="text-zinc-300 text-sm">
          WhatsApp del encargado (notificaciones)
        </Label>
        <Input
          value={form.encargado_tel || ''}
          onChange={(e) => handleChange('encargado_tel', e.target.value)}
          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600"
          placeholder="34612345678 (sin + ni espacios)"
        />
        <p className="text-zinc-500 text-xs">
          Si es distinto al número del bot. Aquí llegan los avisos de hot leads y transferencias.
        </p>
      </div>
```

- [ ] **Step 3: Verificar build del panel**

```bash
cd panel && npm run build
```

Esperado: sin errores.

- [ ] **Step 4: Verificar visualmente**

```bash
cd panel && npm run dev
```

Ir a `http://localhost:3001/configuracion` → el campo "WhatsApp del encargado" debe aparecer y guardar.

- [ ] **Step 5: Commit**

```bash
git add panel/app/api/empresa/route.ts panel/components/bot-config-form.tsx
git commit -m "feat: exponer y editar encargado_tel desde el panel de configuración"
```

---

## Chunk 3: Resumen diario automático a las 20:00

### Task 4: Scheduler de resumen diario

El resumen diario (`sendDailySummary`) ya existe en `notification.service.ts` pero no está conectado a ningún cron. Hay que:
1. Importar la función en `src/index.ts`
2. Añadir una función helper que calcule ms hasta el próximo 20:00
3. Llamarla con setTimeout + recurse diario
4. Iterar sobre todas las empresas activas

**Files:**
- Modify: `src/index.ts`
- Modify: `src/services/notification.service.ts`

- [ ] **Step 1: Exportar getAllEmpresasActivas desde notification.service**

Añadir al final de `src/services/notification.service.ts`:

```typescript
/**
 * Devuelve los IDs de todas las empresas activas con encargado configurado
 */
export async function getAllEmpresasActivasIds(): Promise<string[]> {
  const result = await db.query<{ id: string }>(
    `SELECT id FROM empresas WHERE activo = true`,
  );
  return result.rows.map(r => r.id);
}
```

- [ ] **Step 2: Añadir scheduleDailySummary a src/index.ts**

Importar al inicio del archivo:

```typescript
import { runNurturingCycle } from './services/nurturing.service';
import { sendDeferredMessages } from './services/scheduler.service';
import { sendDailySummary, getAllEmpresasActivasIds } from './services/notification.service'; // ← añadir
```

Añadir la función helper y el inicio del scheduler en `main()`, después de los setIntervals existentes:

```typescript
  // Resumen diario: a las 20:00 cada día
  scheduleDailySummary();
  console.log('⏰ Tareas programadas activas: nurturing (15min) + diferidos (5min) + resumen diario (20:00)');
```

Y añadir la función FUERA de `main()`, antes del `main().catch(...)`:

```typescript
function msHastaLas20(): number {
  const now = new Date();
  const target = new Date();
  target.setHours(20, 0, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1); // ya pasó las 20h, programar para mañana
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
    // Volver a programar para el siguiente día
    scheduleDailySummary();
  }, delay);
}
```

- [ ] **Step 3: Verificar compilación**

```bash
npm run build
```

Esperado: sin errores.

- [ ] **Step 4: Verificar en dev que el log aparece al arrancar**

```bash
npm run dev
```

Esperado en consola: `📊 Resumen diario programado en X.Xh`

- [ ] **Step 5: Commit**

```bash
git add src/index.ts src/services/notification.service.ts
git commit -m "feat: resumen diario automático enviado a las 20:00 a todas las empresas activas"
```

---

## Resultado esperado

Al terminar este plan:
- Las notificaciones (hot lead, transfer, nuevo lead) llegan al número `encargado_tel` si está configurado, y al `whatsapp_num` del bot si no.
- Desde el panel `/configuracion` se puede editar el campo `encargado_tel`.
- Cada día a las 20:00 el encargado de cada empresa recibe un resumen de conversaciones, mensajes, leads nuevos y leads calientes del día.
