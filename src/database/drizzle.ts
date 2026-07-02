import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import config from '../config';
import * as schema from './schema';
import * as relations from './relations';

let pool: Pool | null = null;
let db: NodePgDatabase<typeof schema & typeof relations> | null = null;

const getPool = (): Pool => {
  if (!pool) {
    let connectionUrl = config.DATABASE_URL;
    let isSslEnabled = config.DB_SSL;

    // If DB_SSL is explicitly enabled, we adjust the connection URL
    // to prevent pg-connection-string from defaulting to verify-full (which requires CA certs)
    if (
      connectionUrl.includes('sslmode=require') ||
      connectionUrl.includes('sslmode=no-verify') ||
      config.DB_SSL
    ) {
      isSslEnabled = true;
      connectionUrl = connectionUrl.replace('sslmode=require', 'sslmode=no-verify');
    }

    pool = new Pool({
      connectionString: connectionUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: isSslEnabled
        ? {
          rejectUnauthorized: true,
        }
        : undefined,
    });

    pool.on('error', (err: Error) => {
      console.error('Unexpected error on idle client:', err.message);
    });
  }
  return pool;
};

export const getDb = (): NodePgDatabase<typeof schema & typeof relations> => {
  if (!db) {
    db = drizzle(getPool(), { schema: { ...schema, ...relations } });
  }
  return db;
};

export const closeDb = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
};

export type DrizzleDB = NodePgDatabase<typeof schema & typeof relations>;
export default getDb;
