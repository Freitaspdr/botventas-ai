# Multi-instancia Evolution API — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El webhook resuelve la empresa por el nombre de instancia de Evolution API (campo `evolution_instance` en tabla `empresas`), eliminando la dependencia de la variable de entorno `EVOLUTION_INSTANCE` para soportar multi-tenant real.

**Architecture:** Se añade una columna `evolution_instance` a la tabla `empresas`. El webhook lee `payload.instance` y busca la empresa por ese campo en lugar de usar `env.EVOLUTION_INSTANCE`. El envío de mensajes (`sendText`) sigue usando la instancia de la empresa. Las variables de entorno de instancia pasan a ser opcionales (solo para legacy/dev).

**Tech Stack:** PostgreSQL migration, TypeScript, Express webhook

---

## Chunk 1: Migración de BD

### Task 1: Añadir columna evolution_instance a empresas

**Files:**
- Create: `src/db/migration-003-multi-instancia.sql`

- [ ] **Step 1: Crear la migración**

```sql
-- migration-003-multi-instancia.sql
-- Soporte multi-tenant: cada empresa tiene su propia instancia de Evolution API

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS evolution_instance VARCHAR(100);

-- Índice para lookup rápido en el webhook
CREATE UNIQUE INDEX IF NOT EXISTS idx_empresas_evolution_instance
  ON empresas(evolution_instance)
  WHERE evolution_instance IS NOT NULL;

-- Comentario para documentar el propósito
COMMENT ON COLUMN empresas.evolution_instance IS
  'Nombre de la instancia en Evolution API (ej: "beleti-bot"). Debe coincidir con payload.instance del webhook.';
```

- [ ] **Step 2: Ejecutar migración**

```bash
psql $DATABASE_URL -f src/db/migration-003-multi-instancia.sql
```

- [ ] **Step 3: Actualizar la empresa de Beleti con su instancia actual**

```sql
UPDATE empresas
SET evolution_instance = 'TU_INSTANCIA_ACTUAL'
WHERE whatsapp_num = '521TUNUMERODEWHATSAPP';
```

Reemplazar `TU_INSTANCIA_ACTUAL` con el valor de `EVOLUTION_INSTANCE` del `.env`.

- [ ] **Step 4: Commit**

```bash
git add src/db/migration-003-multi-instancia.sql
git commit -m "feat: migration añade evolution_instance a empresas para multi-tenant"
```

---

## Chunk 2: Resolver empresa por instancia en el webhook

### Task 2: Nueva función getEmpresaByInstance

**Files:**
- Modify: `src/services/conversation.service.ts`

- [ ] **Step 1: Añadir getEmpresaByInstance a conversation.service.ts**

Añadir después de `getEmpresaByWhatsapp`:

```typescript
export async function getEmpresaByInstance(instance: string): Promise<Empresa | null> {
  const result = await db.query<Empresa>(
    'SELECT * FROM empresas WHERE evolution_instance = $1 AND activo = true',
    [instance],
  );
  return result.rows[0] ?? null;
}
```

Actualizar también la interfaz `Empresa` añadiendo el nuevo campo:

```typescript
export interface Empresa {
  id:                  string;
  nombre:              string;
  whatsapp_num:        string;
  evolution_instance:  string | null;   // ← nuevo
  plan:                string;
  // ... resto igual
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/conversation.service.ts
git commit -m "feat: getEmpresaByInstance para lookup por nombre de instancia"
```

---

## Chunk 3: Actualizar el webhook para usar instancia del payload

### Task 3: Webhook usa payload.instance para resolver empresa

**Files:**
- Modify: `src/routes/webhook.ts`
- Modify: `src/services/whatsapp.service.ts`
- Modify: `src/config/env.ts`

- [ ] **Step 1: Actualizar el import en webhook.ts**

Añadir `getEmpresaByInstance` al import de conversation.service:

```typescript
import {
  getEmpresaByWhatsapp,     // mantener para compatibilidad
  getEmpresaByInstance,      // ← nuevo
  // ...resto
} from '../services/conversation.service';
```

- [ ] **Step 2: Cambiar la resolución de empresa en el webhook**

Reemplazar el bloque actual (líneas ~49-57 de webhook.ts):

```typescript
    // ANTES:
    const instancePhone = env.EVOLUTION_INSTANCE;
    const empresa = await getEmpresaByWhatsapp(instancePhone);
```

Por:

```typescript
    // Resuelve la empresa por el nombre de instancia del webhook
    // Esto permite multi-tenant: cada empresa tiene su propia instancia
    const empresa = await getEmpresaByInstance(payload.instance)
      ?? await getEmpresaByWhatsapp(env.EVOLUTION_INSTANCE); // fallback legacy
```

El fallback `getEmpresaByWhatsapp(env.EVOLUTION_INSTANCE)` mantiene compatibilidad durante la transición.

- [ ] **Step 3: Actualizar sendText para usar la instancia de la empresa**

En `src/services/whatsapp.service.ts`, la función `sendText` usa hardcoded `env.EVOLUTION_INSTANCE`. Modificarla para aceptar un parámetro de instancia opcional:

