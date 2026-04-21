require('dotenv/config');

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL es obligatoria');
  }

  const needsSsl = !/localhost|127\.0\.0\.1/i.test(process.env.DATABASE_URL);

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: needsSsl ? { rejectUnauthorized: false } : false,
  });

  const dbDir = path.join(__dirname, '..', 'src', 'db');
  const files = [
    'schema.sql',
    ...fs.readdirSync(dbDir)
      .filter((name) => {
        const match = name.match(/^migration-(\d+).*\.sql$/);
        if (!match) return false;
        return Number.parseInt(match[1], 10) >= 6;
      })
      .sort(),
  ];

  await client.connect();

  try {
    for (const file of files) {
      const fullPath = path.join(dbDir, file);
      const sql = fs.readFileSync(fullPath, 'utf8');
      console.log(`→ Ejecutando ${file}`);
      await client.query(sql);
    }
    console.log('✅ Migraciones aplicadas correctamente');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('❌ Error ejecutando migraciones:', err.message);
  process.exit(1);
});
