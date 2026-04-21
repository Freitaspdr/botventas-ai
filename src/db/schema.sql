-- ============================================
-- BOTVENTAS AI - Database Schema
-- PostgreSQL / Supabase
-- Latest state after CRM core changes
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- empresas
-- ============================================
CREATE TABLE IF NOT EXISTS empresas (
  id                 UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre             VARCHAR(100) NOT NULL,
  whatsapp_num       VARCHAR(20)  UNIQUE NOT NULL,
  crm_api_token      VARCHAR(64)  UNIQUE,
  plan               VARCHAR(20)  DEFAULT 'starter'
                     CHECK (plan IN ('starter', 'pro', 'enterprise')),
  activo             BOOLEAN      DEFAULT true,

  bot_nombre         VARCHAR(50)  DEFAULT 'Asistente',
  bot_tono           VARCHAR(20)  DEFAULT 'amigable'
                     CHECK (bot_tono IN ('amigable', 'profesional', 'formal')),
  bot_objetivo       TEXT,
  bot_productos      TEXT,
  bot_horarios       TEXT,
  bot_ciudad         VARCHAR(100),
  bot_extra          TEXT,

  conv_limite        INTEGER      DEFAULT 500,
  conv_usadas        INTEGER      DEFAULT 0,

  email_contacto     VARCHAR(200),
  encargado_tel      VARCHAR(20),

  notif_hot_leads    BOOLEAN      DEFAULT true,
  notif_transfers    BOOLEAN      DEFAULT true,
  notif_nuevos       BOOLEAN      DEFAULT false,
  notif_resumen      BOOLEAN      DEFAULT true,

  evolution_instance VARCHAR(100),
  evolution_api_url  VARCHAR(255),
  evolution_api_key  VARCHAR(255),

  creado_en          TIMESTAMP    DEFAULT NOW(),
  actualizado_en     TIMESTAMP    DEFAULT NOW()
);

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS crm_api_token VARCHAR(64);

-- ============================================
-- contactos
-- ============================================
CREATE TABLE IF NOT EXISTS contactos (
  id                    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id            UUID         NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  telefono              VARCHAR(20)  NOT NULL,
  nombre                VARCHAR(100),
  canal                 VARCHAR(20)  DEFAULT 'whatsapp'
                        CHECK (canal IN ('whatsapp')),
  estado                VARCHAR(20)  DEFAULT 'activo'
                        CHECK (estado IN ('activo', 'archivado', 'bloqueado')),
  origen                VARCHAR(30)  DEFAULT 'bot'
                        CHECK (origen IN ('bot', 'humano', 'importado', 'api')),
  notas                 TEXT,
  etiquetas             TEXT[]       DEFAULT ARRAY[]::TEXT[],
  ultimo_mensaje_en     TIMESTAMP,
  ultima_interaccion_en TIMESTAMP    DEFAULT NOW(),
  creado_en             TIMESTAMP    DEFAULT NOW(),
  actualizado_en        TIMESTAMP    DEFAULT NOW()
);

-- ============================================
-- conversaciones
-- ============================================
CREATE TABLE IF NOT EXISTS conversaciones (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID        REFERENCES empresas(id) ON DELETE CASCADE,
  contacto_id     UUID        REFERENCES contactos(id) ON DELETE SET NULL,
  cliente_tel     VARCHAR(20) NOT NULL,
  cliente_nombre  VARCHAR(100),
  remote_jid      VARCHAR(100),
  estado          VARCHAR(20) DEFAULT 'activa'
                  CHECK (estado IN ('activa', 'cerrada', 'transferida')),
  es_hot_lead     BOOLEAN     DEFAULT false,
  resumen         TEXT,
  nurturing_step  INTEGER     DEFAULT 0,
  creado_en       TIMESTAMP   DEFAULT NOW(),
  actualizada_en  TIMESTAMP   DEFAULT NOW()
);

ALTER TABLE conversaciones
  ADD COLUMN IF NOT EXISTS contacto_id UUID REFERENCES contactos(id) ON DELETE SET NULL;

ALTER TABLE conversaciones
  ADD COLUMN IF NOT EXISTS remote_jid VARCHAR(100);

-- ============================================
-- mensajes
-- ============================================
CREATE TABLE IF NOT EXISTS mensajes (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  conv_id     UUID        REFERENCES conversaciones(id) ON DELETE CASCADE,
  rol         VARCHAR(10) CHECK (rol IN ('user', 'assistant', 'human')),
  contenido   TEXT        NOT NULL,
  enviado_en  TIMESTAMP   DEFAULT NOW()
);

-- ============================================
-- leads
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id       UUID        REFERENCES empresas(id) ON DELETE CASCADE,
  contacto_id      UUID        REFERENCES contactos(id) ON DELETE SET NULL,
  conv_id          UUID        REFERENCES conversaciones(id),
  cliente_tel      VARCHAR(20) NOT NULL,
  cliente_nombre   VARCHAR(100),
  nivel            VARCHAR(10) DEFAULT 'medio'
                   CHECK (nivel IN ('bajo', 'medio', 'alto')),
  interes          TEXT,
  notas            TEXT,
  estado           VARCHAR(20) DEFAULT 'nuevo'
                   CHECK (estado IN ('nuevo', 'contactado', 'cerrado', 'perdido')),
  score            INTEGER     DEFAULT 0,
  ticket_estimado  INTEGER,
  vehiculo         TEXT,
  creado_en        TIMESTAMP   DEFAULT NOW(),
  actualizado_en   TIMESTAMP   DEFAULT NOW()
);

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS contacto_id UUID REFERENCES contactos(id) ON DELETE SET NULL;

