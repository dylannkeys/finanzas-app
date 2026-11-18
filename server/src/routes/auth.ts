import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Db } from "../db.js";
import { HttpError } from "../errors.js";
import { currentUser, requireAuth, signToken } from "../middleware/auth.js";
import { defaultCategories } from "../schema.js";

const registerSchema = z.object({
  name: z.string().trim().min(2, "El nombre es demasiado corto.").max(60),
  email: z.string().trim().toLowerCase().pipe(z.email("Correo no válido.")),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(72)
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string()
});

interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
}

export function authRouter(db: Db, secret: string): Router {
  const router = Router();

  router.post("/register", async (req, res) => {
    const { name, email, password } = registerSchema.parse(req.body);

    const existing = await db.query("SELECT 1 FROM users WHERE email = $1", [email]);
    if (existing.length > 0) throw new HttpError(409, "Ya existe una cuenta con ese correo.");

    const hash = await bcrypt.hash(password, 10);
    const [user] = await db.query<UserRow>(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email",
      [name, email, hash]
    );

    // Cada usuario empieza con un conjunto de categorías por defecto.
    for (const category of defaultCategories) {
      await db.query("INSERT INTO categories (user_id, name, type, color) VALUES ($1, $2, $3, $4)", [
        user.id,
        category.name,
        category.type,
        category.color
      ]);
    }

    res.status(201).json({ token: signToken(user.id, secret), user: publicUser(user) });
  });

  router.post("/login", async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const [user] = await db.query<UserRow>(
      "SELECT id, name, email, password_hash FROM users WHERE email = $1",
      [email]
    );
    // Mismo mensaje en ambos casos para no revelar qué correos existen.
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new HttpError(401, "Correo o contraseña incorrectos.");
    }
    res.json({ token: signToken(user.id, secret), user: publicUser(user) });
  });

  router.get("/me", requireAuth(secret), async (req, res) => {
    const [user] = await db.query<UserRow>("SELECT id, name, email FROM users WHERE id = $1", [
      currentUser(req)
    ]);
    if (!user) throw new HttpError(401, "La cuenta ya no existe.");
    res.json({ user: publicUser(user) });
  });

  return router;
}

function publicUser(user: Pick<UserRow, "id" | "name" | "email">) {
  return { id: user.id, name: user.name, email: user.email };
}
