import { Pool, QueryResult, QueryResultRow } from 'pg';
import { ENV } from './env.js';

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    const connectionString = ENV.DATABASE_URL;

    if (!connectionString) {
      console.warn('⚠️ DATABASE_URL is not defined in environment variables. Database operations will fail.');
    }

    const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

    pool = new Pool({
      connectionString,
      ssl: isLocalhost || !connectionString
        ? false
        : {
            rejectUnauthorized: false, // Standard for Neon serverless PostgreSQL
          },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle database client', err);
    });
  }

  return pool;
}

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const p = getDbPool();
  const start = Date.now();
  try {
    const res = await p.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL === 'true') {
      console.log('Executed query', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Database query error:', { text, params, error });
    throw error;
  }
}

export async function getClient() {
  const p = getDbPool();
  return await p.connect();
}