-- ============================================
-- usuarios
-- ============================================
CREATE TABLE IF NOT EXISTS usuarios (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id    UUID         REFERENCES empresas(id) ON DELETE CASCADE,
  email         VARCHAR(200) UNIQUE NOT NULL,
  nombre        VARCHAR(100),
  rol           VARCHAR(20)  DEFAULT 'admin'
                CHECK (rol IN ('superadmin', 'admin', 'agente')),
  activo        BOOLEAN      DEFAULT true,
  password_hash TEXT,
  creado_en     TIMESTAMP    DEFAULT NOW()
);

-- ============================================
-- citas
-- ============================================
CREATE TABLE IF NOT EXISTS citas (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id       UUID        REFERENCES empresas(id) ON DELETE CASCADE,
  contacto_id      UUID        REFERENCES contactos(id) ON DELETE SET NULL,
  conv_id          UUID        REFERENCES conversaciones(id),
  cliente_tel      VARCHAR(20) NOT NULL,
  cliente_nombre   VARCHAR(100),
  servicio         TEXT,
  vehiculo         TEXT,
  fecha_hora       TIMESTAMP   NOT NULL,
  google_event_id  TEXT,
  google_event_url TEXT,
  estado           VARCHAR(20) DEFAULT 'pendiente'
                   CHECK (estado IN ('pendiente', 'confirmada', 'cancelada', 'completada', 'no_show')),
  notas            TEXT,
  creado_en        TIMESTAMP   DEFAULT NOW()
);

ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS contacto_id UUID REFERENCES contactos(id) ON DELETE SET NULL;

-- ============================================
-- mensajes_programados
-- ============================================
CREATE TABLE IF NOT EXISTS mensajes_programados (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  conv_id     UUID         REFERENCES conversaciones(id) ON DELETE CASCADE,
  cliente_tel VARCHAR(20)  NOT NULL,
  remote_jid  VARCHAR(100),
  contenido   TEXT         NOT NULL,
  enviar_en   TIMESTAMP    NOT NULL,
  enviado     BOOLEAN      DEFAULT false,
  creado_en   TIMESTAMP    DEFAULT NOW()
);

-- ============================================
-- indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_empresas_whatsapp         ON empresas(whatsapp_num);
CREATE UNIQUE INDEX IF NOT EXISTS idx_empresas_evolution ON empresas(evolution_instance)
  WHERE evolution_instance IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_empresas_crm_token ON empresas(crm_api_token)
  WHERE crm_api_token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contactos_empresa_tel ON contactos(empresa_id, telefono);
CREATE INDEX IF NOT EXISTS idx_contactos_empresa            ON contactos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contactos_interaccion        ON contactos(ultima_interaccion_en DESC);

CREATE INDEX IF NOT EXISTS idx_conversaciones_empresa    ON conversaciones(empresa_id);
CREATE INDEX IF NOT EXISTS idx_conversaciones_contacto   ON conversaciones(contacto_id);
CREATE INDEX IF NOT EXISTS idx_conversaciones_tel        ON conversaciones(cliente_tel);
CREATE INDEX IF NOT EXISTS idx_conversaciones_nurturing  ON conversaciones(nurturing_step)
  WHERE estado = 'activa';
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversaciones_empresa_tel_activa
  ON conversaciones(empresa_id, cliente_tel)
  WHERE estado = 'activa';

CREATE INDEX IF NOT EXISTS idx_mensajes_conv             ON mensajes(conv_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_enviado          ON mensajes(enviado_en);

CREATE INDEX IF NOT EXISTS idx_leads_empresa             ON leads(empresa_id);
CREATE INDEX IF NOT EXISTS idx_leads_contacto            ON leads(contacto_id);

CREATE INDEX IF NOT EXISTS idx_citas_empresa             ON citas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_citas_contacto            ON citas(contacto_id);
CREATE INDEX IF NOT EXISTS idx_citas_fecha               ON citas(fecha_hora);

CREATE INDEX IF NOT EXISTS idx_programados_pendientes    ON mensajes_programados(enviar_en)
  WHERE enviado = false;

-- ============================================
-- views
-- ============================================
CREATE OR REPLACE VIEW v_resumen_diario
  WITH (security_invoker = true)
AS
SELECT
  e.id AS empresa_id,
  e.nombre AS empresa_nombre,
  (SELECT COUNT(*) FROM conversaciones c
   WHERE c.empresa_id = e.id AND c.creado_en::date = CURRENT_DATE) AS convs_hoy,
  (SELECT COUNT(*) FROM mensajes m
   JOIN conversaciones c ON m.conv_id = c.id
   WHERE c.empresa_id = e.id AND m.enviado_en::date = CURRENT_DATE) AS msgs_hoy,
  (SELECT COUNT(*) FROM leads l
   WHERE l.empresa_id = e.id AND l.creado_en::date = CURRENT_DATE) AS leads_hoy,
  (SELECT COUNT(*) FROM leads l
   WHERE l.empresa_id = e.id AND l.creado_en::date = CURRENT_DATE AND l.nivel = 'alto') AS hot_leads_hoy,
  (SELECT COUNT(*) FROM citas ci
   WHERE ci.empresa_id = e.id AND ci.fecha_hora::date = CURRENT_DATE) AS citas_hoy,
  e.conv_usadas,
  e.conv_limite
FROM empresas e
WHERE e.activo = true;
