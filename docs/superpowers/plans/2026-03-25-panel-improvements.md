# Panel Improvements — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mejorar el panel admin con: página de citas, filtros de fecha en conversaciones/leads, y exportación CSV de leads.

**Architecture:** Todas las mejoras son adiciones al Next.js panel sin tocar el backend Express. Se añaden API routes nuevas, una página nueva y se amplían las existentes. Se usa el cliente Supabase JS ya configurado en `panel/lib/db.ts`.

**Tech Stack:** Next.js 16 App Router, Supabase JS client, TypeScript, Tailwind CSS + shadcn/ui

---

## Chunk 1: Página de citas

### Task 1: API route para citas

**Files:**
- Create: `panel/app/api/citas/route.ts`

- [ ] **Step 1: Crear el API endpoint GET /api/citas**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import supabase from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get('estado');
  const desde  = searchParams.get('desde');
  const hasta  = searchParams.get('hasta');

  let query = supabase
    .from('citas')
    .select('*')
    .eq('empresa_id', session.user.empresaId)
    .order('fecha_hora', { ascending: true });

  if (estado) query = query.eq('estado', estado);
  if (desde)  query = query.gte('fecha_hora', desde);
  if (hasta)  query = query.lte('fecha_hora', hasta);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, estado } = await req.json();
  if (!id || !estado) return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });

  const allowed = ['pendiente', 'confirmada', 'cancelada', 'completada'];
  if (!allowed.includes(estado)) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });

  const { data, error } = await supabase
    .from('citas')
    .update({ estado })
    .eq('id', id)
    .eq('empresa_id', session.user.empresaId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 2: Commit**

```bash
git add panel/app/api/citas/route.ts
git commit -m "feat: API route GET/PATCH /api/citas para el panel"
```

---

### Task 2: Página de citas

**Files:**
- Create: `panel/app/(dashboard)/citas/page.tsx`

- [ ] **Step 1: Crear la página de citas**

```tsx
import { Calendar, Clock, User, Phone, Car } from 'lucide-react';

async function getCitas(estado?: string) {
  const params = estado ? `?estado=${estado}` : '';
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/citas${params}`, {
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}

const ESTADO_BADGE: Record<string, string> = {
  pendiente:   'bg-yellow-900/40 text-yellow-400 border border-yellow-800',
  confirmada:  'bg-green-900/40  text-green-400  border border-green-800',
  cancelada:   'bg-red-900/40    text-red-400    border border-red-800',
  completada:  'bg-zinc-800      text-zinc-400   border border-zinc-700',
};

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-ES', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

export default async function CitasPage() {
  const citas = await getCitas();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Citas</h1>
        <p className="text-zinc-400 text-sm mt-1">
          {citas.length} cita{citas.length !== 1 ? 's' : ''} programada{citas.length !== 1 ? 's' : ''}
        </p>
      </div>

      {citas.length === 0 ? (
        <div className="text-zinc-500 text-sm bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
          No hay citas registradas aún. El bot las creará automáticamente cuando un cliente quiera agendar.
        </div>
      ) : (
        <div className="space-y-3">
          {citas.map((cita: Record<string, string>) => (
            <div key={cita.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-white font-medium">
                  <Calendar className="w-4 h-4 text-zinc-500 shrink-0" />
                  {formatFecha(cita.fecha_hora)}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${ESTADO_BADGE[cita.estado] ?? ESTADO_BADGE.pendiente}`}>
                  {cita.estado}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  {cita.cliente_nombre ?? 'Sin nombre'}
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  {cita.cliente_tel}
                </div>
                {cita.vehiculo && (
                  <div className="flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 shrink-0" />
                    {cita.vehiculo}
                  </div>
                )}
              </div>

              {cita.servicio && (
                <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  {cita.servicio}
                </div>
              )}

              {cita.google_event_url && (
                <a
                  href={cita.google_event_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  Ver en Google Calendar
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Añadir enlace a Citas en el sidebar**

Abrir `panel/components/sidebar.tsx` y añadir la entrada de Citas en el array de navegación junto a Leads:

```tsx
{ href: '/citas', icon: Calendar, label: 'Citas' },
```

Verificar que `Calendar` está importado de `lucide-react`.

- [ ] **Step 3: Compilar el panel**

```bash
cd panel && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add panel/app/(dashboard)/citas/page.tsx panel/components/sidebar.tsx
git commit -m "feat: página de citas en el panel admin"
```

---

## Chunk 2: Filtros de fecha en conversaciones y leads

### Task 3: Filtro de fecha en la página de conversaciones

**Files:**
- Modify: `panel/app/api/conversaciones/route.ts`
- Modify: `panel/app/(dashboard)/conversaciones/page.tsx`

- [ ] **Step 1: Añadir soporte de query params en GET /api/conversaciones**

Abrir `panel/app/api/conversaciones/route.ts` y añadir soporte para `desde`, `hasta` y `estado`:

```typescript
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get('estado');
  const desde  = searchParams.get('desde');
  const hasta  = searchParams.get('hasta');

  let query = supabase
    .from('conversaciones')
    .select('*')
    .eq('empresa_id', session.user.empresaId)
    .order('actualizada_en', { ascending: false })
    .limit(50);

  if (estado) query = query.eq('estado', estado);
  if (desde)  query = query.gte('iniciada_en', desde);
  if (hasta)  query = query.lte('iniciada_en', hasta + 'T23:59:59');

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
```

Nota: revisa primero el contenido del archivo antes de reemplazarlo para no perder lógica existente.

- [ ] **Step 2: Añadir filtros de fecha en la página de conversaciones**

En `panel/app/(dashboard)/conversaciones/page.tsx`, convertirla a Client Component para manejar estado de filtros, o añadir searchParams del servidor.

**Opción servidor (más simple):** usar `searchParams` de Next.js:

```tsx
// Al inicio del archivo
type SearchParams = { estado?: string; desde?: string; hasta?: string };

export default async function ConversacionesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = new URLSearchParams();
  if (searchParams.estado) params.set('estado', searchParams.estado);
  if (searchParams.desde)  params.set('desde', searchParams.desde);
  if (searchParams.hasta)  params.set('hasta', searchParams.hasta);

  const query = params.toString() ? `?${params}` : '';
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/conversaciones${query}`, {
    cache: 'no-store',
  });
  const conversaciones = res.ok ? await res.json() : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Conversaciones</h1>
      </div>

      {/* Filtros */}
      <form className="flex flex-wrap gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <select
          name="estado"
          defaultValue={searchParams.estado ?? ''}
          className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-2"
        >
          <option value="">Todos los estados</option>
          <option value="activa">Activas</option>
          <option value="cerrada">Cerradas</option>
          <option value="transferida">Transferidas</option>
        </select>

        <input
          type="date"
          name="desde"
          defaultValue={searchParams.desde ?? ''}
          className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-2"
        />
        <input
          type="date"
          name="hasta"
          defaultValue={searchParams.hasta ?? ''}
          className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-2"
        />

        <button
          type="submit"
          className="bg-zinc-700 hover:bg-zinc-600 text-white text-sm px-4 py-2 rounded-lg"
        >
          Filtrar
        </button>
        <a
          href="/conversaciones"
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm px-4 py-2 rounded-lg"
        >
          Limpiar
        </a>
      </form>

      {/* Tabla existente — pasar conversaciones como prop */}
      {/* ... resto del JSX existente ... */}
    </div>
  );
}
```

Nota: adaptar el JSX al contenido actual de la página, no reemplazarlo entero. Leer el archivo primero con Read.

- [ ] **Step 3: Commit**

```bash
git add panel/app/api/conversaciones/route.ts panel/app/(dashboard)/conversaciones/page.tsx
git commit -m "feat: filtros de fecha y estado en página de conversaciones"
```

---

## Chunk 3: Exportación CSV de leads

### Task 4: Endpoint de exportación CSV

**Files:**
- Create: `panel/app/api/leads/export/route.ts`

- [ ] **Step 1: Crear el endpoint GET /api/leads/export**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import supabase from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const nivel  = searchParams.get('nivel');
  const estado = searchParams.get('estado');

  let query = supabase
    .from('leads')
    .select('cliente_nombre, cliente_tel, nivel, estado, interes, notas, creado_en')
    .eq('empresa_id', session.user.empresaId)
    .order('creado_en', { ascending: false });

  if (nivel)  query = query.eq('nivel', nivel);
  if (estado) query = query.eq('estado', estado);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];

  // Construir CSV
  const headers = ['Nombre', 'Teléfono', 'Nivel', 'Estado', 'Interés', 'Notas', 'Fecha'];
  const csvLines = [
    headers.join(';'),
    ...rows.map(r => [
      escapeCsv(r.cliente_nombre ?? ''),
      escapeCsv(r.cliente_tel),
      escapeCsv(r.nivel),
      escapeCsv(r.estado),
      escapeCsv(r.interes ?? ''),
      escapeCsv(r.notas ?? ''),
      escapeCsv(new Date(r.creado_en).toLocaleString('es-ES')),
    ].join(';')),
  ];

  const csv = csvLines.join('\r\n');
  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leads-${fecha}.csv"`,
    },
  });
}

function escapeCsv(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
```

- [ ] **Step 2: Añadir botón de exportación en la página de leads**

En `panel/app/(dashboard)/leads/page.tsx`, añadir un botón de descarga:

```tsx
<a
  href="/api/leads/export"
  download
  className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm px-4 py-2 rounded-lg border border-zinc-700"
>
  <Download className="w-4 h-4" />
  Exportar CSV
</a>
```

Añadir `Download` al import de lucide-react en la página.

- [ ] **Step 3: Compilar**

```bash
cd panel && npm run build
```

- [ ] **Step 4: Verificar la descarga en dev**

```bash
cd panel && npm run dev
```

Ir a `http://localhost:3001/leads` → hacer clic en "Exportar CSV" → debe descargarse un archivo `.csv`.

- [ ] **Step 5: Commit**

```bash
git add panel/app/api/leads/export/route.ts panel/app/(dashboard)/leads/page.tsx
git commit -m "feat: exportación CSV de leads desde el panel"
```

---

## Resultado esperado

Al terminar este plan:
- El panel tiene una sección `/citas` que muestra todas las citas con fecha, cliente, servicio y estado
- Las conversaciones se pueden filtrar por estado y rango de fechas desde la URL
- Los leads se pueden exportar como CSV con un solo clic, con los campos: nombre, teléfono, nivel, estado, interés, notas, fecha
