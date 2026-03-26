-- migration-009: funciones RPC para el panel (evita pg Pool en Vercel)
-- Ejecutar en Supabase SQL Editor

-- 1. Stats del dashboard
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_empresa_id uuid, p_today date)
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'conv_hoy',           (SELECT COUNT(*) FROM conversaciones WHERE empresa_id=p_empresa_id AND DATE(creado_en)=p_today),
    'conv_ayer',          (SELECT COUNT(*) FROM conversaciones WHERE empresa_id=p_empresa_id AND DATE(creado_en)=p_today - 1),
    'hot_leads_hoy',      (SELECT COUNT(*) FROM leads WHERE empresa_id=p_empresa_id AND nivel='alto' AND DATE(creado_en)=p_today),
    'hot_leads_ayer',     (SELECT COUNT(*) FROM leads WHERE empresa_id=p_empresa_id AND nivel='alto' AND DATE(creado_en)=p_today - 1),
    'citas_hoy',          (SELECT COUNT(*) FROM citas WHERE empresa_id=p_empresa_id AND DATE(fecha_hora)=p_today),
    'citas_hoy_conf',     (SELECT COUNT(*) FROM citas WHERE empresa_id=p_empresa_id AND DATE(fecha_hora)=p_today AND estado='confirmada'),
    'citas_hoy_pend',     (SELECT COUNT(*) FROM citas WHERE empresa_id=p_empresa_id AND DATE(fecha_hora)=p_today AND estado='pendiente'),
    'total_leads',        (SELECT COUNT(*) FROM leads WHERE empresa_id=p_empresa_id),
    'leads_cerrados',     (SELECT COUNT(*) FROM leads WHERE empresa_id=p_empresa_id AND estado='cerrado'),
    'conv_total',         (SELECT COUNT(*) FROM conversaciones WHERE empresa_id=p_empresa_id),
    'conv_transfer',      (SELECT COUNT(*) FROM conversaciones WHERE empresa_id=p_empresa_id AND estado='transferida')
  );
$$;

-- 2. Feed del dashboard
CREATE OR REPLACE FUNCTION get_dashboard_feed(p_empresa_id uuid)
RETURNS TABLE (
  id uuid, cliente_tel text, cliente_nombre text, estado text,
  nurturing_step int, es_hot_lead bool, actualizada_en timestamptz,
  ultimo_mensaje text, ultimo_rol text, lead_nivel text
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT c.id, c.cliente_tel, c.cliente_nombre, c.estado, c.nurturing_step, c.es_hot_lead,
    c.actualizada_en,
    (SELECT contenido FROM mensajes WHERE conv_id=c.id ORDER BY enviado_en DESC LIMIT 1),
    (SELECT rol FROM mensajes WHERE conv_id=c.id ORDER BY enviado_en DESC LIMIT 1),
    l.nivel
  FROM conversaciones c
  LEFT JOIN leads l ON l.conv_id=c.id
  WHERE c.empresa_id=p_empresa_id
  ORDER BY c.actualizada_en DESC
  LIMIT 7;
$$;

-- 3. Funnel del dashboard
CREATE OR REPLACE FUNCTION get_dashboard_funnel(p_empresa_id uuid)
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'total_leads',     (SELECT COUNT(*) FROM leads WHERE empresa_id=p_empresa_id AND DATE_TRUNC('month',creado_en)=DATE_TRUNC('month',CURRENT_DATE)),
    'respondieron',    (SELECT COUNT(*) FROM leads WHERE empresa_id=p_empresa_id AND estado!='nuevo' AND DATE_TRUNC('month',creado_en)=DATE_TRUNC('month',CURRENT_DATE)),
    'cualificados',    (SELECT COUNT(*) FROM leads WHERE empresa_id=p_empresa_id AND nivel IN ('alto','medio') AND DATE_TRUNC('month',creado_en)=DATE_TRUNC('month',CURRENT_DATE)),
    'citas_agendadas', (SELECT COUNT(*) FROM citas WHERE empresa_id=p_empresa_id AND DATE_TRUNC('month',creado_en)=DATE_TRUNC('month',CURRENT_DATE)),
    'ventas_cerradas', (SELECT COUNT(*) FROM leads WHERE empresa_id=p_empresa_id AND estado='cerrado' AND DATE_TRUNC('month',creado_en)=DATE_TRUNC('month',CURRENT_DATE))
  );
$$;

