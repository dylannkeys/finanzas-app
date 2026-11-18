import { Router } from "express";
import { z } from "zod";
import type { Db } from "../db.js";
import { HttpError } from "../errors.js";
import { currentUser } from "../middleware/auth.js";
import { dateSchema, idParam, money, monthRange, monthSchema } from "../validation.js";

const transactionSchema = z.object({
  categoryId: z.coerce.number().int().positive("Elige una categoría."),
  amount: money,
  description: z.string().trim().max(120).default(""),
  date: dateSchema
});

const filtersSchema = z.object({
  month: monthSchema.optional(),
  type: z.enum(["income", "expense"]).optional(),
  categoryId: idParam.optional(),
  q: z.string().trim().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200)
});

const SELECT = `
  SELECT t.id, t.amount::float8 AS amount, t.description,
         to_char(t.date, 'YYYY-MM-DD') AS date,
         c.id AS "categoryId", c.name AS "categoryName", c.color AS "categoryColor", c.type
  FROM transactions t
  JOIN categories c ON c.id = t.category_id`;

export function transactionsRouter(db: Db): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    const userId = currentUser(req);
    const filters = filtersSchema.parse(req.query);
    const where = ["t.user_id = $1"];
    const params: unknown[] = [userId];
    // Añade una condición con su parámetro numerado ($2, $3...) para evitar inyección SQL.
    const add = (condition: string, value: unknown) => {
      params.push(value);
      where.push(condition.replace("?", `$${params.length}`));
    };

    if (filters.month) {
      const [start, end] = monthRange(filters.month);
      add("t.date >= ?", start);
      add("t.date < ?", end);
    }
    if (filters.type) add("c.type = ?", filters.type);
    if (filters.categoryId) add("c.id = ?", filters.categoryId);
    if (filters.q) add("t.description ILIKE ?", `%${escapeLike(filters.q)}%`);

    params.push(filters.limit);
    const rows = await db.query(
      `${SELECT} WHERE ${where.join(" AND ")} ORDER BY t.date DESC, t.id DESC LIMIT $${params.length}`,
      params
    );
    res.json(rows);
  });

  router.post("/", async (req, res) => {
    const userId = currentUser(req);
    const data = transactionSchema.parse(req.body);
    await ensureCategory(db, userId, data.categoryId);
    const [{ id }] = await db.query<{ id: number }>(
      `INSERT INTO transactions (user_id, category_id, amount, description, date)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [userId, data.categoryId, data.amount, data.description, data.date]
    );
    res.status(201).json(await findOne(db, userId, id));
  });

  router.put("/:id", async (req, res) => {
    const userId = currentUser(req);
    const id = idParam.parse(req.params.id);
    const data = transactionSchema.parse(req.body);
    await ensureCategory(db, userId, data.categoryId);
    const updated = await db.query(
      `UPDATE transactions SET category_id = $1, amount = $2, description = $3, date = $4
       WHERE id = $5 AND user_id = $6 RETURNING id`,
      [data.categoryId, data.amount, data.description, data.date, id, userId]
    );
    if (updated.length === 0) throw new HttpError(404, "Movimiento no encontrado.");
    res.json(await findOne(db, userId, id));
  });

  router.delete("/:id", async (req, res) => {
    const userId = currentUser(req);
    const id = idParam.parse(req.params.id);
    const deleted = await db.query(
      "DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, userId]
    );
    if (deleted.length === 0) throw new HttpError(404, "Movimiento no encontrado.");
    res.status(204).end();
  });

  return router;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => "\\" + char);
}

async function ensureCategory(db: Db, userId: number, categoryId: number) {
  const rows = await db.query("SELECT 1 FROM categories WHERE id = $1 AND user_id = $2", [
    categoryId,
    userId
  ]);
  if (rows.length === 0) throw new HttpError(400, "La categoría no existe.");
}

async function findOne(db: Db, userId: number, id: number) {
  const [row] = await db.query(`${SELECT} WHERE t.id = $1 AND t.user_id = $2`, [id, userId]);
  return row;
}
