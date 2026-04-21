# Integracion del CRM de WhatsApp en otro proyecto

## Lo que ya queda resuelto en este repositorio

Este proyecto ya puede actuar como **core CRM de WhatsApp**:

- Recibe y procesa mensajes desde Evolution API.
- Guarda conversaciones y mensajes.
- Centraliza `contactos` como entidad CRM.
- Relaciona cada contacto con `leads` y `citas`.
- Permite respuesta humana desde el panel.
- Expone una API CRM reusable autenticada por empresa.

## Arquitectura recomendada para tu proyecto de "Agencia de IA"

No copies este bot dentro del otro proyecto.

La arquitectura correcta es:

1. `botventas-ai` como **motor CRM + WhatsApp**.
2. Tu proyecto de Agencia como **frontend/orquestador comercial**.
3. Comunicacion entre ambos por API server-to-server.

Flujo recomendado:

```text
WhatsApp -> Evolution API -> botventas-ai
botventas-ai -> PostgreSQL/Supabase
Agencia AI App -> CRM API de botventas-ai
Panel CRM -> mismas tablas y mismas rutas CRM
```

Asi evitas:

- duplicar logica de webhook
- duplicar el modelo de conversaciones
- mezclar el marketing/site de la agencia con la operativa del CRM
- depender de acceso directo a la base de datos desde varios frontends

## Autenticacion para integraciones

Cada empresa ahora tiene un `crm_api_token`.

Usalo en la cabecera:

```http
x-crm-token: TU_TOKEN_DE_EMPRESA
```

Ese token se puede copiar desde:

- `Panel -> Configuracion -> CRM API reusable`

## Demo local

Para ver todo funcionando en localhost:

```powershell
.\scripts\start-local-demo.ps1
```

Esto levanta:

- Backend CRM: `http://localhost:3000`
- Panel CRM: `http://localhost:3001`
- Contactos: `http://localhost:3001/contactos`
- Conversaciones: `http://localhost:3001/conversaciones`
- Configuracion/token: `http://localhost:3001/configuracion`
- Health API: `http://localhost:3000/crm/health`

Luego prueba la API desde terminal:

```powershell
node scripts/demo-crm-local.js
```

Para ver el detalle resumido de una conversacion:

```powershell
node scripts/demo-crm-local.js conversation <conversation_id>
```

Para ver el JSON completo:

```powershell
node scripts/demo-crm-local.js conversation <conversation_id> --full
```

Para enviar un mensaje humano real por WhatsApp:

```powershell
node scripts/demo-crm-local.js send <conversation_id> "Hola, soy el asesor humano."
```

Importante: el comando `send` envia por WhatsApp real si Evolution API esta configurado.

## Demo como proyecto externo

Hay un ejemplo minimo en:

```text
examples/agencia-crm-client
```

Uso:

```powershell
cd examples\agencia-crm-client
Copy-Item .env.example .env
```

Configura `.env`:

```env
BOTVENTAS_API_URL=http://localhost:3000
BOTVENTAS_CRM_TOKEN=token_de_panel_configuracion
```

Ejecuta:

```powershell
node crm-client.js
```

Ese ejemplo simula como tu app de Agencia de IA debe consumir contactos, conversaciones y leads sin tocar la base de datos.

## Endpoints disponibles

Base:

```text
https://TU_BACKEND_BOTVENTAS/crm
```

### 1. Listar contactos

```http
GET /crm/contactos?q=maria&estado=activo
```

### 2. Obtener un contacto

```http
GET /crm/contactos/:id
```

### 3. Listar conversaciones

```http
GET /crm/conversaciones?estado=activa&q=346
```

### 4. Obtener detalle de conversacion

```http
GET /crm/conversaciones/:id
```

### 5. Tomar control o cambiar estado

```http
PATCH /crm/conversaciones/:id
Content-Type: application/json

{ "estado": "transferida" }
```

Estados validos:

- `activa`
- `cerrada`
- `transferida`

### 6. Enviar mensaje humano desde otro frontend

```http
POST /crm/conversaciones/:id/messages
Content-Type: application/json

{ "text": "Hola, te escribo personalmente para cerrar tu cita." }
```

Este endpoint:

- envia el mensaje por WhatsApp
- lo guarda en `mensajes` con rol `human`
- deja la conversacion en estado `transferida`

### 7. Listar leads

```http
GET /crm/leads?estado=contactado&nivel=alto
```

## Ejemplo de consumo desde Next.js en tu proyecto Agencia

Hazlo siempre desde el servidor.

```ts
const res = await fetch(`${process.env.BOTVENTAS_API_URL}/crm/contactos`, {
  headers: {
    'x-crm-token': process.env.BOTVENTAS_CRM_TOKEN!,
  },
  cache: 'no-store',
});

const payload = await res.json();
```

Para responder una conversacion:

```ts
await fetch(`${process.env.BOTVENTAS_API_URL}/crm/conversaciones/${convId}/messages`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-crm-token': process.env.BOTVENTAS_CRM_TOKEN!,
  },
  body: JSON.stringify({
    text: 'Te confirmo disponibilidad para manana a las 10:30.',
  }),
});
```

## Como integrarlo en tu app de Agencia AI

### Opcion recomendada

Usa tu proyecto Agencia para:

- captacion de clientes
- onboarding
- panel ejecutivo
- propuestas, automatizaciones, reporting multi-servicio

Y usa este CRM para:

- inbox de WhatsApp
- seguimiento de leads
- citas
- operativa humana y bot

### Implementacion sugerida

En la app Agencia crea estos modulos:

1. `crmGateway.ts`
2. `contactsService.ts`
3. `conversationsService.ts`
4. `leadsService.ts`

Cada uno solo llama a la API de este proyecto.

## Dos formas practicas de integracion

### A. Integracion ligera

Mantener el panel actual como app separada:

- `crm.tudominio.com` -> este proyecto
- `app.agenciaia.com` -> tu nueva plataforma

Desde tu plataforma enlazas al CRM o haces SSO mas adelante.

Esta es la forma mas rapida y mas estable.

### B. Integracion profunda

Tu app Agencia consume la API CRM y renderiza sus propias vistas:

- lista de contactos
- inbox
- pipeline
- resumen por cliente

Esta opcion tiene mas control, pero debes mantener tu propio frontend.

## Recomendacion concreta para tu caso

Como ya tenias este bot, la mejor estrategia es:

1. Dejar `botventas-ai` como **producto interno CRM/WhatsApp**.
2. Crear tu nueva app de Agencia encima de esta API.
3. No volver a conectar WhatsApp desde cero en el nuevo proyecto.
4. Reutilizar este repo como backend de conversaciones para todos tus clientes.

## Variables de entorno recomendadas en la app Agencia

```env
BOTVENTAS_API_URL=https://tu-backend-botventas.com
BOTVENTAS_CRM_TOKEN=token_de_la_empresa
```

## Siguiente evolucion recomendada

Si quieres convertir esto en un producto mas fuerte para tu Agencia, lo siguiente seria:

1. Rotacion/regeneracion de `crm_api_token` desde el panel.
2. Webhooks salientes del CRM hacia tu app Agencia.
3. Asignacion de conversaciones a agentes.
4. Etiquetas CRM editables desde UI.
5. Notas internas por contacto.
6. Timeline unica por contacto con eventos del bot, humano, lead y cita.

## Resumen

Tu nuevo proyecto no deberia "absorber" este bot.

Debe **montarse encima** de este bot convertido en CRM core.

Ese enfoque te da:

- menos duplicacion
- menos riesgo
- mejor escalabilidad
- una sola fuente de verdad para WhatsApp
