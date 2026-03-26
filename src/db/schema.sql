-- ============================================
-- BOTVENTAS AI - Esquema de Base de Datos
-- PostgreSQL / Supabase
-- Estado: post migration-005 (estado real de la BD)
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLA: empresas
-- ============================================
CREATE TABLE IF NOT EXISTS empresas (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre             VARCHAR(100) NOT NULL,
  whatsapp_num       VARCHAR(20)  UNIQUE NOT NULL,
  plan               VARCHAR(20)  DEFAULT 'starter'
                     CHECK (plan IN ('starter', 'pro', 'enterprise')),
  activo             BOOLEAN      DEFAULT true,

  -- Config del bot
  bot_nombre         VARCHAR(50)  DEFAULT 'Asistente',
  bot_tono           VARCHAR(20)  DEFAULT 'amigable'
                     CHECK (bot_tono IN ('amigable', 'profesional', 'formal')),
  bot_objetivo       TEXT,
  bot_productos      TEXT,
  bot_horarios       TEXT,
  bot_ciudad         VARCHAR(100),
  bot_extra          TEXT,

  -- Límites del plan
  conv_limite        INTEGER      DEFAULT 500,
  conv_usadas        INTEGER      DEFAULT 0,

  -- Contacto
  email_contacto     VARCHAR(200),
  encargado_tel      VARCHAR(20),     -- Tel. encargado para notificaciones (distinto del bot)

  -- Notificaciones WhatsApp al encargado
  notif_hot_leads    BOOLEAN      DEFAULT true,   -- Avisar cuando hay hot lead
  notif_transfers    BOOLEAN      DEFAULT true,   -- Avisar cuando el bot transfiere
  notif_nuevos       BOOLEAN      DEFAULT false,  -- Avisar en cada nueva conversación
  notif_resumen      BOOLEAN      DEFAULT true,   -- Resumen diario a las 20:00h

  -- Multi-instancia Evolution API
  evolution_instance VARCHAR(100),  -- Nombre de instancia (ej: "beleti-bot")

  creado_en          TIMESTAMP    DEFAULT NOW(),
  actualizado_en     TIMESTAMP    DEFAULT NOW()
);

-- ============================================
-- TABLA: conversaciones
-- ============================================
CREATE TABLE IF NOT EXISTS conversaciones (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID        REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_tel     VARCHAR(20) NOT NULL,
  cliente_nombre  VARCHAR(100),
  estado          VARCHAR(20) DEFAULT 'activa'
                  CHECK (estado IN ('activa', 'cerrada', 'transferida')),
  es_hot_lead     BOOLEAN     DEFAULT false,
  resumen         TEXT,
  nurturing_step  INTEGER     DEFAULT 0,   -- 0-4: paso actual de seguimiento automático
  creado_en       TIMESTAMP   DEFAULT NOW(),
  actualizada_en  TIMESTAMP   DEFAULT NOW(),
  UNIQUE(empresa_id, cliente_tel)
);

-- ============================================
-- TABLA: mensajes
-- ============================================
CREATE TABLE IF NOT EXISTS mensajes (
  id          UUID       PRIMARY KEY DEFAULT uuid_generate_v4(),
  conv_id     UUID       REFERENCES conversaciones(id) ON DELETE CASCADE,
  rol         VARCHAR(10) CHECK (rol IN ('user', 'assistant')),
  contenido   TEXT        NOT NULL,
  enviado_en  TIMESTAMP   DEFAULT NOW()
);

-- ============================================
-- TABLA: leads
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id       UUID        REFERENCES empresas(id) ON DELETE CASCADE,
  conv_id          UUID        REFERENCES conversaciones(id),
  cliente_tel      VARCHAR(20) NOT NULL,
  cliente_nombre   VARCHAR(100),
  nivel            VARCHAR(10) DEFAULT 'medio'
                   CHECK (nivel IN ('bajo', 'medio', 'alto')),
  interes          TEXT,
  notas            TEXT,
  estado           VARCHAR(20) DEFAULT 'nuevo'
                   CHECK (estado IN ('nuevo', 'contactado', 'cerrado', 'perdido')),
  score            INTEGER     DEFAULT 0,     -- Puntuación 0-100 del lead
  ticket_estimado  INTEGER,                   -- Valor estimado de la venta (€)
  vehiculo         TEXT,                      -- Modelo/año del vehículo del cliente
  creado_en        TIMESTAMP   DEFAULT NOW(),
  actualizado_en   TIMESTAMP   DEFAULT NOW()
);

