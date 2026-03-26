# CLAUDE.md — BotVentas AI

## Qué es este proyecto

BotVentas AI es una plataforma SaaS de agentes conversacionales con IA para WhatsApp. Recibe mensajes de WhatsApp via webhook, los procesa con Claude (Anthropic), y responde de forma humanizada simulando ser un empleado real del negocio. Incluye cualificación automática de leads, seguimiento (nurturing), notificaciones al encargado, y un panel de administración web.

El primer cliente es **Beleti Car Audio** (taller de car audio en Madrid), pero la arquitectura es multi-tenant: un solo deploy sirve a múltiples negocios, cada uno con su prompt, servicios, precios y personalidad.

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        BOTVENTAS AI                             │
│                                                                 │
│  ┌──────────┐     ┌──────────────┐     ┌───────────────────┐   │
│  │ WhatsApp  │────▶│  Express.js  │────▶│  Claude API       │   │
│  │ Evolution │◀────│  (webhook)   │◀────│  (Haiku/Sonnet)   │   │
│  │ API       │     │  :3000       │     │                   │   │
│  └──────────┘     └──────┬───────┘     └───────────────────┘   │
│                          │                                      │
│                    ┌─────▼──────┐                               │
│                    │ PostgreSQL │                                │
│                    │ (Supabase) │                                │
│                    └─────┬──────┘                                │
│                          │                                      │
│                   ┌──────▼───────┐                               │
│                   │  Panel Admin │                               │
│                   │  Next.js     │                               │
│                   │  :3001       │                               │
│                   └──────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

El proyecto tiene **dos partes independientes** que comparten la misma base de datos:

1. **Backend** (`/src`): Servidor Express que recibe webhooks de WhatsApp, procesa con Claude, y responde. Incluye nurturing, delays humanizados, notificaciones.
2. **Panel** (`/panel`): App Next.js con dashboard, gestión de conversaciones, leads, y configuración del bot.

## Stack técnico

| Componente | Tecnología | Notas |
|---|---|---|
| Backend API | Express.js + TypeScript | Puerto 3000 |
| Panel Admin | Next.js 16 + TypeScript | Puerto 3001, App Router |
| IA | Anthropic Claude API (Haiku) | SDK `@anthropic-ai/sdk` |
| WhatsApp | Evolution API | API no-oficial, via webhook |
| Base de datos | PostgreSQL | Supabase o local |
| Auth (panel) | NextAuth v5 (Auth.js) | Google OAuth |
| UI (panel) | Tailwind CSS + shadcn/ui | Tema oscuro zinc |
| Iconos | Lucide React | |

## Estructura de archivos

```
botventas-ai/
├── src/                          # ← BACKEND (Express + WhatsApp + IA)
│   ├── index.ts                  # Punto de entrada, Express + cron jobs
│   ├── config/
│   │   └── env.ts                # Variables de entorno tipadas
│   ├── db/
│   │   ├── client.ts             # Pool de PostgreSQL
│   │   ├── schema.sql            # Schema completo + datos de prueba Beleti
│   │   └── migration-001-nurturing.sql  # Migración: nurturing, citas, programados
│   ├── prompts/
│   │   └── system-prompt.ts      # Generador dinámico de system prompt por empresa
│   ├── routes/
│   │   └── webhook.ts            # Webhook principal de Evolution API
│   └── services/
│       ├── anthropic.service.ts  # Cliente Claude API
│       ├── conversation.service.ts # CRUD conversaciones, leads, tags
│       ├── whatsapp.service.ts   # Envío de mensajes via Evolution API
│       ├── humanize.service.ts   # Delays aleatorios + fragmentación de mensajes
│       ├── notification.service.ts # Notificaciones WhatsApp al encargado
│       ├── nurturing.service.ts  # Seguimiento automático 4 pasos
│       └── scheduler.service.ts  # Envío de mensajes diferidos (nocturnos)
│
├── panel/                        # ← PANEL ADMIN (Next.js)
│   ├── app/
│   │   ├── layout.tsx            # Root layout
│   │   ├── globals.css           # Estilos globales
│   │   ├── (auth)/login/         # Página de login con Google
│   │   ├── (dashboard)/          # Páginas protegidas
│   │   │   ├── layout.tsx        # Layout con sidebar
│   │   │   ├── page.tsx          # Dashboard (stats cards)
│   │   │   ├── conversaciones/   # Lista + detalle de conversaciones
│   │   │   ├── leads/            # Pipeline de leads
│   │   │   └── configuracion/    # Config del bot (prompt, servicios, tono)
│   │   └── api/                  # API Routes del panel
│   │       ├── auth/             # NextAuth handlers
│   │       ├── dashboard/stats/  # Métricas
│   │       ├── conversaciones/   # CRUD conversaciones
│   │       ├── leads/            # CRUD leads
│   │       └── empresa/          # Config empresa
│   ├── components/
│   │   ├── sidebar.tsx
│   │   ├── stats-card.tsx
│   │   ├── conversation-table.tsx
│   │   ├── chat-viewer.tsx
│   │   ├── lead-table.tsx
│   │   ├── bot-config-form.tsx
│   │   └── ui/                   # Componentes shadcn/ui
│   ├── lib/
│   │   ├── db.ts                 # Pool PostgreSQL para el panel
│   │   ├── auth.ts               # Config NextAuth
│   │   └── auth.config.ts        
│   ├── middleware.ts             # Auth guard para rutas
│   └── package.json
│
├── package.json                  # Backend deps
├── tsconfig.json                 # Config TypeScript backend
└── docs/                         # Documentación y planes
```

