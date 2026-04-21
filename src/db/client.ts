import { Pool, PoolClient } from 'pg';
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

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function withAdvisoryLock<T>(
  lockName: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<{ acquired: boolean; result?: T }> {
  const client = await db.connect();
  try {
    const lock = await client.query<{ locked: boolean }>(
      'SELECT pg_try_advisory_lock(hashtext($1)) AS locked',
      [lockName],
    );

    if (!lock.rows[0]?.locked) {
      return { acquired: false };
    }

    try {
      const result = await fn(client);
      return { acquired: true, result };
    } finally {
      await client.query('SELECT pg_advisory_unlock(hashtext($1))', [lockName]);
    }
  } finally {
    client.release();
  }
}
