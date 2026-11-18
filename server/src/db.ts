import pg from "pg";
import { PGlite } from "@electric-sql/pglite";
import { schema } from "./schema.js";

/**
 * Interfaz mínima de base de datos. Permite usar el mismo SQL con:
 *  - PostgreSQL real (pg) en producción, vía DATABASE_URL.
 *  - PGlite (PostgreSQL compilado a WebAssembly) en desarrollo y tests,
 *    sin tener que instalar nada.
 */
export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

export interface DbOptions {
  /** Cadena de conexión de PostgreSQL. */
  url?: string;
  /** Carpeta de datos de PGlite. Si no se indica, la base vive en memoria. */
  dataDir?: string;
}

export async function createDb(options: DbOptions = {}): Promise<Db> {
  const db = options.url ? createPgDb(options.url) : await createPgliteDb(options.dataDir);
  await db.exec(schema);
  return db;
}

function createPgDb(url: string): Db {
  const pool = new pg.Pool({
    connectionString: url,
    ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false },
    max: 5
  });
  return {
    async query(text, params = []) {
      const result = await pool.query(text, params);
      return result.rows;
    },
    async exec(sql) {
      await pool.query(sql);
    },
    close: () => pool.end()
  };
}

async function createPgliteDb(dataDir?: string): Promise<Db> {
  const lite = await PGlite.create(dataDir);
  return {
    async query<T>(text: string, params: unknown[] = []) {
      const result = await lite.query<T>(text, params);
      return result.rows;
    },
    async exec(sql) {
      await lite.exec(sql);
    },
    close: () => lite.close()
  };
}
