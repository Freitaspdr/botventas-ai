-- migration-013: rpc de contactos y detalle CRM ampliado

CREATE OR REPLACE FUNCTION get_conversacion_detalle(p_id uuid, p_empresa_id uuid)
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'conversacion', (SELECT row_to_json(c) FROM conversaciones c WHERE id = p_id AND empresa_id = p_empresa_id),
    'contacto',     (
      SELECT row_to_json(ct)
      FROM conversaciones c
      JOIN contactos ct ON ct.id = c.contacto_id
      WHERE c.id = p_id
        AND c.empresa_id = p_empresa_id
    ),
    'mensajes',     (
      SELECT json_agg(
        json_build_object('rol', rol, 'contenido', contenido, 'enviado_en', enviado_en)
        ORDER BY enviado_en
      )
      FROM mensajes
      WHERE conv_id = p_id
    ),
    'lead',         (SELECT row_to_json(l) FROM leads l WHERE conv_id = p_id LIMIT 1),
    'cita',         (SELECT row_to_json(ci) FROM citas ci WHERE conv_id = p_id ORDER BY fecha_hora DESC LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION get_contactos(
  p_empresa_id uuid,
  p_q text DEFAULT NULL,
  p_estado text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  telefono text,
  nombre text,
  estado text,
  origen text,
  etiquetas text[],
  notas text,
  ultima_interaccion_en timestamptz,
  total_conversaciones bigint,
  total_leads bigint,
  total_citas bigint,
  lead_estado text,
  lead_nivel text,
  ultima_conversacion_id uuid,
  ultima_conversacion_estado text
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    ct.id,
    ct.telefono,
    ct.nombre,
    ct.estado,
    ct.origen,
    ct.etiquetas,
    ct.notas,
    ct.ultima_interaccion_en,
    COALESCE(conv.total_conversaciones, 0),
    COALESCE(ld.total_leads, 0),
    COALESCE(ci.total_citas, 0),
    last_lead.estado,
    last_lead.nivel,
    last_conv.id,
    last_conv.estado
  FROM contactos ct
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS total_conversaciones
    FROM conversaciones c
    WHERE c.contacto_id = ct.id
  ) conv ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS total_leads
    FROM leads l
    WHERE l.contacto_id = ct.id
  ) ld ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS total_citas
    FROM citas ci
    WHERE ci.contacto_id = ct.id
  ) ci ON true
  LEFT JOIN LATERAL (
    SELECT l.estado, l.nivel
    FROM leads l
    WHERE l.contacto_id = ct.id
    ORDER BY l.actualizado_en DESC, l.creado_en DESC
    LIMIT 1
  ) last_lead ON true
  LEFT JOIN LATERAL (
    SELECT c.id, c.estado
    FROM conversaciones c
    WHERE c.contacto_id = ct.id
    ORDER BY c.actualizada_en DESC, c.creado_en DESC
    LIMIT 1
  ) last_conv ON true
  WHERE ct.empresa_id = p_empresa_id
    AND (p_estado IS NULL OR ct.estado = p_estado)
    AND (
      p_q IS NULL
      OR ct.telefono ILIKE '%' || p_q || '%'
      OR COALESCE(ct.nombre, '') ILIKE '%' || p_q || '%'
      OR COALESCE(ct.notas, '') ILIKE '%' || p_q || '%'
    )
  ORDER BY COALESCE(ct.ultima_interaccion_en, ct.actualizado_en, ct.creado_en) DESC;
$$;

GRANT EXECUTE ON FUNCTION get_contactos TO authenticated, service_role;
