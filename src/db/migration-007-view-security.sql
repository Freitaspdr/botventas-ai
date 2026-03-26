-- ============================================
-- BOTVENTAS AI - Migración 007: Security Invoker en v_resumen_diario
-- Por defecto las vistas en Supabase son SECURITY DEFINER (permisos
-- del creador = postgres), lo que bypassea RLS para cualquier usuario
-- anónimo. Recreamos la vista con SECURITY INVOKER para que herede
-- los permisos del usuario que consulta (respeta RLS).
-- ============================================

DROP VIEW IF EXISTS v_resumen_diario;

CREATE VIEW v_resumen_diario
  WITH (security_invoker = true)   -- respeta RLS del usuario que consulta
AS
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

-- Verificar que el warning desapareció:
-- SELECT viewname, definition FROM pg_views WHERE viewname = 'v_resumen_diario';
-- En el dashboard de Supabase → Database → Views → v_resumen_diario
-- ya no debe aparecer el aviso "Security Definer".