-- ============================================
-- TABLA: usuarios
-- ============================================
CREATE TABLE IF NOT EXISTS usuarios (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id    UUID        REFERENCES empresas(id) ON DELETE CASCADE,
  email         VARCHAR(200) UNIQUE NOT NULL,
  nombre        VARCHAR(100),
  rol           VARCHAR(20) DEFAULT 'admin'
                CHECK (rol IN ('admin', 'agente')),
  activo        BOOLEAN     DEFAULT true,
  password_hash TEXT,       -- bcrypt hash para auth con email+contraseña
  creado_en     TIMESTAMP   DEFAULT NOW()
);

-- ============================================
-- TABLA: citas
-- ============================================
CREATE TABLE IF NOT EXISTS citas (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id       UUID        REFERENCES empresas(id) ON DELETE CASCADE,
  conv_id          UUID        REFERENCES conversaciones(id),
  cliente_tel      VARCHAR(20) NOT NULL,
  cliente_nombre   VARCHAR(100),
  servicio         TEXT,
  vehiculo         TEXT,
  fecha_hora       TIMESTAMP   NOT NULL,
  google_event_id  TEXT,       -- ID del evento en Google Calendar
  google_event_url TEXT,       -- URL del evento en Google Calendar
  estado           VARCHAR(20) DEFAULT 'pendiente'
                   CHECK (estado IN ('pendiente', 'confirmada', 'cancelada', 'completada', 'no_show')),
  notas            TEXT,
  creado_en        TIMESTAMP   DEFAULT NOW()
);

-- ============================================
-- TABLA: mensajes_programados
-- Mensajes diferidos (ej: nocturnos para enviar a las 9am)
-- ============================================
CREATE TABLE IF NOT EXISTS mensajes_programados (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  conv_id     UUID        REFERENCES conversaciones(id) ON DELETE CASCADE,
  cliente_tel VARCHAR(20) NOT NULL,
  contenido   TEXT        NOT NULL,
  enviar_en   TIMESTAMP   NOT NULL,
  enviado     BOOLEAN     DEFAULT false,
  creado_en   TIMESTAMP   DEFAULT NOW()
);

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_empresas_whatsapp          ON empresas(whatsapp_num);
CREATE UNIQUE INDEX IF NOT EXISTS idx_empresas_evolution  ON empresas(evolution_instance)
  WHERE evolution_instance IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversaciones_empresa     ON conversaciones(empresa_id);
CREATE INDEX IF NOT EXISTS idx_conversaciones_tel         ON conversaciones(cliente_tel);
CREATE INDEX IF NOT EXISTS idx_conversaciones_nurturing   ON conversaciones(nurturing_step)
  WHERE estado = 'activa';

