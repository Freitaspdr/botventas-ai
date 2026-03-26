-- ============================================
-- MIGRACIÓN: Nurturing + Notificaciones + Citas
-- Ejecutar sobre el schema existente
-- ============================================

-- Campo de nurturing en conversaciones
ALTER TABLE conversaciones
  ADD COLUMN IF NOT EXISTS nurturing_step INTEGER DEFAULT 0;

-- Campo para teléfono del encargado (notificaciones)
ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS telefono_encargado VARCHAR(20),
  ADD COLUMN IF NOT EXISTS notif_hot_lead BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_transfer BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_new_lead BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notif_resumen_diario BOOLEAN DEFAULT true;

-- ============================================
-- TABLA: citas
-- ============================================
CREATE TABLE IF NOT EXISTS citas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID REFERENCES empresas(id) ON DELETE CASCADE,
  conv_id         UUID REFERENCES conversaciones(id),
  cliente_tel     VARCHAR(20) NOT NULL,
  cliente_nombre  VARCHAR(100),
  fecha_hora      TIMESTAMP NOT NULL,
  servicio        TEXT,
  vehiculo        TEXT,
  estado          VARCHAR(20) DEFAULT 'confirmada' CHECK (estado IN ('confirmada', 'cancelada', 'completada', 'no_show')),
  recordatorio_48h BOOLEAN DEFAULT false,
  recordatorio_2h  BOOLEAN DEFAULT false,
  notas           TEXT,
  creado_en       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_citas_empresa ON citas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha_hora);

-- ============================================
-- TABLA: mensajes_programados
-- Para nurturing diferido (mensajes nocturnos)
-- ============================================
CREATE TABLE IF NOT EXISTS mensajes_programados (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conv_id         UUID REFERENCES conversaciones(id) ON DELETE CASCADE,
  cliente_tel     VARCHAR(20) NOT NULL,
  contenido       TEXT NOT NULL,
  enviar_en       TIMESTAMP NOT NULL,
  enviado         BOOLEAN DEFAULT false,
  creado_en       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_programados_enviar ON mensajes_programados(enviar_en) WHERE NOT enviado;

-- ============================================
-- VISTA: resumen diario por empresa
-- ============================================
CREATE OR REPLACE VIEW v_resumen_diario AS
SELECT
  e.id AS empresa_id,
  e.nombre AS empresa_nombre,
  (SELECT COUNT(*) FROM conversaciones c WHERE c.empresa_id = e.id AND c.iniciada_en::date = CURRENT_DATE) AS convs_hoy,
  (SELECT COUNT(*) FROM mensajes m JOIN conversaciones c ON m.conv_id = c.id WHERE c.empresa_id = e.id AND m.enviado_en::date = CURRENT_DATE) AS msgs_hoy,
  (SELECT COUNT(*) FROM leads l WHERE l.empresa_id = e.id AND l.creado_en::date = CURRENT_DATE) AS leads_hoy,
  (SELECT COUNT(*) FROM leads l WHERE l.empresa_id = e.id AND l.creado_en::date = CURRENT_DATE AND l.nivel = 'alto') AS hot_leads_hoy,
  (SELECT COUNT(*) FROM citas ci WHERE ci.empresa_id = e.id AND ci.fecha_hora::date = CURRENT_DATE) AS citas_hoy,
  e.conv_usadas,
  e.conv_limite
FROM empresas e
WHERE e.activo = true;