## Base de datos

### Tablas principales

**empresas** — Cada negocio/cliente de la plataforma. Contiene config del bot (nombre, tono, productos, precios, horarios, city, instrucciones extra), plan (starter/pro/enterprise), límite de conversaciones, y contacto.

**conversaciones** — Una conversación = un hilo con un cliente. Tiene estado (activa/cerrada/transferida), nurturing_step (0-4), y flag es_hot_lead. Constraint UNIQUE(empresa_id, cliente_tel).

**mensajes** — Cada mensaje individual. Rol = 'user' o 'assistant'. Se usa para construir el historial que se envía a Claude.

**leads** — Leads extraídos de conversaciones. Nivel (bajo/medio/alto), estado (nuevo/contactado/cerrado/perdido), interés y notas.

**usuarios** — Usuarios del panel admin. Email + empresa_id + rol (admin/agente). Auth via Google OAuth matcheando email.

**citas** — Citas agendadas (pendiente de implementar integración Google Calendar).

**mensajes_programados** — Mensajes diferidos (ej: llegan de noche, se envían a las 9am).

### Relaciones

```
empresas 1──N conversaciones 1──N mensajes
empresas 1──N leads
empresas 1──N usuarios
empresas 1──N citas
conversaciones 1──1 leads (opcional)
conversaciones 1──N mensajes_programados
```

### Ejecutar schema

```bash
# Schema inicial (crear tablas + datos Beleti)
psql $DATABASE_URL -f src/db/schema.sql

# Migración nurturing (añadir campos nuevos)
psql $DATABASE_URL -f src/db/migration-001-nurturing.sql
```

## Flujo principal: mensaje entrante

1. Evolution API recibe un mensaje de WhatsApp y envía webhook POST a `/webhook`
2. El servidor extrae: teléfono del cliente, nombre (pushName), texto del mensaje
3. Busca la empresa por número de instancia de Evolution API
4. Verifica límite del plan (conv_usadas < conv_limite)
5. Obtiene o crea conversación (getOrCreateConversacion)
6. Si la conversación fue transferida a humano, ignora
7. Guarda mensaje del cliente en tabla `mensajes`
8. Si el lead estaba en nurturing y responde, resetea nurturing_step a 0
9. Recupera historial (últimos 10 mensajes)
10. Envía historial + mensaje nuevo + system prompt a Claude
11. Claude responde con texto + posibles tags ([HOT_LEAD], [WARM_LEAD], [TRANSFER_HUMAN])
12. Guarda respuesta en BD, procesa tags (crear lead, marcar hot, transferir)
13. **Delay humanizado** (variable según hora del día, más rápido para primer mensaje)
14. Si fuera de horario (22-9h), difiere mensaje para las 9:00
15. **Fragmenta** mensajes largos en chunks de 1-2 líneas con pausa entre envíos
16. Envía por WhatsApp via Evolution API
17. Si hay HOT_LEAD o TRANSFER, notifica al encargado por WhatsApp

## Sistema de tags de IA

Claude incluye tags al final de su respuesta que se extraen automáticamente:

