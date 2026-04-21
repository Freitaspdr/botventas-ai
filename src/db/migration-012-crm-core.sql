-- migration-012: core CRM reusable
-- - contactos como entidad central
-- - crm_api_token por empresa
-- - soporte de mensajes humanos desde el panel/API

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS crm_api_token VARCHAR(64);

UPDATE empresas
SET crm_api_token = md5(uuid_generate_v4()::text || clock_timestamp()::text || whatsapp_num)
WHERE crm_api_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_empresas_crm_token
  ON empresas(crm_api_token)
  WHERE crm_api_token IS NOT NULL;

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_contactos_empresa_tel
  ON contactos(empresa_id, telefono);

CREATE INDEX IF NOT EXISTS idx_contactos_empresa
  ON contactos(empresa_id);

ALTER TABLE conversaciones
  ADD COLUMN IF NOT EXISTS contacto_id UUID REFERENCES contactos(id) ON DELETE SET NULL;

ALTER TABLE conversaciones
  ADD COLUMN IF NOT EXISTS remote_jid VARCHAR(100);

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS contacto_id UUID REFERENCES contactos(id) ON DELETE SET NULL;

ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS contacto_id UUID REFERENCES contactos(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'mensajes'
      AND constraint_name = 'mensajes_rol_check'
  ) THEN
    ALTER TABLE mensajes DROP CONSTRAINT mensajes_rol_check;
  END IF;
END $$;

ALTER TABLE mensajes
  ADD CONSTRAINT mensajes_rol_check
  CHECK (rol IN ('user', 'assistant', 'human'));

INSERT INTO contactos (
  empresa_id,
  telefono,
  nombre,
  ultimo_mensaje_en,
  ultima_interaccion_en,
  creado_en,
  actualizado_en
)
SELECT
  data.empresa_id,
  data.telefono,
  MAX(data.nombre) FILTER (WHERE COALESCE(data.nombre, '') <> ''),
  MAX(data.ultimo_mensaje_en),
  MAX(data.ultima_interaccion_en),
  MIN(data.creado_en),
  NOW()
FROM (
  SELECT
    c.empresa_id,
    c.cliente_tel AS telefono,
    c.cliente_nombre AS nombre,
    (
      SELECT MAX(m.enviado_en)
      FROM mensajes m
      WHERE m.conv_id = c.id
    ) AS ultimo_mensaje_en,
    c.actualizada_en AS ultima_interaccion_en,
    c.creado_en
  FROM conversaciones c

  UNION ALL

  SELECT
    l.empresa_id,
    l.cliente_tel AS telefono,
    l.cliente_nombre AS nombre,
    NULL::timestamp AS ultimo_mensaje_en,
    l.actualizado_en AS ultima_interaccion_en,
    l.creado_en
  FROM leads l

  UNION ALL

  SELECT
    ci.empresa_id,
    ci.cliente_tel AS telefono,
    ci.cliente_nombre AS nombre,
    NULL::timestamp AS ultimo_mensaje_en,
    ci.fecha_hora AS ultima_interaccion_en,
    ci.creado_en
  FROM citas ci
) AS data
WHERE COALESCE(data.telefono, '') <> ''
GROUP BY data.empresa_id, data.telefono
ON CONFLICT (empresa_id, telefono) DO UPDATE
SET
  nombre = COALESCE(contactos.nombre, EXCLUDED.nombre),
  ultimo_mensaje_en = COALESCE(
    GREATEST(contactos.ultimo_mensaje_en, EXCLUDED.ultimo_mensaje_en),
    contactos.ultimo_mensaje_en,
    EXCLUDED.ultimo_mensaje_en
  ),
  ultima_interaccion_en = COALESCE(
    GREATEST(contactos.ultima_interaccion_en, EXCLUDED.ultima_interaccion_en),
    contactos.ultima_interaccion_en,
    EXCLUDED.ultima_interaccion_en
  ),
  actualizado_en = NOW();

UPDATE conversaciones c
SET contacto_id = ct.id
FROM contactos ct
WHERE ct.empresa_id = c.empresa_id
  AND ct.telefono = c.cliente_tel
  AND (c.contacto_id IS NULL OR c.contacto_id <> ct.id);

UPDATE leads l
SET contacto_id = ct.id
FROM contactos ct
WHERE ct.empresa_id = l.empresa_id
  AND ct.telefono = l.cliente_tel
  AND (l.contacto_id IS NULL OR l.contacto_id <> ct.id);

UPDATE citas ci
SET contacto_id = ct.id
FROM contactos ct
WHERE ct.empresa_id = ci.empresa_id
  AND ct.telefono = ci.cliente_tel
  AND (ci.contacto_id IS NULL OR ci.contacto_id <> ct.id);

WITH ranked_leads AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY empresa_id, cliente_tel
      ORDER BY
        CASE nivel
          WHEN 'alto' THEN 3
          WHEN 'medio' THEN 2
          ELSE 1
        END DESC,
        actualizado_en DESC,
        creado_en DESC,
        id DESC
    ) AS rn
  FROM leads
)
DELETE FROM leads l
USING ranked_leads r
WHERE l.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_empresa_tel
  ON leads(empresa_id, cliente_tel);

CREATE INDEX IF NOT EXISTS idx_conversaciones_contacto
  ON conversaciones(contacto_id);

CREATE INDEX IF NOT EXISTS idx_leads_contacto
  ON leads(contacto_id);

CREATE INDEX IF NOT EXISTS idx_citas_contacto
  ON citas(contacto_id);
