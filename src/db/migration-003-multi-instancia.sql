-- ============================================
-- BOTVENTAS AI - Migración 003: Multi-instancia Evolution API
-- Cada empresa tiene su propia instancia de Evolution API
-- ============================================

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS evolution_instance VARCHAR(100);

-- Índice único para lookup rápido en el webhook
CREATE UNIQUE INDEX IF NOT EXISTS idx_empresas_evolution_instance
  ON empresas(evolution_instance)
  WHERE evolution_instance IS NOT NULL;

-- Documenta el propósito de la columna
COMMENT ON COLUMN empresas.evolution_instance IS
  'Nombre de la instancia en Evolution API (ej: "beleti-bot"). Debe coincidir con payload.instance del webhook.';

-- Ejemplo: asignar instancia a Beleti usando el número del .env
-- UPDATE empresas SET evolution_instance = 'TU_INSTANCIA' WHERE whatsapp_num = '521TUNUMERODEWHATSAPP';
