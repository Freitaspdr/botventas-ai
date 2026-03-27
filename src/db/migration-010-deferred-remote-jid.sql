-- migration-010: añadir remote_jid a mensajes_programados
-- El scheduler necesita el JID completo (ej: 280255323500774@lid) para enviar via Evolution API.
-- cliente_tel solo contiene el número extraído, que no funciona con cuentas @lid de WhatsApp.

ALTER TABLE mensajes_programados
  ADD COLUMN IF NOT EXISTS remote_jid VARCHAR(100);
