/**
 * Ejemplo minimo para usar el CRM desde otro proyecto.
 *
 * Requiere Node 18+.
 * Copia .env.example a .env o define las variables en tu proyecto real:
 * - BOTVENTAS_API_URL
 * - BOTVENTAS_CRM_TOKEN
 */

const fs = require('fs');
const path = require('path');

function loadLocalEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const [key, ...rest] = line.split('=');
    if (!key || rest.length === 0) continue;
    process.env[key.trim()] ||= rest.join('=').trim();
  }
}

loadLocalEnv();

const API_URL = (process.env.BOTVENTAS_API_URL || 'http://localhost:3000').replace(/\/$/, '');
const CRM_TOKEN = process.env.BOTVENTAS_CRM_TOKEN;

if (!CRM_TOKEN) {
  console.error('Falta BOTVENTAS_CRM_TOKEN. Copialo desde Panel -> Configuracion -> CRM API reusable.');
  process.exit(1);
}

async function crm(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-crm-token': CRM_TOKEN,
      ...(options.headers || {}),
    },
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${res.status}: ${payload.error || 'Error CRM'}`);
  }

  return payload.data ?? payload;
}

async function main() {
  const contacts = await crm('/crm/contactos?limit=5');
  const conversations = await crm('/crm/conversaciones?limit=5');
  const leads = await crm('/crm/leads?limit=5');

  console.log('Contactos:', contacts.map((contact) => ({
    nombre: contact.nombre,
    telefono: contact.telefono,
    conversaciones: contact.total_conversaciones,
    lead: contact.lead_nivel,
  })));

  console.log('Conversaciones:', conversations.map((conversation) => ({
    id: conversation.id,
    cliente: conversation.cliente_nombre || conversation.cliente_tel,
    estado: conversation.estado,
    ultimo_mensaje: conversation.ultimo_mensaje,
  })));

  console.log('Leads:', leads.map((lead) => ({
    cliente: lead.cliente_nombre || lead.cliente_tel,
    estado: lead.estado,
    nivel: lead.nivel,
    score: lead.score,
  })));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
