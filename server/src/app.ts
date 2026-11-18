import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import type { Db } from "./db.js";
import { errorHandler, HttpError } from "./errors.js";
import { requireAuth } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { categoriesRouter } from "./routes/categories.js";
import { transactionsRouter } from "./routes/transactions.js";
import { summaryRouter } from "./routes/summary.js";

export interface AppConfig {
  db: Db;
  jwtSecret: string;
  clientOrigins?: string[];
  /** Desactiva el límite de intentos de login (útil en tests). */
  disableRateLimit?: boolean;
}

export function createApp({ db, jwtSecret, clientOrigins = [], disableRateLimit = false }: AppConfig) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: clientOrigins.length ? clientOrigins : false }));
  app.use(express.json({ limit: "20kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => disableRateLimit,
    message: { error: "Demasiados intentos. Espera unos minutos." }
  });

  app.use("/api/auth", authLimiter, authRouter(db, jwtSecret));

  const auth = requireAuth(jwtSecret);
  app.use("/api/categories", auth, categoriesRouter(db));
  app.use("/api/transactions", auth, transactionsRouter(db));
  app.use("/api/summary", auth, summaryRouter(db));

  app.use("/api", () => {
    throw new HttpError(404, "Ruta no encontrada.");
  });
  app.use(errorHandler);
  return app;
}