```typescript
export async function sendText(
  to: string,
  text: string,
  instance: string = env.EVOLUTION_INSTANCE,
): Promise<void> {
  await api.post(`/sendText/${instance}`, {
    number: to,
    text,
  });
}
```

- [ ] **Step 4: Propagar la instancia desde el webhook**

En `src/routes/webhook.ts`, al llamar `sendText` directamente (mensaje de límite excedido, línea ~62), pasar la instancia:

```typescript
await sendText(
  clienteTel,
  '⚠️ El servicio de atención automática está temporalmente suspendido...',
  payload.instance,  // ← nuevo
);
```

Actualizar también el helper `saveDeferredMessage` y los chunks de respuesta para pasar `payload.instance` a `sendText`. Busca todos los `sendText(` dentro de webhook.ts y añade el tercer argumento `payload.instance`.

- [ ] **Step 5: Actualizar whatsapp.service para instancia por empresa en el resto de servicios**

Los servicios `nurturing.service.ts`, `scheduler.service.ts` y `notification.service.ts` también llaman a `sendText`. Estos ya tienen acceso al `empresa_id` o `conv_id` para resolver la instancia.

Añadir una función helper en `whatsapp.service.ts`:

```typescript
export async function getInstanceForEmpresa(empresaId: string): Promise<string> {
  const { db } = await import('../db/client');
  const result = await db.query<{ evolution_instance: string | null }>(
    'SELECT evolution_instance FROM empresas WHERE id = $1',
    [empresaId],
  );
  return result.rows[0]?.evolution_instance ?? env.EVOLUTION_INSTANCE;
}
```

Y en `nurturing.service.ts`, `scheduler.service.ts` y `notification.service.ts`, usar `getInstanceForEmpresa(empresaId)` antes de llamar a `sendText`.

Ejemplo en `nurturing.service.ts`:

```typescript
// Antes:
await sendText(clienteTel, mensaje);

// Después:
const instance = await getInstanceForEmpresa(conv.empresa_id);
await sendText(clienteTel, mensaje, instance);
```

- [ ] **Step 6: Hacer EVOLUTION_INSTANCE opcional en env.ts**

```typescript
export const env = {
  // ...
  EVOLUTION_INSTANCE: process.env.EVOLUTION_INSTANCE ?? '',  // ya no es require()
  // ...
};
```

- [ ] **Step 7: Compilar**

```bash
npm run build
```

Esperado: sin errores.

- [ ] **Step 8: Commit**

```bash
git add src/routes/webhook.ts src/services/whatsapp.service.ts src/services/nurturing.service.ts src/services/scheduler.service.ts src/services/notification.service.ts src/config/env.ts
git commit -m "feat: webhook resuelve empresa por evolution_instance del payload (multi-tenant)"
```

---

## Chunk 4: Exponer evolution_instance en el panel

### Task 4: Campo evolution_instance en configuración del panel

**Files:**
- Modify: `panel/app/api/empresa/route.ts`
- Modify: `panel/components/bot-config-form.tsx`

- [ ] **Step 1: Añadir evolution_instance a la API del panel**

En `panel/app/api/empresa/route.ts`:
- GET: añadir `evolution_instance` al SELECT
- PATCH: añadir `'evolution_instance'` al array `allowed`

- [ ] **Step 2: Añadir campo en el formulario**

En `panel/components/bot-config-form.tsx`, añadir después de `encargado_tel`:

```tsx
<div className="space-y-1.5">
  <Label className="text-zinc-300 text-sm">Instancia Evolution API</Label>
  <Input
    value={form.evolution_instance || ''}
    onChange={(e) => handleChange('evolution_instance', e.target.value)}
    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 font-mono text-sm"
    placeholder="nombre-instancia"
  />
  <p className="text-zinc-500 text-xs">
    Nombre de la instancia en Evolution API. Debe coincidir exactamente.
  </p>
</div>
```

- [ ] **Step 3: Compilar panel**

```bash
cd panel && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add panel/app/api/empresa/route.ts panel/components/bot-config-form.tsx
git commit -m "feat: editar evolution_instance de cada empresa desde el panel"
```

---

## Resultado esperado

Al terminar este plan:
- Cada empresa en la BD tiene su propia `evolution_instance`
- El webhook resuelve la empresa por `payload.instance` (nombre de instancia Evolution API)
- Los mensajes salientes (nurturing, scheduler, notificaciones) usan la instancia correcta de cada empresa
- Se puede configurar la instancia desde el panel sin tocar variables de entorno
- Compatibilidad hacia atrás: si `evolution_instance` es NULL, usa `env.EVOLUTION_INSTANCE` como fallback

## Prerequisito para usar multi-tenant real

Además del código, cada empresa necesita:
1. Una instancia Evolution API desplegada con su número de WhatsApp
2. El webhook configurado apuntando al mismo endpoint `/webhook` de este servidor
3. El campo `evolution_instance` configurado en el panel con el nombre exacto de su instancia