-- 4. Revenue del dashboard
CREATE OR REPLACE FUNCTION get_dashboard_revenue(p_empresa_id uuid)
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'mes_actual',   (SELECT COALESCE(SUM(ticket_estimado),0) FROM leads WHERE empresa_id=p_empresa_id AND estado='cerrado' AND DATE_TRUNC('month',actualizado_en)=DATE_TRUNC('month',CURRENT_DATE)),
    'mes_anterior', (SELECT COALESCE(SUM(ticket_estimado),0) FROM leads WHERE empresa_id=p_empresa_id AND estado='cerrado' AND DATE_TRUNC('month',actualizado_en)=DATE_TRUNC('month',CURRENT_DATE-INTERVAL '1 month')),
    'plan_nombre',  e.plan,
    'conv_usadas',  e.conv_usadas,
    'conv_limite',  e.conv_limite
  )
  FROM empresas e WHERE e.id=p_empresa_id;
$$;

-- 5. Lista de conversaciones (con filtros opcionales)
CREATE OR REPLACE FUNCTION get_conversaciones(
  p_empresa_id uuid,
  p_estado text DEFAULT NULL,
  p_desde text DEFAULT NULL,
  p_hasta text DEFAULT NULL,
  p_q text DEFAULT NULL
)
RETURNS TABLE (
  id uuid, cliente_tel text, cliente_nombre text, estado text, es_hot_lead bool,
  nurturing_step int, creado_en timestamptz, actualizada_en timestamptz,
  ultimo_mensaje text, total_mensajes bigint, lead_nivel text, lead_score int
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT c.id, c.cliente_tel, c.cliente_nombre, c.estado, c.es_hot_lead,
    c.nurturing_step, c.creado_en, c.actualizada_en,
    (SELECT contenido FROM mensajes WHERE conv_id=c.id ORDER BY enviado_en DESC LIMIT 1),
    (SELECT COUNT(*) FROM mensajes WHERE conv_id=c.id),
    l.nivel, l.score
  FROM conversaciones c
  LEFT JOIN leads l ON l.conv_id=c.id
  WHERE c.empresa_id=p_empresa_id
    AND (p_estado IS NULL OR c.estado=p_estado)
    AND (p_desde IS NULL OR c.creado_en >= p_desde::timestamptz)
    AND (p_hasta IS NULL OR c.creado_en <= (p_hasta || 'T23:59:59')::timestamptz)
    AND (p_q IS NULL OR c.cliente_nombre ILIKE '%' || p_q || '%' OR c.cliente_tel ILIKE '%' || p_q || '%')
  ORDER BY c.actualizada_en DESC
  LIMIT 100;
$$;

-- 6. Detalle de conversación
CREATE OR REPLACE FUNCTION get_conversacion_detalle(p_id uuid, p_empresa_id uuid)
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'conversacion', (SELECT row_to_json(c) FROM conversaciones c WHERE id=p_id AND empresa_id=p_empresa_id),
    'mensajes',     (SELECT json_agg(json_build_object('rol',rol,'contenido',contenido,'enviado_en',enviado_en) ORDER BY enviado_en) FROM mensajes WHERE conv_id=p_id),
    'lead',         (SELECT row_to_json(l) FROM leads l WHERE conv_id=p_id LIMIT 1),
    'cita',         (SELECT row_to_json(ci) FROM citas ci WHERE conv_id=p_id ORDER BY fecha_hora DESC LIMIT 1)
  );
$$;

