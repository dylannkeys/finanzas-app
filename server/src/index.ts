import { createApp } from "./app.js";
import { createDb } from "./db.js";

const isProduction = process.env.NODE_ENV === "production";
// En producción (Render, Railway...) el proveedor indica el puerto con PORT.
// En desarrollo se usa API_PORT o 3001, para no chocar con el PORT de otras herramientas.
const port = Number(isProduction ? process.env.PORT : process.env.API_PORT) || 3001;

let jwtSecret = process.env.JWT_SECRET ?? "";
if (jwtSecret.length < 32) {
  if (isProduction) {
    console.error("JWT_SECRET es obligatorio en producción (mínimo 32 caracteres).");
    process.exit(1);
  }
  jwtSecret = "solo-para-desarrollo-no-usar-en-produccion-123456";
  console.warn("Aviso: usando un JWT_SECRET de desarrollo. Configura JWT_SECRET en server/.env.");
}

const clientOrigins = (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const databaseUrl = process.env.DATABASE_URL || undefined;
const db = await createDb(databaseUrl ? { url: databaseUrl } : { dataDir: "./data" });

const app = createApp({ db, jwtSecret, clientOrigins });
const server = app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
  console.log(databaseUrl ? "Base de datos: PostgreSQL" : "Base de datos: PGlite (server/data)");
});

async function shutdown() {
  server.close();
  await db.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
