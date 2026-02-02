import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const poolConfig: pg.PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Timeout for new connections
};

export const pool = new Pool(poolConfig);

// Add error handler for pool errors
pool.on('error', (err) => {
  console.error('[Database] Unexpected pool error:', err);
  // Don't exit - let the app continue running and try to reconnect
});

// Test connection on startup
pool.connect()
  .then(client => {
    console.log('[Database] Connection pool established successfully');
    client.release();
  })
  .catch(err => {
    console.error('[Database] Failed to establish initial connection:', err);
    console.error('[Database] Will retry connections as needed...');
  });

export const db = drizzle(pool, { schema });