-- 7. Lista de leads con citas
CREATE OR REPLACE FUNCTION get_leads(p_empresa_id uuid)
RETURNS TABLE (
  id uuid, cliente_tel text, cliente_nombre text, nivel text, estado text, interes text,
  notas text, score int, ticket_estimado numeric, vehiculo text, conv_id uuid,
  creado_en timestamptz, actualizado_en timestamptz,
  nurturing_step int, conv_actualizada_en timestamptz,
  cita_id uuid, cita_fecha timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT l.id, l.cliente_tel, l.cliente_nombre, l.nivel, l.estado, l.interes,
    l.notas, l.score, l.ticket_estimado, l.vehiculo, l.conv_id,
    l.creado_en, l.actualizado_en,
    c.nurturing_step, c.actualizada_en,
    (SELECT id FROM citas WHERE conv_id=l.conv_id ORDER BY fecha_hora DESC LIMIT 1),
    (SELECT fecha_hora FROM citas WHERE conv_id=l.conv_id ORDER BY fecha_hora DESC LIMIT 1)
  FROM leads l
  LEFT JOIN conversaciones c ON c.id=l.conv_id
  WHERE l.empresa_id=p_empresa_id
  ORDER BY l.creado_en DESC;
$$;

-- 8. Export de leads
CREATE OR REPLACE FUNCTION get_leads_export(
  p_empresa_id uuid,
  p_nivel text DEFAULT NULL,
  p_estado text DEFAULT NULL
)
RETURNS TABLE (
  cliente_nombre text, cliente_tel text, nivel text, estado text,
  interes text, notas text, creado_en timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT cliente_nombre, cliente_tel, nivel, estado, interes, notas, creado_en
  FROM leads
  WHERE empresa_id=p_empresa_id
    AND (p_nivel IS NULL OR nivel=p_nivel)
    AND (p_estado IS NULL OR estado=p_estado)
  ORDER BY creado_en DESC;
$$;

-- 9. Analytics chart (series por fecha)
CREATE OR REPLACE FUNCTION get_analytics_chart(p_empresa_id uuid, p_dias int)
RETURNS TABLE (fecha date, leads bigint, citas bigint, conversaciones bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH fechas AS (
    SELECT DISTINCT d::date AS fecha FROM (
      SELECT DATE(creado_en) d FROM leads WHERE empresa_id=p_empresa_id AND creado_en >= NOW()-(p_dias||' days')::interval
      UNION SELECT DATE(creado_en) FROM citas WHERE empresa_id=p_empresa_id AND creado_en >= NOW()-(p_dias||' days')::interval
      UNION SELECT DATE(creado_en) FROM conversaciones WHERE empresa_id=p_empresa_id AND creado_en >= NOW()-(p_dias||' days')::interval
    ) t
  )
  SELECT f.fecha,
    COALESCE((SELECT COUNT(*) FROM leads WHERE empresa_id=p_empresa_id AND DATE(creado_en)=f.fecha),0),
    COALESCE((SELECT COUNT(*) FROM citas WHERE empresa_id=p_empresa_id AND DATE(creado_en)=f.fecha),0),
    COALESCE((SELECT COUNT(*) FROM conversaciones WHERE empresa_id=p_empresa_id AND DATE(creado_en)=f.fecha),0)
  FROM fechas f
  ORDER BY f.fecha;
$$;

-- 10. Analytics overview
CREATE OR REPLACE FUNCTION get_analytics_overview(p_empresa_id uuid, p_dias int)
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'total_leads',    (SELECT COUNT(*) FROM leads WHERE empresa_id=p_empresa_id AND creado_en>=NOW()-(p_dias||' days')::interval),
    'respondieron',   (SELECT COUNT(*) FROM leads WHERE empresa_id=p_empresa_id AND estado!='nuevo' AND creado_en>=NOW()-(p_dias||' days')::interval),
    'cualificados',   (SELECT COUNT(*) FROM leads WHERE empresa_id=p_empresa_id AND nivel IN ('alto','medio') AND creado_en>=NOW()-(p_dias||' days')::interval),
    'citas_agendadas',(SELECT COUNT(*) FROM citas WHERE empresa_id=p_empresa_id AND creado_en>=NOW()-(p_dias||' days')::interval),
    'mensajes_ia',    (SELECT COUNT(*) FROM mensajes m JOIN conversaciones c ON c.id=m.conv_id WHERE c.empresa_id=p_empresa_id AND m.rol='assistant' AND m.enviado_en>=NOW()-(p_dias||' days')::interval),
    'conv_total',     (SELECT COUNT(*) FROM conversaciones WHERE empresa_id=p_empresa_id AND creado_en>=NOW()-(p_dias||' days')::interval),
    'conv_transfer',  (SELECT COUNT(*) FROM conversaciones WHERE empresa_id=p_empresa_id AND estado='transferida' AND creado_en>=NOW()-(p_dias||' days')::interval)
  );
$$;

-- 11. Analytics por servicio
CREATE OR REPLACE FUNCTION get_analytics_services(p_empresa_id uuid, p_dias int)
RETURNS TABLE (
  servicio text, leads bigint, citas bigint, cerrados bigint,
  ticket_medio numeric, facturacion numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COALESCE(l.interes,'Sin especificar'),
    COUNT(*),
    COUNT(ci.id),
    COUNT(*) FILTER (WHERE l.estado='cerrado'),
    ROUND(AVG(l.ticket_estimado) FILTER (WHERE l.ticket_estimado IS NOT NULL)),
    COALESCE(SUM(l.ticket_estimado) FILTER (WHERE l.estado='cerrado'),0)
  FROM leads l
  LEFT JOIN citas ci ON ci.conv_id=l.conv_id
  WHERE l.empresa_id=p_empresa_id AND l.creado_en>=NOW()-(p_dias||' days')::interval
  GROUP BY l.interes
  ORDER BY COUNT(*) DESC
  LIMIT 15;
$$;

GRANT EXECUTE ON FUNCTION get_dashboard_stats TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_dashboard_feed TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_dashboard_funnel TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_dashboard_revenue TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_conversaciones TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_conversacion_detalle TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_leads TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_leads_export TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_analytics_chart TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_analytics_overview TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_analytics_services TO authenticated, service_role;
