import { Pool } from 'pg';
import { env } from '../config/env';

export const db = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

db.on('error', (err) => {
  console.error('Error inesperado en el pool de DB:', err);
});

export async function testConnection(): Promise<void> {
  const client = await db.connect();
  await client.query('SELECT 1');
  client.release();
  console.log('✅ Conexión a PostgreSQL exitosa');
}
