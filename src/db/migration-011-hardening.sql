-- migration-011: endurecimiento de esquema para producción
-- - permite superadmin en usuarios
-- - alinea conversaciones activas con índice parcial único

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'usuarios'
      AND constraint_name = 'usuarios_rol_check'
  ) THEN
    ALTER TABLE usuarios DROP CONSTRAINT usuarios_rol_check;
  END IF;
END $$;

ALTER TABLE usuarios
  ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('superadmin', 'admin', 'agente'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'conversaciones'
      AND constraint_name = 'conversaciones_empresa_id_cliente_tel_key'
  ) THEN
    ALTER TABLE conversaciones
      DROP CONSTRAINT conversaciones_empresa_id_cliente_tel_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversaciones_empresa_tel_activa
  ON conversaciones(empresa_id, cliente_tel)
  WHERE estado = 'activa';
