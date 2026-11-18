// Esquema de la base de datos. Se ejecuta al arrancar (es idempotente).
export const schema = `
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color          TEXT NOT NULL DEFAULT '#6366f1',
  monthly_budget NUMERIC(12, 2) CHECK (monthly_budget IS NULL OR monthly_budget >= 0),
  UNIQUE (user_id, name, type)
);

CREATE TABLE IF NOT EXISTS transactions (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL DEFAULT '',
  date        DATE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions (category_id);
`;

export const defaultCategories: Array<{ name: string; type: "income" | "expense"; color: string }> = [
  { name: "Salario", type: "income", color: "#16a34a" },
  { name: "Freelance", type: "income", color: "#0d9488" },
  { name: "Otros ingresos", type: "income", color: "#65a30d" },
  { name: "Comida", type: "expense", color: "#ea580c" },
  { name: "Transporte", type: "expense", color: "#2563eb" },
  { name: "Vivienda", type: "expense", color: "#7c3aed" },
  { name: "Servicios", type: "expense", color: "#0891b2" },
  { name: "Ocio", type: "expense", color: "#db2777" },
  { name: "Salud", type: "expense", color: "#dc2626" },
  { name: "Educación", type: "expense", color: "#ca8a04" }
];
