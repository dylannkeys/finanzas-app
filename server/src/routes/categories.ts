import { Router } from "express";
import { z } from "zod";
import type { Db } from "../db.js";
import { HttpError } from "../errors.js";
import { currentUser } from "../middleware/auth.js";
import { idParam } from "../validation.js";

const categorySchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(40),
  type: z.enum(["income", "expense"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color no válido.").default("#6366f1"),
  monthlyBudget: z.coerce.number().min(0).max(9_999_999_999).nullable().optional()
});

const COLUMNS = `id, name, type, color, monthly_budget::float8 AS "monthlyBudget"`;

export function categoriesRouter(db: Db): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    const rows = await db.query(
      `SELECT ${COLUMNS} FROM categories WHERE user_id = $1 ORDER BY type DESC, name`,
      [currentUser(req)]
    );
    res.json(rows);
  });

  router.post("/", async (req, res) => {
    const userId = currentUser(req);
    const data = categorySchema.parse(req.body);
    await ensureUniqueName(db, userId, data.name, data.type);
    const [row] = await db.query(
      `INSERT INTO categories (user_id, name, type, color, monthly_budget)
       VALUES ($1, $2, $3, $4, $5) RETURNING ${COLUMNS}`,
      [userId, data.name, data.type, data.color, data.monthlyBudget ?? null]
    );
    res.status(201).json(row);
  });

  router.put("/:id", async (req, res) => {
    const userId = currentUser(req);
    const id = idParam.parse(req.params.id);
    const data = categorySchema.parse(req.body);
    const [current] = await db.query<{ type: string }>(
      "SELECT type FROM categories WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    if (!current) throw new HttpError(404, "Categoría no encontrada.");
    if (current.type !== data.type) {
      throw new HttpError(400, "No se puede cambiar el tipo de una categoría.");
    }
    await ensureUniqueName(db, userId, data.name, data.type, id);
    const [row] = await db.query(
      `UPDATE categories SET name = $1, color = $2, monthly_budget = $3
       WHERE id = $4 AND user_id = $5 RETURNING ${COLUMNS}`,
      [data.name, data.color, data.monthlyBudget ?? null, id, userId]
    );
    res.json(row);
  });

  router.delete("/:id", async (req, res) => {
    const userId = currentUser(req);
    const id = idParam.parse(req.params.id);
    const [usage] = await db.query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM transactions WHERE category_id = $1 AND user_id = $2",
      [id, userId]
    );
    if (usage.count > 0) {
      throw new HttpError(
        409,
        `La categoría tiene ${usage.count} movimiento(s). Muévelos o bórralos primero.`
      );
    }
    const deleted = await db.query(
      "DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, userId]
    );
    if (deleted.length === 0) throw new HttpError(404, "Categoría no encontrada.");
    res.status(204).end();
  });

  return router;
}

async function ensureUniqueName(db: Db, userId: number, name: string, type: string, exceptId = 0) {
  const rows = await db.query(
    "SELECT 1 FROM categories WHERE user_id = $1 AND lower(name) = lower($2) AND type = $3 AND id <> $4",
    [userId, name, type, exceptId]
  );
  if (rows.length > 0) throw new HttpError(409, "Ya tienes una categoría con ese nombre.");
}
