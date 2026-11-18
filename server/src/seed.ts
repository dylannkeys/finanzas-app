/**
 * Crea la cuenta demo en la base local (o en DATABASE_URL si está definida).
 * Uso: npm run seed   (credenciales: demo@finanzas.app / demo12345)
 */
import { createDb } from "./db.js";
import { DEMO_EMAIL, DEMO_PASSWORD, seedDemo } from "./demo.js";

const databaseUrl = process.env.DATABASE_URL || undefined;
const db = await createDb(databaseUrl ? { url: databaseUrl } : { dataDir: "./data" });
const count = await seedDemo(db);
console.log(`Usuario demo creado: ${DEMO_EMAIL} / ${DEMO_PASSWORD} (${count} movimientos)`);
await db.close();
