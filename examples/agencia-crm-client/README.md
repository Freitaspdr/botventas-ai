# Demo cliente para Agencia IA

Este ejemplo simula como tu otro proyecto puede consumir el CRM de WhatsApp sin tocar la base de datos.

## 1. Levanta el CRM local

Desde la raiz de `botventas-ai`:

```powershell
.\scripts\start-local-demo.ps1
```

Esto abre:

- Backend CRM: `http://localhost:3000`
- Panel CRM: `http://localhost:3001`

## 2. Copia el token CRM

Entra al panel:

```text
http://localhost:3001/configuracion
```

Busca el bloque:

```text
CRM API reusable
```

Copia:

- Base URL
- Token empresa

## 3. Configura este ejemplo

```powershell
Copy-Item .env.example .env
```

Edita `.env`:

```env
BOTVENTAS_API_URL=http://localhost:3000
BOTVENTAS_CRM_TOKEN=tu_token
```

## 4. Ejecuta la demo

```powershell
node crm-client.js
```

Veras:

- contactos
- conversaciones
- leads

## 5. Patron para tu proyecto real

En tu proyecto Agencia crea un modulo parecido:

```js
export async function getCrmContacts() {
  const res = await fetch(`${process.env.BOTVENTAS_API_URL}/crm/contactos`, {
    headers: {
      'x-crm-token': process.env.BOTVENTAS_CRM_TOKEN,
    },
    cache: 'no-store',
  });

  const payload = await res.json();
  return payload.data;
}
```

Haz estas llamadas siempre desde servidor, nunca desde el navegador, porque el token es secreto.
