# Panel BotVentas AI

Panel interno en Next.js para gestionar conversaciones, leads, citas, configuración del bot y operaciones de WhatsApp.

## Requisitos

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `AUTH_SECRET`
- `DATABASE_URL` solo si mantienes utilidades heredadas que usan `pg`
- `BOTVENTAS_API_URL` para registrar el webhook del backend
- `DEFAULT_EVOLUTION_API_URL` como fallback del servidor Evolution
- `WEBHOOK_SECRET` opcional para firmar webhooks creados desde el panel

## Scripts

```bash
npm run dev
npm run build
npm run lint
```

## Notas operativas

- El panel usa `service_role` solo en servidor.
- Las claves de Evolution API ya no se devuelven al tenant; se tratan como secretos write-only.
- La gestión de instancia de WhatsApp depende de `BOTVENTAS_API_URL` y `DEFAULT_EVOLUTION_API_URL`.
