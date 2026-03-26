-- ============================================
-- BOTVENTAS AI - Migración 005: Sincronizar BD con el código real
-- Seguro de ejecutar varias veces (IF EXISTS / IF NOT EXISTS)
-- ============================================

-- ── conversaciones: renombrar iniciada_en → creado_en ────────────────────
-- El código usa creado_en, el schema original tenía iniciada_en
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='conversaciones' AND column_name='iniciada_en'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='conversaciones' AND column_name='creado_en'
  ) THEN
    ALTER TABLE conversaciones RENAME COLUMN iniciada_en TO creado_en;
  END IF;
END $$;

-- Por si no existe ninguna de las dos (BD nueva)
ALTER TABLE conversaciones ADD COLUMN IF NOT EXISTS creado_en TIMESTAMP DEFAULT NOW();

-- ── leads: añadir columnas que usa el panel ───────────────────────────────
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS score           INTEGER   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ticket_estimado INTEGER,
  ADD COLUMN IF NOT EXISTS vehiculo        TEXT,
  ADD COLUMN IF NOT EXISTS actualizado_en  TIMESTAMP DEFAULT NOW();

-- ── usuarios: password_hash para auth con email+contraseña ───────────────
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- ── citas: añadir campos de Google Calendar + no_show ────────────────────
ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS google_event_id  TEXT,
  ADD COLUMN IF NOT EXISTS google_event_url TEXT;

-- Actualizar CHECK para incluir no_show (seguro si no existe constraint)
DO $$
BEGIN
  ALTER TABLE citas DROP CONSTRAINT IF EXISTS citas_estado_check;
  ALTER TABLE citas ADD CONSTRAINT citas_estado_check
    CHECK (estado IN ('pendiente', 'confirmada', 'cancelada', 'completada', 'no_show'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- ── Actualizar vista v_resumen_diario para usar creado_en ─────────────────
CREATE OR REPLACE VIEW v_resumen_diario AS
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
