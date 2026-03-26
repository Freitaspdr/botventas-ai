# PANEL.md — Especificaciones del Panel Admin BotVentas AI

> **INSTRUCCIÓN PARA CLAUDE CODE**: Este documento contiene las especificaciones EXACTAS del panel de administración. Construye cada página siguiendo el diseño, colores, componentes y funcionalidad descritos aquí. No improvises el diseño — sigue estas specs al pixel. El panel ya existe en `/panel` con scaffolding básico. Tu trabajo es reconstruir y ampliar cada página según estas especificaciones.

## Stack y configuración

- **Framework**: Next.js (App Router) con TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **Auth**: NextAuth v5 con Google OAuth
- **BD**: PostgreSQL directo con `pg` (misma BD que el backend en `/src`)
- **Iconos**: Lucide React
- **Puerto**: 3001 (el backend corre en 3000)
- **Tema**: Oscuro obligatorio. Fondo principal `#09090b`. NO tema claro.

## Diseño global

### Paleta de colores (usar SOLO estos)

```
Fondo principal:     #09090b (bg de toda la app)
Fondo tarjetas:      rgba(255,255,255,0.025)
Fondo hover:         rgba(255,255,255,0.04)
Bordes:              rgba(255,255,255,0.05)  (0.5px solid)
Bordes hover:        rgba(255,255,255,0.08)

Texto principal:     #fafafa
Texto secundario:    #a1a1aa
Texto muted:         #52525b
Texto hint:          #3f3f46

Verde (success/hot):  #22c55e (bg: rgba(34,197,94,0.1))
Verde claro:          #4ade80
Amarillo (warn):      #f59e0b / #fbbf24 (bg: rgba(245,158,11,0.1))
Azul (info/citas):    #3b82f6 / #60a5fa (bg: rgba(59,130,246,0.1))
Rojo (danger/transf): #ef4444 / #f87171 (bg: rgba(239,68,68,0.1))
Púrpura (conversión): #a78bfa / #c4b5fd (bg: rgba(167,139,250,0.1))
```

### Tipografía

```
Títulos de página:   text-xl font-medium tracking-tight text-[#fafafa]
Subtítulos:          text-xs text-[#3f3f46]
Labels de cards:     text-[10px] uppercase tracking-wider text-[#3f3f46]
Números grandes:     text-2xl font-medium tracking-tight
Texto de listas:     text-[13px] text-[#e4e4e7]
Texto secundario:    text-[11px] text-[#52525b]
Tags/badges:         text-[9px] font-medium px-1.5 py-0.5 rounded
```

### Componentes comunes

**Tarjeta de métrica (StatsCard)**:
- Fondo: `bg-white/[0.025]`
- Borde: `border border-white/[0.05]`
- Border radius: `rounded-[10px]`
- Padding: `p-3`
- Contiene: icono SVG 14px arriba derecha en color muted, label uppercase 10px, número 24px, indicador de tendencia con flecha SVG

