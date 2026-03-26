-- ============================================
-- BOTVENTAS AI - Migración 008: Config Evolution API por empresa
-- Cada empresa puede usar su propio servidor Evolution API
-- Si los campos están vacíos, se usan los valores globales del .env
-- ============================================

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS evolution_api_url VARCHAR(255),
  ADD COLUMN IF NOT EXISTS evolution_api_key VARCHAR(255);

COMMENT ON COLUMN empresas.evolution_api_url IS
  'URL del servidor Evolution API de esta empresa (ej: https://evo.miempresa.com). Si NULL, usa EVOLUTION_API_URL del .env global.';

COMMENT ON COLUMN empresas.evolution_api_key IS
  'API key del servidor Evolution API de esta empresa. Si NULL, usa EVOLUTION_API_KEY del .env global.';
