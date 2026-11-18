/**
 * Crea un usuario de demostración con 6 meses de movimientos realistas.
 * Uso: npm run seed   (credenciales: demo@finanzas.app / demo12345)
 */
import bcrypt from "bcryptjs";
import { createDb } from "./db.js";
import { defaultCategories } from "./schema.js";

const DEMO_EMAIL = "demo@finanzas.app";
const DEMO_PASSWORD = "demo12345";

const databaseUrl = process.env.DATABASE_URL || undefined;
const db = await createDb(databaseUrl ? { url: databaseUrl } : { dataDir: "./data" });

await db.query("DELETE FROM users WHERE email = $1", [DEMO_EMAIL]);
const [user] = await db.query<{ id: number }>(
  "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
  ["Cuenta Demo", DEMO_EMAIL, await bcrypt.hash(DEMO_PASSWORD, 10)]
);

const budgets: Record<string, number> = { Comida: 280, Transporte: 90, Ocio: 120, Servicios: 75 };
const ids: Record<string, number> = {};
for (const c of defaultCategories) {
  const [row] = await db.query<{ id: number }>(
    "INSERT INTO categories (user_id, name, type, color, monthly_budget) VALUES ($1, $2, $3, $4, $5) RETURNING id",
    [user.id, c.name, c.type, c.color, budgets[c.name] ?? null]
  );
  ids[c.name] = row.id;
}

// Generador pseudoaleatorio con semilla fija: los datos de demo son siempre iguales.
let seed = 42;
const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const between = (min: number, max: number) => Math.round((min + random() * (max - min)) * 100) / 100;

const recurring: Array<[string, string, number, number, number]> = [
  // [categoría, descripción, día, mínimo, máximo]
  ["Salario", "Sueldo mensual", 1, 950, 950],
  ["Vivienda", "Arriendo", 3, 320, 320],
  ["Servicios", "Internet y celular", 8, 38, 38],
  ["Servicios", "Luz y agua", 12, 22, 34],
  ["Educación", "Curso en línea", 15, 15, 15]
];
const variable: Array<[string, string[], number, number, number]> = [
  // [categoría, descripciones, veces al mes, mínimo, máximo]
  ["Comida", ["Supermercado", "Almuerzo", "Mercado", "Panadería", "Cena fuera"], 9, 4, 48],
  ["Transporte", ["Bus", "Taxi", "Gasolina"], 6, 1, 20],
  ["Ocio", ["Cine", "Concierto", "Streaming", "Salida con amigos"], 3, 8, 45],
  ["Salud", ["Farmacia", "Consulta médica"], 1, 10, 40],
  ["Freelance", ["Diseño de logo", "Página web", "Edición de fotos"], 1, 80, 260]
];

const now = new Date();
let count = 0;
for (let back = 5; back >= 0; back--) {
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
  const year = first.getUTCFullYear();
  const month = first.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const lastDay = back === 0 ? now.getUTCDate() : daysInMonth;
  const date = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;

  const rows: Array<[number, number, string, string]> = [];
  for (const [cat, desc, day, min, max] of recurring) {
    if (day <= lastDay) rows.push([ids[cat], between(min, max), desc, date(day)]);
  }
  for (const [cat, descs, times, min, max] of variable) {
    const n = Math.max(0, Math.round(times * (lastDay / daysInMonth) + (random() - 0.5) * 2));
    for (let i = 0; i < n; i++) {
      const desc = descs[Math.floor(random() * descs.length)];
      rows.push([ids[cat], between(min, max), desc, date(1 + Math.floor(random() * lastDay))]);
    }
  }
  for (const [categoryId, amount, description, day] of rows) {
    await db.query(
      "INSERT INTO transactions (user_id, category_id, amount, description, date) VALUES ($1, $2, $3, $4, $5)",
      [user.id, categoryId, amount, description, day]
    );
    count++;
  }
}

console.log(`Usuario demo creado: ${DEMO_EMAIL} / ${DEMO_PASSWORD} (${count} movimientos)`);
await db.close();