**Tarjeta de sección (SectionCard)**:
- Mismo fondo y borde que StatsCard
- Border radius: `rounded-xl`
- Header con título 13px text-[#a1a1aa] + link "Ver todo →" en text-[#3f3f46]
- Separado del contenido por border-bottom

**Badge/Tag de estado**:
```
HOT:       bg-green-500/10 text-[#4ade80]
WARM:      bg-amber-500/10 text-[#fbbf24]
TRANSFER:  bg-red-500/10 text-[#f87171]
Activa:    bg-white/[0.04] text-[#52525b]
Vehículo:  bg-blue-500/10 text-[#1d4ed8]  (o bg-white/[0.04] text-[#52525b])
```

**Avatar**:
- 36x36px, rounded-[10px] (NO circular)
- Fondo con gradiente según estado:
  - HOT/verde: `bg-gradient-to-br from-[#064e3b] to-[#065f46]` texto `text-[#6ee7b7]`
  - WARM/púrpura: `bg-gradient-to-br from-[#1e1b4b] to-[#312e81]` texto `text-[#a5b4fc]`
  - TRANSFER/rojo: `bg-gradient-to-br from-[#450a0a] to-[#7f1d1d]` texto `text-[#fca5a5]`
  - Inactivo: `bg-white/[0.04]` texto `text-[#52525b]`
- Indicador online: punto verde 10px abajo-derecha con borde 2px del color de fondo

## Layout principal

```
┌──────────────────────────────────────────────────┐
│  Top Bar (fija, bg-white/[0.015])                │
│  Logo + Empresa + Notificaciones + Avatar        │
├────┬─────────────────────────────────────────────┤
│    │                                             │
│ S  │  Contenido de la página                     │
│ I  │                                             │
│ D  │                                             │
│ E  │                                             │
│ B  │                                             │
│ A  │                                             │
│ R  │                                             │
│    │                                             │
│ 56 │                                             │
│ px │                                             │
│    │                                             │
└────┴─────────────────────────────────────────────┘
```

### Top Bar

- Altura: ~44px
- Izquierda: Logo SVG (circulo con check verde) + "BotVentas" 14px font-medium + badge "AI" verde + separador vertical + nombre empresa 12px text-[#52525b]
- Derecha: icono campana (con punto rojo si hay notificaciones pendientes) + avatar 28px rounded-lg con gradiente azul-púrpura e iniciales

### Sidebar (iconos solamente, NO texto)

- Ancho: 56px
- Iconos: 36x36px con hover bg, centrados
- Ítem activo: fondo `bg-green-500/10`, icono en color `#4ade80`
- Ítems inactivos: icono en `#52525b`
- Separador antes del último ítem (Config)
- Dot de notificación en icono Leads si hay leads nuevos sin ver

**Ítems del sidebar (de arriba a abajo)**:
1. Dashboard (grid de 4 rectángulos)
2. Conversaciones (burbuja de chat)
3. Leads (persona con dot de notificación)
4. Citas (calendario)
5. Analytics (línea de gráfico)
6. --- separador ---
7. Configuración (engranaje)

Cada ítem navega a: `/`, `/conversaciones`, `/leads`, `/citas`, `/analytics`, `/configuracion`

---

## Página 1: Dashboard (`/`)

### Header
- "Buenos días/tardes/noches, [nombre]" — saludo dinámico según hora del día
- Subtítulo: "[Día de la semana] [fecha] · Tu bot lleva [X]h [Y]min activo hoy"
- Derecha: Selector de periodo (7d / Hoy / 30d) como grupo de botones con el activo highlighted

### Banner de facturación (destacado)
- Fondo: gradiente verde sutil `bg-gradient-to-r from-green-500/[0.06] to-green-500/[0.02]`
- Borde: `border border-green-500/[0.12]`
- Border radius: `rounded-xl`
- Izquierda: "FACTURACIÓN GENERADA ESTE MES" (label verde 11px uppercase) + número grande 32px
- Derecha: "vs mes anterior" + porcentaje de cambio + "ROI del bot: x[N]"
- Los datos vienen de: SUM del campo ticket_estimado de leads con estado 'cerrado' en el mes actual

### Grid de métricas (5 columnas)
5 StatsCards en fila:
1. **Conversaciones** — COUNT conversaciones del día. Icono: burbuja chat. Tendencia: vs ayer.
2. **Hot leads** — COUNT leads del día con nivel='alto'. Icono: llama. Color número: `#fbbf24`. Tendencia: vs ayer.
3. **Citas hoy** — COUNT citas con fecha=hoy. Icono: calendario. Color: `#60a5fa`. Subtexto: "[N] confirm. [M] pend."
4. **Conversión** — (leads cerrados / total leads) * 100 del periodo. Icono: línea ascendente. Color: `#c4b5fd`. Tendencia: vs periodo anterior.
5. **Tasa bot** — 100% - (conversaciones con transfer / total conversaciones) * 100. Icono: check en círculo. Color: `#4ade80`. Subtexto: "Indetectable" si > 95%.

### Dos columnas debajo de métricas

**Columna izquierda (60%): Feed en vivo**
- SectionCard con header "Feed en vivo" + indicador pulsante verde + "N activas ahora"
- Lista de las últimas 5-7 conversaciones, cada una con:
  - Avatar con gradiente según estado + indicador online si activa
  - Nombre del cliente (13px font-medium)
  - Último mensaje o estado actual (11px muted)
  - Hora (10px)
  - Badges: estado (HOT/WARM/TRANSFER/Activa) + vehículo si lo hay + ticket estimado si se conoce
  - Si está en nurturing: "Nurturing [N]/4 · Próximo msg en [tiempo]"
  - Si fue transferida: fondo rojo sutil + "Esperando tu respuesta"
  - Click navega a `/conversaciones/[id]`
- Ordenar por actualizada_en DESC
- **Query SQL**:
```sql
SELECT c.*, 
  (SELECT contenido FROM mensajes WHERE conv_id = c.id ORDER BY enviado_en DESC LIMIT 1) as ultimo_mensaje,
  (SELECT rol FROM mensajes WHERE conv_id = c.id ORDER BY enviado_en DESC LIMIT 1) as ultimo_rol,
  l.nivel as lead_nivel
FROM conversaciones c
LEFT JOIN leads l ON l.conv_id = c.id
WHERE c.empresa_id = $1
ORDER BY c.actualizada_en DESC
LIMIT 7
```

**Columna derecha (40%): 3 secciones apiladas**

**1. Agenda** (SectionCard)
- Header: "Agenda" + "Ver calendario →" (link a /citas)
- Lista de próximas 3 citas con:
  - Barra vertical de color (3px) a la izquierda: azul (mañana), verde (esta semana), amarillo (próxima semana)
  - Nombre + fecha/hora a la derecha
  - Servicio + vehículo + ticket estimado (10px muted)

**2. Embudo este mes** (SectionCard)
- 5 barras horizontales apiladas mostrando el funnel:
  - Leads captados: 100% ancho, azul
  - Respondieron: % real, púrpura
  - Cualificados: % real, amarillo
  - Citas agendadas: % real, verde
  - Ventas cerradas: % real, verde claro
- Cada barra: label izquierda + "N (X%)" derecha + barra de 5px

**3. Uso del plan** (mini card)
- Barra de progreso: verde si < 70%, amarillo si 70-90%, rojo si > 90%
- Texto: "Plan [nombre] · [usadas]/[limite] conv"

---

## Página 2: Conversaciones (`/conversaciones`)

### Lista de conversaciones
- Header: "Conversaciones" + badge con total activas
- Barra de búsqueda + filtros: Estado (Todas / Activas / Transferidas / Cerradas) + Periodo
- Tabla con columnas:
  - Avatar + Nombre (con indicador online)
  - Último mensaje (truncado)
  - Estado (badge con color)
  - Lead score (barra mini + número)
  - Nurturing (paso N/4 o "—")
  - Hora última actividad
- Click en fila navega a `/conversaciones/[id]`

### Detalle de conversación (`/conversaciones/[id]`)

Layout de dos columnas:

**Izquierda (70%): Chat**
- Breadcrumb: "Conversaciones / [Nombre]"
- Badges en header: estado del lead + cita si existe
- Área de chat estilo WhatsApp:
  - Mensajes del cliente: burbuja verde oscuro (`bg-[#065f46]`) alineada derecha, border-radius asimétrico (12px arriba, 2px abajo-derecha)
  - Mensajes del bot: burbuja gris oscuro (`bg-[#1c1c22]`) alineada izquierda, border-radius asimétrico (12px arriba, 2px abajo-izquierda)
  - Cada burbuja muestra: texto + hora (9px) + indicador (si fue IA: "IA · [N]s delay" en tag gris, si tiene tag: "HOT_LEAD" o "CITA CREADA" en tag de color)
  - Separadores de fecha centrados: "Hoy 14:20" en pill gris
- Scroll automático al final
- NO hay input para escribir (el panel es solo lectura del chat, la conversación la maneja el bot). Pero sí hay botón "Tomar control" que marca la conversación como transferida y abre WhatsApp Web en nueva pestaña con el número del cliente.

**Derecha (30%): Ficha del lead**
- Card con avatar centrado + nombre + teléfono (clickeable para abrir WhatsApp)
- Datos extraídos (si existen):
  - Vehículo: marca/modelo/año
  - Interés: servicio(s)
  - Ticket estimado: rango de precio
  - Lead score: barra de progreso + número (0-100)
  - Nurturing: paso actual o "No necesario"
  - Inicio conversación: fecha/hora
- Botón "Transferir a humano" (rojo sutil) — marca conv como transferida

---

## Página 3: Leads (`/leads`)

### Vista Kanban (por defecto)
4 columnas arrastrables (usar HTML5 drag and drop o simplemente botones para mover):

**Columna 1: Nuevos** (borde superior azul `#3b82f6`)
- Leads con estado='nuevo'
- Card por lead: nombre + badge nivel (Alto/Medio/Bajo con colores) + servicio + vehículo + "Hace [tiempo]"

**Columna 2: Contactados** (borde superior amarillo `#f59e0b`)
- Leads con estado='contactado'
- Si tiene cita: mostrar "Cita [fecha hora]" en azul
- Si está en nurturing: "Nurturing paso N" en amarillo

**Columna 3: Cerrados** (borde superior verde `#22c55e`)
- Leads con estado='cerrado'
- Mostrar ticket/precio si se conoce en verde
- "Completado [fecha]"

**Columna 4: Perdidos** (borde superior gris `#52525b`)
- Leads con estado='perdido'
- Opacidad 0.7
- "No respondió nurturing" o razón

### Footer de métricas
Barra inferior con: Ticket medio + Conversión lead→cita + Facturación mes + Tasa detección bot

### Cambiar estado de lead
- Click en card abre modal/dropdown con opciones de cambiar estado
- Al cambiar: UPDATE leads SET estado = $1 WHERE id = $2

---

## Página 4: Citas (`/citas`)

### Vista semanal
- Header: "Citas" + navegador de semana (← Semana anterior | Semana actual | Semana siguiente →)
- Grid de 7 columnas (Lun-Dom), cada columna con las citas del día
- Cada cita como card pequeña con:
  - Hora prominente
  - Nombre cliente
  - Servicio
  - Vehículo
  - Estado: badge (confirmada=verde, pendiente=amarillo, cancelada=rojo, completada=gris, no_show=rojo oscuro)
- Click en cita abre detalle con opción de cambiar estado

### Crear cita manual
- Botón "+ Nueva cita" abre formulario:
  - Seleccionar lead existente o escribir datos nuevos
  - Fecha y hora
  - Servicio
  - Notas
  - INSERT INTO citas (empresa_id, cliente_tel, cliente_nombre, fecha_hora, servicio, notas)

---

## Página 5: Analytics (`/analytics`)

### Métricas del periodo (selector: 7d / 30d / 90d)

**Fila de KPIs** (5 cards):
- Total leads
- Tasa respuesta (respondieron / total)
- Tasa cualificación (cualificados / respondieron)
- Tasa cita (citas / cualificados)
- Coste por lead (si hay gasto de ads configurado)

**Gráfico de evolución** (usar recharts o chart.js via CDN):
- Líneas: leads/día, citas/día, conversaciones/día
- Eje X: fechas
- Eje Y: cantidad
- Tooltip con datos exactos al hover

**Tabla de servicios más demandados**:
- Extraer de campo interes de leads
- Columnas: Servicio, Leads, Citas, Cerrados, Ticket medio, Facturación

**Rendimiento del bot**:
- Mensajes totales enviados por IA
- Tiempo medio de respuesta (con delay humanizado)
- % de escalado a humano
- Conversaciones completadas sin intervención humana

---

## Página 6: Configuración (`/configuracion`)

### Ya existe el formulario básico. Ampliar con:

**Sección 1: Identidad del bot**
- Nombre del bot (input)
- Tono (select: amigable/profesional/formal)
- Ciudad (input)

**Sección 2: Catálogo**
- Objetivo del bot (textarea)
- Productos y servicios (textarea grande)
- Horarios (textarea)
- Instrucciones especiales (textarea)

**Sección 3: Notificaciones** (NUEVO)
- Toggle: Notificar hot leads (on/off)
- Toggle: Notificar transfers (on/off)
- Toggle: Notificar leads nuevos (on/off)
- Toggle: Resumen diario a las 20:00 (on/off)
- Teléfono del encargado (input) — para recibir notificaciones WhatsApp

**Sección 4: Plan** (NUEVO, solo lectura)
- Plan actual
- Conversaciones usadas / límite
- Barra de progreso
- Botón "Cambiar plan" (futuro, disabled por ahora)

---

## API Routes necesarias

### Existentes (verificar que funcionan):
- `GET /api/dashboard/stats` — métricas del dashboard
- `GET /api/conversaciones` — lista de conversaciones
- `GET /api/conversaciones/[id]` — detalle + mensajes
- `GET /api/leads` — lista de leads
- `PATCH /api/leads/[id]` — cambiar estado de lead
- `GET /api/empresa` — config de la empresa
- `PATCH /api/empresa` — guardar config del bot

### Nuevas a crear:
- `GET /api/dashboard/revenue` — facturación del mes (SUM tickets de leads cerrados)
- `GET /api/dashboard/funnel` — datos del embudo (counts por estado)
- `GET /api/citas` — lista de citas con filtro de fecha
- `POST /api/citas` — crear cita manual
- `PATCH /api/citas/[id]` — cambiar estado de cita
- `GET /api/analytics/overview` — KPIs del periodo
- `GET /api/analytics/chart` — datos para gráfico de evolución (leads/citas por día)
- `GET /api/analytics/services` — servicios más demandados
- `PATCH /api/empresa/notifications` — guardar config de notificaciones

### Patrón de API Route:

Todas las API routes siguen este patrón:

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.empresaId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { rows } = await pool.query(
    'SELECT ... FROM ... WHERE empresa_id = $1',
    [session.user.empresaId]
  );
  
  return NextResponse.json(rows);
}
```

SIEMPRE filtrar por empresa_id del usuario autenticado. NUNCA exponer datos de otras empresas.

---

## Orden de implementación

Construir en este orden exacto:

1. **Layout principal**: Top bar + Sidebar con iconos + navegación entre páginas
2. **Dashboard**: Banner facturación + 5 stats cards + Feed en vivo + Agenda + Embudo + Uso plan
3. **Conversaciones lista**: Tabla con búsqueda y filtros
4. **Conversación detalle**: Chat viewer + Ficha del lead
5. **Leads kanban**: 4 columnas + cambio de estado + footer métricas
6. **Citas**: Vista semanal + crear cita manual
7. **Analytics**: KPIs + gráfico evolución + tabla servicios
8. **Configuración ampliada**: Añadir secciones de notificaciones y plan

Cada paso debe ser funcional y conectado a la BD real antes de pasar al siguiente.

---

## Queries SQL de referencia

### Dashboard stats
```sql
-- Conversaciones hoy
SELECT COUNT(*) FROM conversaciones WHERE empresa_id = $1 AND iniciada_en::date = CURRENT_DATE;

-- Hot leads hoy
SELECT COUNT(*) FROM leads WHERE empresa_id = $1 AND creado_en::date = CURRENT_DATE AND nivel = 'alto';

-- Citas hoy
SELECT COUNT(*), 
  COUNT(*) FILTER (WHERE estado = 'confirmada') as confirmadas,
  COUNT(*) FILTER (WHERE estado != 'confirmada') as pendientes
FROM citas WHERE empresa_id = $1 AND fecha_hora::date = CURRENT_DATE;

-- Tasa conversión (mes actual)
SELECT 
  COUNT(*) FILTER (WHERE estado = 'cerrado')::float / NULLIF(COUNT(*), 0) * 100 as tasa
FROM leads WHERE empresa_id = $1 AND creado_en >= date_trunc('month', CURRENT_DATE);

-- Tasa bot (mes actual)
SELECT 
  100 - (COUNT(*) FILTER (WHERE estado = 'transferida')::float / NULLIF(COUNT(*), 0) * 100) as tasa
FROM conversaciones WHERE empresa_id = $1 AND iniciada_en >= date_trunc('month', CURRENT_DATE);

-- Facturación mes (estimada por tickets de leads cerrados)
-- NOTA: si no hay campo ticket, calcular desde el servicio y precios del catálogo
SELECT COALESCE(SUM(
  CASE 
    WHEN interes ILIKE '%sound booster%' THEN 1550
    WHEN interes ILIKE '%sonido%' THEN 1200
    WHEN interes ILIKE '%carplay%' THEN 750
    WHEN interes ILIKE '%pantalla%' THEN 650
    WHEN interes ILIKE '%luz%' THEN 450
    WHEN interes ILIKE '%alarma%' THEN 350
    WHEN interes ILIKE '%camara%' THEN 120
    ELSE 500
  END
), 0) as facturacion
FROM leads WHERE empresa_id = $1 AND estado = 'cerrado' 
AND creado_en >= date_trunc('month', CURRENT_DATE);
```

### Embudo
```sql
SELECT
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE estado != 'nuevo') as respondieron,
  COUNT(*) FILTER (WHERE nivel = 'alto') as cualificados,
  (SELECT COUNT(*) FROM citas WHERE empresa_id = $1 AND creado_en >= date_trunc('month', CURRENT_DATE)) as citas,
  COUNT(*) FILTER (WHERE estado = 'cerrado') as cerrados
FROM leads
WHERE empresa_id = $1 AND creado_en >= date_trunc('month', CURRENT_DATE);
```

### Chart de evolución (últimos 30 días)
```sql
SELECT 
  d.fecha,
  COALESCE(l.count, 0) as leads,
  COALESCE(c.count, 0) as citas,
  COALESCE(cv.count, 0) as conversaciones
FROM generate_series(CURRENT_DATE - 29, CURRENT_DATE, '1 day') AS d(fecha)
LEFT JOIN (
  SELECT creado_en::date as fecha, COUNT(*) FROM leads WHERE empresa_id = $1 GROUP BY 1
) l ON l.fecha = d.fecha
LEFT JOIN (
  SELECT creado_en::date as fecha, COUNT(*) FROM citas WHERE empresa_id = $1 GROUP BY 1
) c ON c.fecha = d.fecha
LEFT JOIN (
  SELECT iniciada_en::date as fecha, COUNT(*) FROM conversaciones WHERE empresa_id = $1 GROUP BY 1
) cv ON cv.fecha = d.fecha
ORDER BY d.fecha;
```
