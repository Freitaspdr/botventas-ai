-- ============================================
-- BOTVENTAS AI - Migración 006: Row Level Security (RLS)
-- Habilita RLS en todas las tablas para bloquear acceso anónimo
-- via Supabase REST API / PostgREST.
-- El pg Pool del backend usa el rol postgres/service_role que tiene
-- BYPASSRLS — no se ve afectado por estas políticas.
-- Seguro de ejecutar varias veces.
-- ============================================

-- ── Habilitar RLS ────────────────────────────────────────────────
ALTER TABLE empresas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversaciones        ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios              ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_programados  ENABLE ROW LEVEL SECURITY;

-- ── Eliminar políticas existentes (idempotente) ──────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'empresas','conversaciones','mensajes',
        'leads','usuarios','citas','mensajes_programados'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ── Políticas: solo service_role puede leer/escribir ─────────────
-- El rol "service_role" en Supabase tiene BYPASSRLS, así que estas
-- políticas en realidad solo afectan a "anon" y "authenticated"
-- (clientes del SDK de Supabase o PostgREST directo).
-- Las dejamos explícitas para que sea visible en el dashboard.

-- empresas
CREATE POLICY "service_role_all" ON empresas
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- conversaciones
CREATE POLICY "service_role_all" ON conversaciones
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- mensajes
CREATE POLICY "service_role_all" ON mensajes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- leads
CREATE POLICY "service_role_all" ON leads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- usuarios
CREATE POLICY "service_role_all" ON usuarios
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- citas
CREATE POLICY "service_role_all" ON citas
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- mensajes_programados
CREATE POLICY "service_role_all" ON mensajes_programados
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Verificación ─────────────────────────────────────────────────
-- Ejecuta esto para confirmar que RLS está activo en todas las tablas:
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'empresas','conversaciones','mensajes',
--     'leads','usuarios','citas','mensajes_programados'
--   );
-- Espera rowsecurity = true en todas.
