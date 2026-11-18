import { Router } from "express";
import { z } from "zod";
import type { Db } from "../db.js";
import { currentUser } from "../middleware/auth.js";
import { currentMonth, monthRange, monthSchema } from "../validation.js";

const querySchema = z.object({ month: monthSchema.optional() });

interface Totals {
  income: number;
  expense: number;
}

export function summaryRouter(db: Db): Router {
  const router = Router();

  // Resumen del mes: totales, gasto por categoría frente a presupuesto y evolución de 6 meses.
  router.get("/", async (req, res) => {
    const userId = currentUser(req);
    const month = querySchema.parse(req.query).month ?? currentMonth();
    const [start, end] = monthRange(month);

    const [totals] = await db.query<Totals>(
      `SELECT COALESCE(SUM(t.amount) FILTER (WHERE c.type = 'income'), 0)::float8  AS income,
              COALESCE(SUM(t.amount) FILTER (WHERE c.type = 'expense'), 0)::float8 AS expense
       FROM transactions t JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = $1 AND t.date >= $2 AND t.date < $3`,
      [userId, start, end]
    );

    const byCategory = await db.query(
      `SELECT c.id, c.name, c.color, c.type,
              c.monthly_budget::float8 AS budget,
              COALESCE(SUM(t.amount), 0)::float8 AS total
       FROM categories c
       LEFT JOIN transactions t
         ON t.category_id = c.id AND t.date >= $2 AND t.date < $3
       WHERE c.user_id = $1
       GROUP BY c.id
       HAVING COALESCE(SUM(t.amount), 0) > 0 OR c.monthly_budget IS NOT NULL
       ORDER BY total DESC, c.name`,
      [userId, start, end]
    );

    const history = await db.query<Totals & { month: string }>(
      `WITH months AS (
         SELECT generate_series($2::date - interval '5 months', $2::date, interval '1 month')::date AS m
       )
       SELECT to_char(months.m, 'YYYY-MM') AS month,
              COALESCE(SUM(t.amount) FILTER (WHERE c.type = 'income'), 0)::float8  AS income,
              COALESCE(SUM(t.amount) FILTER (WHERE c.type = 'expense'), 0)::float8 AS expense
       FROM months
       LEFT JOIN transactions t
         ON t.user_id = $1 AND t.date >= months.m AND t.date < months.m + interval '1 month'
       LEFT JOIN categories c ON c.id = t.category_id
       GROUP BY months.m
       ORDER BY months.m`,
      [userId, start]
    );

    res.json({
      month,
      income: totals.income,
      expense: totals.expense,
      balance: Math.round((totals.income - totals.expense) * 100) / 100,
      byCategory,
      history
    });
  });

  return router;
}
