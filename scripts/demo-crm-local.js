require('dotenv/config');

const { Client } = require('pg');

const apiUrl = (process.env.BOTVENTAS_API_URL || 'http://localhost:3000').replace(/\/$/, '');

async function getTokenFromDb() {
  if (process.env.BOTVENTAS_CRM_TOKEN) {
    return process.env.BOTVENTAS_CRM_TOKEN;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('Define BOTVENTAS_CRM_TOKEN o DATABASE_URL');
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: /localhost|127\.0\.0\.1/i.test(process.env.DATABASE_URL)
      ? false
      : { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT nombre, crm_api_token
       FROM empresas
       WHERE activo = true
       ORDER BY creado_en ASC
       LIMIT 1`,
    );

    if (!rows[0]?.crm_api_token) {
      throw new Error('No hay crm_api_token. Ejecuta npm run db:migrate.');
    }

    return rows[0].crm_api_token;
  } finally {
    await client.end();
  }
}

function mask(value) {
  if (!value || value.length < 12) return '***';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function truncate(value, max = 160) {
  if (!value) return '';
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

async function crmFetch(path, token, options = {}) {
  const res = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-crm-token': token,
      ...(options.headers || {}),
    },
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${options.method || 'GET'} ${path} -> ${res.status}: ${payload.error || 'Error'}`);
  }

  return payload;
}

function printList(title, rows, formatter) {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));

  if (!rows.length) {
    console.log('Sin datos.');
    return;
  }

  rows.slice(0, 5).forEach((row, index) => {
    console.log(`${index + 1}. ${formatter(row)}`);
  });

  if (rows.length > 5) {
    console.log(`... ${rows.length - 5} mas`);
  }
}

function printConversationDetail(detail, convId, full = false) {
  if (full) {
    console.log(JSON.stringify(detail, null, 2));
    return;
  }

  const conversation = detail.conversacion || {};
  const contact = detail.contacto || {};
  const lead = detail.lead || null;
  const appointment = detail.cita || null;
  const messages = detail.mensajes || [];
  const lastMessages = messages.slice(-12);

  console.log('\nConversacion');
  console.log('------------');
  console.log(`ID:       ${conversation.id || convId}`);
  console.log(`Cliente:  ${contact.nombre || conversation.cliente_nombre || 'Sin nombre'} (${contact.telefono || conversation.cliente_tel || 'sin telefono'})`);
  console.log(`Estado:   ${conversation.estado || 'sin estado'}`);
  console.log(`Contacto: ${contact.id || 'sin contacto vinculado'}`);

  if (lead) {
    console.log(`Lead:     ${lead.estado} | ${lead.nivel} | score ${lead.score || 0}`);
  } else {
    console.log('Lead:     sin lead asociado');
  }

  if (appointment) {
    console.log(`Cita:     ${appointment.estado} | ${appointment.fecha_hora || 'sin fecha'}`);
  }

  console.log(`\nMensajes: ${messages.length} total. Mostrando ultimos ${lastMessages.length}.`);
  for (const message of lastMessages) {
    console.log(`${message.enviado_en || ''} [${message.rol}] ${truncate(message.contenido, 180)}`);
  }

  console.log('\nJSON completo:');
  console.log(`node scripts/demo-crm-local.js conversation ${convId} --full`);
}

async function main() {
  const token = await getTokenFromDb();
  const args = process.argv.slice(2);
  const command = args[0] || 'overview';

  console.log(`CRM API: ${apiUrl}`);
  console.log(`Token:   ${mask(token)}`);

  if (command === 'send') {
    const convId = args[1];
    const text = args.slice(2).join(' ');
    if (!convId || !text) {
      throw new Error('Uso: node scripts/demo-crm-local.js send <conversation_id> "mensaje"');
    }

    const sent = await crmFetch(`/crm/conversaciones/${convId}/messages`, token, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });

    console.log('\nMensaje enviado desde CRM:');
    console.log(JSON.stringify(sent, null, 2));
    return;
  }

  if (command === 'conversation') {
    const convId = args[1];
    if (!convId) {
      throw new Error('Uso: node scripts/demo-crm-local.js conversation <conversation_id> [--full]');
    }

    const detail = await crmFetch(`/crm/conversaciones/${convId}`, token);
    printConversationDetail(detail.data, convId, args.includes('--full'));
    return;
  }

  const health = await crmFetch('/crm/health', token);
  const contacts = await crmFetch('/crm/contactos?limit=10', token);
  const conversations = await crmFetch('/crm/conversaciones?limit=10', token);
  const leads = await crmFetch('/crm/leads?limit=10', token);

  console.log(`\nHealth: ${health.ok ? 'OK' : 'ERROR'}`);

  printList('Contactos CRM', contacts.data || [], (contact) =>
    `${contact.nombre || 'Sin nombre'} | ${contact.telefono} | ${contact.total_conversaciones} conversaciones | ${contact.lead_nivel || 'sin lead'}`,
  );

  printList('Conversaciones', conversations.data || [], (conversation) =>
    `${conversation.id} | ${conversation.cliente_nombre || conversation.cliente_tel} | ${conversation.estado} | ${truncate(conversation.ultimo_mensaje || 'sin mensaje')}`,
  );

  printList('Leads', leads.data || [], (lead) =>
    `${lead.cliente_nombre || lead.cliente_tel} | ${lead.estado} | ${lead.nivel} | score ${lead.score || 0}`,
  );

  const firstConversation = conversations.data?.[0];
  if (firstConversation) {
    console.log('\nPara ver detalle de una conversacion:');
    console.log(`node scripts/demo-crm-local.js conversation ${firstConversation.id}`);
    console.log('\nPara enviar mensaje humano real por WhatsApp:');
    console.log(`node scripts/demo-crm-local.js send ${firstConversation.id} "Hola, soy el asesor humano. Te ayudo por aqui."`);
  }
}

main().catch((err) => {
  console.error(`\nError demo CRM: ${err.message}`);
  process.exit(1);
});
