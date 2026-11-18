import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createDb, type Db } from "../src/db.js";
import { DEMO_EMAIL, DEMO_PASSWORD, seedDemo } from "../src/demo.js";

// Cada ejecución usa una base PGlite en memoria: los tests no necesitan PostgreSQL instalado.
let db: Db;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  db = await createDb();
  app = createApp({ db, jwtSecret: "secreto-de-test-con-mas-de-32-caracteres", disableRateLimit: true });
});

afterAll(async () => {
  await db.close();
});

async function register(email: string) {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "Usuario Test", email, password: "contrasena-segura" });
  expect(res.status).toBe(201);
  return res.body.token as string;
}

async function categoryId(token: string, name: string): Promise<number> {
  const res = await request(app).get("/api/categories").set("Authorization", `Bearer ${token}`);
  const category = res.body.find((c: { name: string }) => c.name === name);
  return category.id;
}

describe("autenticación", () => {
  it("registra un usuario con categorías por defecto", async () => {
    const token = await register("nuevo@test.com");
    const res = await request(app).get("/api/categories").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(5);
  });

  it("no permite registrar dos veces el mismo correo", async () => {
    await register("repetido@test.com");
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Otro", email: "REPETIDO@test.com", password: "contrasena-segura" });
    expect(res.status).toBe(409);
  });

  it("valida los datos de registro", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "A", email: "no-es-correo", password: "123" });
    expect(res.status).toBe(400);
    expect(res.body.details.map((d: { field: string }) => d.field).sort()).toEqual([
      "email",
      "name",
      "password"
    ]);
  });

  it("inicia sesión y rechaza contraseñas incorrectas", async () => {
    await register("login@test.com");
    const ok = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@test.com", password: "contrasena-segura" });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTypeOf("string");

    const bad = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@test.com", password: "incorrecta" });
    expect(bad.status).toBe(401);
  });

  it("protege las rutas privadas", async () => {
    expect((await request(app).get("/api/transactions")).status).toBe(401);
    const res = await request(app).get("/api/transactions").set("Authorization", "Bearer token-falso");
    expect(res.status).toBe(401);
  });
});

describe("movimientos", () => {
  it("crea, edita, filtra y borra movimientos", async () => {
    const token = await register("movs@test.com");
    const auth = { Authorization: `Bearer ${token}` };
    const comida = await categoryId(token, "Comida");

    const created = await request(app)
      .post("/api/transactions")
      .set(auth)
      .send({ categoryId: comida, amount: 12.345, description: "Almuerzo", date: "2026-03-10" });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ amount: 12.35, type: "expense", date: "2026-03-10" });

    const updated = await request(app)
      .put(`/api/transactions/${created.body.id}`)
      .set(auth)
      .send({ categoryId: comida, amount: 15, description: "Cena", date: "2026-03-11" });
    expect(updated.body).toMatchObject({ amount: 15, description: "Cena" });

    const march = await request(app).get("/api/transactions?month=2026-03&q=cen").set(auth);
    expect(march.body).toHaveLength(1);
    const april = await request(app).get("/api/transactions?month=2026-04").set(auth);
    expect(april.body).toHaveLength(0);

    const deleted = await request(app).delete(`/api/transactions/${created.body.id}`).set(auth);
    expect(deleted.status).toBe(204);
  });

  it("rechaza importes no válidos", async () => {
    const token = await register("importes@test.com");
    const comida = await categoryId(token, "Comida");
    const res = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: comida, amount: -5, date: "2026-03-10" });
    expect(res.status).toBe(400);
  });

  it("aísla los datos entre usuarios", async () => {
    const ana = await register("ana@test.com");
    const luis = await register("luis@test.com");
    const comidaAna = await categoryId(ana, "Comida");

    const tx = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${ana}`)
      .send({ categoryId: comidaAna, amount: 20, date: "2026-03-01" });

    const list = await request(app).get("/api/transactions").set("Authorization", `Bearer ${luis}`);
    expect(list.body).toHaveLength(0);

    const del = await request(app)
      .delete(`/api/transactions/${tx.body.id}`)
      .set("Authorization", `Bearer ${luis}`);
    expect(del.status).toBe(404);

    // Luis tampoco puede usar una categoría de Ana.
    const steal = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${luis}`)
      .send({ categoryId: comidaAna, amount: 5, date: "2026-03-01" });
    expect(steal.status).toBe(400);
  });
});

describe("cuenta demo", () => {
  it("se regenera sin duplicarse y permite iniciar sesión", async () => {
    const first = await seedDemo(db);
    const second = await seedDemo(db);
    expect(second).toBe(first);
    expect(first).toBeGreaterThan(50);

    const login = await request(app).post("/api/auth/login").send({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    expect(login.status).toBe(200);
    const list = await request(app)
      .get("/api/transactions?limit=500")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(list.body).toHaveLength(first);
  });
});

describe("categorías y resumen", () => {
  it("no borra categorías con movimientos", async () => {
    const token = await register("cats@test.com");
    const auth = { Authorization: `Bearer ${token}` };
    const ocio = await categoryId(token, "Ocio");
    await request(app)
      .post("/api/transactions")
      .set(auth)
      .send({ categoryId: ocio, amount: 30, date: "2026-03-05" });

    const res = await request(app).delete(`/api/categories/${ocio}`).set(auth);
    expect(res.status).toBe(409);
  });

  it("calcula totales, presupuesto e historial del mes", async () => {
    const token = await register("resumen@test.com");
    const auth = { Authorization: `Bearer ${token}` };
    const salario = await categoryId(token, "Salario");
    const comida = await categoryId(token, "Comida");

    await request(app)
      .put(`/api/categories/${comida}`)
      .set(auth)
      .send({ name: "Comida", type: "expense", color: "#ea580c", monthlyBudget: 200 });

    const movimientos = [
      { categoryId: salario, amount: 1000, date: "2026-03-01" },
      { categoryId: comida, amount: 120.5, date: "2026-03-15" },
      { categoryId: comida, amount: 30, date: "2026-03-31" },
      { categoryId: comida, amount: 999, date: "2026-02-28" }
    ];
    for (const m of movimientos) {
      await request(app).post("/api/transactions").set(auth).send(m);
    }

    const res = await request(app).get("/api/summary?month=2026-03").set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ income: 1000, expense: 150.5, balance: 849.5 });

    const comidaRow = res.body.byCategory.find((c: { name: string }) => c.name === "Comida");
    expect(comidaRow).toMatchObject({ total: 150.5, budget: 200 });

    expect(res.body.history).toHaveLength(6);
    expect(res.body.history.at(-1)).toMatchObject({ month: "2026-03", income: 1000 });
    expect(res.body.history.at(-2)).toMatchObject({ month: "2026-02", expense: 999 });
  });
});
