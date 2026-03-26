-- ============================================
-- BOTVENTAS AI - Migración 002: Tabla citas
-- Citas agendadas automáticamente por el bot
-- ============================================

CREATE TABLE IF NOT EXISTS citas (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id       UUID REFERENCES empresas(id) ON DELETE CASCADE,
  conv_id          UUID REFERENCES conversaciones(id),
  cliente_tel      VARCHAR(20)  NOT NULL,
  cliente_nombre   VARCHAR(100),
  servicio         TEXT,
  vehiculo         TEXT,
  fecha_hora       TIMESTAMP    NOT NULL,
  google_event_id  TEXT,
  google_event_url TEXT,
  estado           VARCHAR(20)  DEFAULT 'pendiente'
                   CHECK (estado IN ('pendiente', 'confirmada', 'cancelada', 'completada')),
  notas            TEXT,
  creado_en        TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_citas_empresa ON citas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_citas_fecha   ON citas(fecha_hora);