- `[HOT_LEAD]` → Lead caliente, intención clara de compra. Se crea lead nivel "alto" y se notifica al encargado.
- `[WARM_LEAD]` → Lead tibio, interesado pero sin compromiso. Se crea lead nivel "medio".
- `[TRANSFER_HUMAN]` → El cliente pide hablar con humano o situación compleja. Se marca conversación como "transferida" y se notifica al encargado. El bot deja de responder en esa conversación.

Los tags se limpian del texto antes de enviar al cliente. El cliente NUNCA ve los tags.

## Sistema de humanización

### Delays por hora del día (humanize.service.ts)

| Hora | Delay | Razón |
|---|---|---|
| 9-14h | 20-90 segundos | Mañana: respuesta rápida |
| 14-16h | 2-6 minutos | Comida: respuesta lenta |
| 16-20h | 45s-3 minutos | Tarde: respuesta media |
| 20-22h | 1.5-5 minutos | Noche: respuesta lenta |
| 22-9h | Diferido a 9:00 | No responder de noche |

Para primer mensaje (lead nuevo), el delay máximo es 45 segundos siempre.

### Fragmentación de mensajes

Si la respuesta de Claude tiene más de 120 caracteres y más de 2 líneas, se divide en chunks de 1-2 líneas. Entre cada chunk hay una pausa de 1.5-4 segundos simulando que la persona escribe.

## Sistema de nurturing (nurturing.service.ts)

Secuencia de 4 mensajes de seguimiento para leads que no responden:

| Paso | Tiempo sin respuesta | Ángulo del mensaje |
|---|---|---|
| 1 | 30 minutos | Pregunta técnica específica sobre su coche/servicio |
| 2 | 24 horas | Prueba social: caso similar reciente |
| 3 | 72 horas (3 días) | Escasez: agenda llena, guardar hueco |
| 4 | 7 días | Cierre suave: "te dejo tranquilo, aquí estamos" |

Después del paso 4, la conversación se cierra. Si el lead responde en cualquier momento, nurturing se resetea a 0 y la conversación continúa normal.

El ciclo de nurturing corre cada 15 minutos via setInterval en index.ts. No envía entre 21-9h.

## System prompt dinámico (system-prompt.ts)

El prompt se construye dinámicamente por empresa con:
- Nombre del bot y empresa
- Tono configurable (amigable/profesional/formal)
- Catálogo de productos/servicios con precios
- Horarios de atención
- Ciudad
- Instrucciones especiales del negocio (bot_extra)
- Reglas de humanización (mensajes cortos, no menús numéricos, sin listas, tono WhatsApp)
- Manejo de objeciones predefinido
- Reglas de cualificación y escalado a humano

### Datos de prueba: Beleti Car Audio

El schema incluye un INSERT de Beleti con:
- 8 categorías de servicio: Sonido, CarPlay, Radio/Pantalla, Cámara, Luz Ambiente, Alarmas, Sound Booster
- Precios orientativos por categoría
- Instrucciones especiales: siempre pedir año y modelo antes de dar precio, interpretar números sueltos del menú antiguo

## Variables de entorno

### Backend (.env)

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@host:5432/botventas
ANTHROPIC_API_KEY=sk-ant-...
EVOLUTION_API_URL=https://tu-evolution-api.com
EVOLUTION_API_KEY=tu-api-key
EVOLUTION_INSTANCE=nombre-instancia
WEBHOOK_SECRET=opcional-para-validar-webhook
```

### Panel (.env.local)

```env
DATABASE_URL=postgresql://user:pass@host:5432/botventas
NEXTAUTH_URL=http://localhost:3001
AUTH_SECRET=genera-con-openssl-rand-base64-32
AUTH_GOOGLE_ID=google-client-id
AUTH_GOOGLE_SECRET=google-client-secret
```

## Comandos

```bash
# ── Backend ──
npm install              # Instalar deps
npm run dev              # Desarrollo con hot reload (ts-node-dev)
npm run build            # Compilar TypeScript
npm start                # Producción (node dist/index.js)
npm run db:migrate       # Ejecutar schema SQL

