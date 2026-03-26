-- ============================================
-- BOTVENTAS AI - Migración 004: Unificar campos de notificaciones
-- Renombra columnas de migration-001 a los nombres que usa el código
-- Seguro de ejecutar varias veces (IF EXISTS / IF NOT EXISTS)
-- ============================================

-- ── Renombrar telefono_encargado → encargado_tel ──────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='empresas' AND column_name='telefono_encargado'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='empresas' AND column_name='encargado_tel'
  ) THEN
    ALTER TABLE empresas RENAME COLUMN telefono_encargado TO encargado_tel;
  END IF;
END $$;

-- Si no existe ninguna de las dos, la creamos
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS encargado_tel VARCHAR(20);

-- ── notif_hot_lead → notif_hot_leads ─────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='empresas' AND column_name='notif_hot_lead'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='empresas' AND column_name='notif_hot_leads'
  ) THEN
    ALTER TABLE empresas RENAME COLUMN notif_hot_lead TO notif_hot_leads;
  END IF;
END $$;

ALTER TABLE empresas ADD COLUMN IF NOT EXISTS notif_hot_leads BOOLEAN DEFAULT true;

-- ── notif_transfer → notif_transfers ─────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='empresas' AND column_name='notif_transfer'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='empresas' AND column_name='notif_transfers'
  ) THEN
    ALTER TABLE empresas RENAME COLUMN notif_transfer TO notif_transfers;
  END IF;
END $$;

ALTER TABLE empresas ADD COLUMN IF NOT EXISTS notif_transfers BOOLEAN DEFAULT true;

-- ── notif_new_lead → notif_nuevos ─────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='empresas' AND column_name='notif_new_lead'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='empresas' AND column_name='notif_nuevos'
  ) THEN
    ALTER TABLE empresas RENAME COLUMN notif_new_lead TO notif_nuevos;
  END IF;
END $$;

ALTER TABLE empresas ADD COLUMN IF NOT EXISTS notif_nuevos BOOLEAN DEFAULT false;

-- ── notif_resumen_diario → notif_resumen ──────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='empresas' AND column_name='notif_resumen_diario'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='empresas' AND column_name='notif_resumen'
  ) THEN
    ALTER TABLE empresas RENAME COLUMN notif_resumen_diario TO notif_resumen;
  END IF;
END $$;

ALTER TABLE empresas ADD COLUMN IF NOT EXISTS notif_resumen BOOLEAN DEFAULT true;

-- ── Añadir 'pendiente' al CHECK de citas.estado ───────────────────────────
-- La migration-001 no incluía 'pendiente' como estado válido
DO $$
BEGIN
  ALTER TABLE citas DROP CONSTRAINT IF EXISTS citas_estado_check;
  ALTER TABLE citas ADD CONSTRAINT citas_estado_check
    CHECK (estado IN ('pendiente', 'confirmada', 'cancelada', 'completada', 'no_show'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- Comentarios
COMMENT ON COLUMN empresas.encargado_tel   IS 'Teléfono del encargado para notificaciones (distinto del WhatsApp del negocio)';
COMMENT ON COLUMN empresas.notif_hot_leads IS 'Notificar cuando se detecta hot lead';
COMMENT ON COLUMN empresas.notif_transfers IS 'Notificar cuando el bot transfiere a humano';
COMMENT ON COLUMN empresas.notif_nuevos    IS 'Notificar en cada nueva conversación';
COMMENT ON COLUMN empresas.notif_resumen   IS 'Enviar resumen diario a las 20:00h';