CREATE INDEX IF NOT EXISTS idx_mensajes_conv              ON mensajes(conv_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_enviado           ON mensajes(enviado_en);

CREATE INDEX IF NOT EXISTS idx_leads_empresa              ON leads(empresa_id);

CREATE INDEX IF NOT EXISTS idx_citas_empresa              ON citas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_citas_fecha                ON citas(fecha_hora);

CREATE INDEX IF NOT EXISTS idx_programados_pendientes     ON mensajes_programados(enviar_en)
  WHERE enviado = false;

-- ============================================
-- VISTA: resumen diario por empresa
-- ============================================
CREATE OR REPLACE VIEW v_resumen_diario
  WITH (security_invoker = true)
AS
SELECT
  e.id            AS empresa_id,
  e.nombre        AS empresa_nombre,
  (SELECT COUNT(*) FROM conversaciones c
   WHERE c.empresa_id = e.id AND c.creado_en::date = CURRENT_DATE)        AS convs_hoy,
  (SELECT COUNT(*) FROM mensajes m
   JOIN conversaciones c ON m.conv_id = c.id
   WHERE c.empresa_id = e.id AND m.enviado_en::date = CURRENT_DATE)       AS msgs_hoy,
  (SELECT COUNT(*) FROM leads l
   WHERE l.empresa_id = e.id AND l.creado_en::date = CURRENT_DATE)        AS leads_hoy,
  (SELECT COUNT(*) FROM leads l
   WHERE l.empresa_id = e.id AND l.creado_en::date = CURRENT_DATE
     AND l.nivel = 'alto')                                                 AS hot_leads_hoy,
  (SELECT COUNT(*) FROM citas ci
   WHERE ci.empresa_id = e.id AND ci.fecha_hora::date = CURRENT_DATE)     AS citas_hoy,
  e.conv_usadas,
  e.conv_limite
FROM empresas e
WHERE e.activo = true;

-- ============================================
-- DATOS DE PRUEBA — BELETI CAR AUDIO
-- Reemplaza whatsapp_num y evolution_instance con los valores reales
-- ============================================
INSERT INTO empresas (
  nombre, whatsapp_num, plan,
  bot_nombre, bot_tono, bot_objetivo,
  bot_productos, bot_horarios, bot_ciudad, bot_extra,
  email_contacto
) VALUES (
  'Beleti Car Audio',
  '521TUNUMERODEWHATSAPP',
  'pro',
  'Carlos',
  'amigable',
  'Asesorar a clientes sobre instalación de audio y accesorios para autos, resolver sus dudas y agendar una cita para revisión o instalación.',
  '🔊 SONIDO:
  - Cambio de altavoces (bocinas): instalación de bocinas de alta calidad
  - Sonido interior completo: sistema envolvente dentro del habitáculo
  - Mejora de sonido: optimización del sistema existente
  - Personalizado: sistema a medida según presupuesto y gusto
  - Solo instalación: el cliente trae sus propios equipos

📱 CARPLAY / ANDROID AUTO:
  - Pantallas con CarPlay inalámbrico y Android Auto
  - Compatible con la mayoría de modelos de autos

📻 RADIO SENCILLA:
  - Radios 1 DIN y 2 DIN con Bluetooth, USB y AUX

🖥️ PANTALLA:
  - Pantallas táctiles 7", 9" y 10" con GPS integrado
  - Instalación profesional con arnés original del auto

📷 CÁMARA:
  - Cámara de reversa
  - Cámara 360° (4 cámaras)
  - Instalación y calibración incluida

💡 LUZ AMBIENTE:
  - Tiras LED interiores con control por app
  - Kits de 64 colores RGB sincronizados con música

🚨 ALARMAS:
  - Alarma básica con control remoto
  - Alarma con rastreo GPS
  - Alarma con arranque a distancia

🔋 SOUND BOOSTER:
  - Amplificadores de potencia
  - Subwoofers e instalación de cajón
  - Condensadores y capacitores para sistemas grandes',
  'Lunes a Sábado 9am-7pm, Domingos previa cita',
  'España',
  'FLUJO DE ATENCIÓN PARA PRESUPUESTOS:
Cuando el cliente quiera un servicio, SIEMPRE debes recopilar esta información antes de dar precio:
1. Año y modelo del coche (ej: "BMW Serie 3 2020")
2. Qué servicio específico necesita
3. Si trae su propio equipo o necesita que nosotros lo suministremos

Una vez tengas esa info, responde con:
- Una estimación de precio orientativa si la conoces
- Confirmación de que le agendes una cita para presupuesto exacto y sin compromiso

IMPORTANTE: Los precios varían según el modelo del coche porque algunos requieren adaptadores o arneses especiales. Siempre aclara esto.

Si el cliente solo responde con el número del menú anterior (ej: "1", "3"), interpreta qué servicio corresponde según el contexto de la conversación.',
  'info@beleti.es'
) ON CONFLICT (whatsapp_num) DO NOTHING;