# ── Panel ──
cd panel
npm install
npm run dev              # Next.js en :3001
npm run build            # Build producción
```

## Convenciones de código

- TypeScript estricto en ambas partes
- Archivos de servicio: `nombre.service.ts`
- Cada servicio exporta funciones puras, no clases
- Base de datos: queries SQL directas con `pg`, NO ORM
- Nombres de tablas y campos en español (empresas, conversaciones, mensajes)
- Console.log con emojis para debugging rápido: 📩 entrada, ✅ éxito, ❌ error, 🔥 hot lead, 📞 transfer, ⏳ delay, 📤 nurturing, 📬 diferido, 🌙 fuera de horario
- Panel: tema oscuro con zinc, acentos en verde (stats), amarillo (leads), azul (mensajes)
- Componentes shadcn/ui para el panel, no crear componentes UI custom

## Qué falta por implementar

### Prioridad ALTA

1. **Integración Google Calendar** — Que el bot pueda consultar disponibilidad y agendar citas automáticamente. Requiere: Google Calendar API en el backend, flujo en el webhook que detecte cuando Claude propone cita, crear evento en calendario, enviar confirmación con dirección.

2. **Campo telefono_encargado en empresas** — Ahora las notificaciones van al whatsapp_num de la empresa. Añadir campo separado para que el encargado reciba notificaciones en su número personal.

3. **Resumen diario automático** — La función sendDailySummary existe pero no está conectada a un cron. Añadir cron a las 20:00 que envíe resumen a cada empresa activa.

4. **Testing del flujo completo** — Desplegar Evolution API, conectar webhook, enviar mensajes reales y verificar todo el ciclo: recepción → IA → delay → respuesta → nurturing → notificaciones.

### Prioridad MEDIA

5. **Mejorar el panel** — Añadir página de citas, gráficos de conversión (leads → citas → ventas), filtros por fecha, exportación CSV de leads.

6. **Multi-instancia Evolution API** — Actualmente el backend asume una sola instancia (EVOLUTION_INSTANCE). Para multi-tenant real, cada empresa necesita su propia instancia/número. El webhook debe resolver la empresa por el número receptor, no por config fija.

7. **Procesamiento de audios** — Integrar Whisper API o similar para transcribir audios de WhatsApp y procesarlos con Claude en vez de pedir que escriban.

8. **Procesamiento de imágenes** — Cuando el cliente envía foto del coche, enviarla a Claude Vision para que comente algo específico del vehículo.

### Prioridad BAJA

9. **Landing page por empresa** — Template Next.js multi-tenant para que cada negocio tenga su web con formulario de captación conectado al sistema.

10. **Integración Stripe** — Cobro automático a empresas clientes (setup + mensualidad).

11. **Onboarding self-service** — Formulario web donde un nuevo negocio se registra, configura su bot, conecta su WhatsApp, y empieza a funcionar sin intervención manual.

12. **Analytics avanzado** — Métricas de conversión por embudo (lead → contactado → cualificado → cita → venta), coste por lead, tiempo medio de respuesta, tasa de detección de bot.

## Cómo desplegar

### Opción 1: VPS (recomendada para empezar)

```bash
# En un VPS (Hetzner, DigitalOcean, etc.)
# 1. Instalar Node.js 20+, PostgreSQL, nginx
# 2. Clonar repo
# 3. Configurar .env
# 4. Ejecutar schema SQL
# 5. Instalar Evolution API (Docker)
# 6. Configurar webhook de Evolution API apuntando a http://localhost:3000/webhook
# 7. pm2 start dist/index.js --name botventas
# 8. Panel: Vercel (connect GitHub repo, root directory: panel/)
```

### Opción 2: Railway/Render + Supabase + Vercel

```bash
# Backend: Railway o Render (Node.js service)
# BD: Supabase (PostgreSQL managed)
# Panel: Vercel (Next.js auto-detect, root: panel/)
# Evolution API: VPS separado con Docker
```

## Contexto de negocio

Este proyecto es tanto la herramienta interna de Beleti Car Audio como el producto que se venderá a otros negocios locales. El modelo de negocio futuro:

- **Setup**: €300-500 por negocio (configuración del bot, prompt, conexión WhatsApp)
- **Mensualidad**: €99-299/mes según plan (starter: 500 convs, pro: 2000 convs, enterprise: ilimitado)
- **Nichos objetivo**: Car audio, detailing, talleres mecánicos, clínicas dentales, peluquerías premium, centros de estética, inmobiliarias, academias

El valor diferencial vs competidores como Zap Voice: conversación natural con IA (no menús "Digite 1, 2, 3"), cualificación automática, seguimiento inteligente, y humanización que hace que el cliente no detecte que habla con un bot.
