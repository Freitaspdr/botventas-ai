import { Pool } from 'pg';

// Pool PostgreSQL para el panel (API routes Node.js - NO Edge runtime)
// Supabase requiere SSL; DATABASE_URL debe apuntar al pooler de Supabase
// (puerto 6543 transaction mode recomendado en Vercel serverless)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 3,                   // serverless: pocas conexiones simultáneas
  idleTimeoutMillis: 20_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('pg pool error:', err.message);
});

export default pool;
