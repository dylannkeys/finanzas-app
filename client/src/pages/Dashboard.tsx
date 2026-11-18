import { useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api";
import { useAuth } from "../auth";
import MonthPicker from "../components/MonthPicker";
import TransactionForm from "../components/TransactionForm";
import { currentMonth, dayLabel, money, moneyCompact, monthLabel } from "../format";
import { useData } from "../useData";

const INCOME_COLOR = "#1f9d7a";
const EXPENSE_COLOR = "#e0684b";

export default function Dashboard() {
  const { user } = useAuth();
  const [month, setMonth] = useState(currentMonth());
  const [showForm, setShowForm] = useState(false);

  const summary = useData(() => api.summary(month), [month]);
  const recent = useData(() => api.transactions({ month, limit: "6" }), [month]);
  const categories = useData(() => api.categories(), []);

  const s = summary.data;
  const expenses = s?.byCategory.filter((c) => c.type === "expense" && c.total > 0) ?? [];
  const budgets = s?.byCategory.filter((c) => c.type === "expense" && c.budget !== null) ?? [];
  const savingsRate = s && s.income > 0 ? Math.round((s.balance / s.income) * 100) : null;

  const reload = () => {
    summary.reload();
    recent.reload();
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Hola, {user?.name.split(" ")[0]}</p>
          <h1>Resumen</h1>
        </div>
        <div className="header-actions">
          <MonthPicker value={month} onChange={setMonth} />
          <button className="button primary" onClick={() => setShowForm(true)}>
            + Nuevo movimiento
          </button>
        </div>
      </header>

      {summary.error && <p className="banner error">{summary.error}</p>}

      <section className="stats" aria-busy={summary.loading}>
        <article className="stat">
          <span className="stat-label">Ingresos</span>
          <strong className="stat-value income">{s ? money(s.income) : "—"}</strong>
        </article>
        <article className="stat">
          <span className="stat-label">Gastos</span>
          <strong className="stat-value expense">{s ? money(s.expense) : "—"}</strong>
        </article>
        <article className="stat highlight">
          <span className="stat-label">Balance</span>
          <strong className="stat-value">{s ? money(s.balance) : "—"}</strong>
          {savingsRate !== null && (
            <span className="stat-note">
              {savingsRate >= 0 ? `Ahorras el ${savingsRate}% de tus ingresos` : "Gastas más de lo que ingresas"}
            </span>
          )}
        </article>
      </section>

      <section className="grid">
        <article className="card span-2">
          <header className="card-header">
            <h2>Últimos 6 meses</h2>
            <div className="legend">
              <span>
                <i style={{ background: INCOME_COLOR }} /> Ingresos
              </span>
              <span>
                <i style={{ background: EXPENSE_COLOR }} /> Gastos
              </span>
            </div>
          </header>
          <div className="chart">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={s?.history ?? []} barGap={4} margin={{ left: -12, right: 4 }}>
                <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.1} />
                <XAxis
                  dataKey="month"
                  tickFormatter={(m: string) => monthLabel(m, "short")}
                  tick={{ fill: "currentColor", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => moneyCompact(v)}
                  tick={{ fill: "currentColor", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={64}
                />
                <Tooltip
                  cursor={{ fill: "currentColor", fillOpacity: 0.06 }}
                  formatter={(value, name) => [money(Number(value)), name === "income" ? "Ingresos" : "Gastos"]}
                  labelFormatter={(label) => monthLabel(String(label))}
                  contentStyle={{ borderRadius: 10, border: "1px solid #0002", color: "#1c1917" }}
                />
                <Bar dataKey="income" fill={INCOME_COLOR} radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expense" fill={EXPENSE_COLOR} radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="card">
          <header className="card-header">
            <h2>Gastos por categoría</h2>
          </header>
          {expenses.length === 0 ? (
            <p className="empty">Sin gastos este mes.</p>
          ) : (
            <>
              <div className="donut">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={expenses}
                      dataKey="total"
                      nameKey="name"
                      innerRadius={56}
                      outerRadius={82}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {expenses.map((c) => (
                        <Cell key={c.id} fill={c.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [money(Number(value)), name]}
                      contentStyle={{ borderRadius: 10, border: "1px solid #0002", color: "#1c1917" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center">
                  <span>Total</span>
                  <strong>{moneyCompact(s?.expense ?? 0)}</strong>
                </div>
              </div>
              <ul className="category-list">
                {expenses.slice(0, 5).map((c) => (
                  <li key={c.id}>
                    <i style={{ background: c.color }} />
                    <span>{c.name}</span>
                    <strong>{money(c.total)}</strong>
                  </li>
                ))}
              </ul>
            </>
          )}
        </article>

        <article className="card">
          <header className="card-header">
            <h2>Presupuestos</h2>
            <Link to="/categorias" className="link">
              Editar
            </Link>
          </header>
          {budgets.length === 0 ? (
            <p className="empty">
              Aún no tienes presupuestos. <Link to="/categorias" className="link">Crea uno</Link> para controlar tus gastos.
            </p>
          ) : (
            <ul className="budgets">
              {budgets.map((c) => {
                const pct = c.budget ? Math.round((c.total / c.budget) * 100) : 0;
                const state = pct >= 100 ? "over" : pct >= 80 ? "warn" : "ok";
                return (
                  <li key={c.id}>
                    <div className="budget-top">
                      <span>{c.name}</span>
                      <span className={`budget-amount ${state}`}>
                        {money(c.total)} <small>/ {money(c.budget ?? 0)}</small>
                      </span>
                    </div>
                    <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                      <span className={state} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        <article className="card span-2">
          <header className="card-header">
            <h2>Movimientos recientes</h2>
            <Link to="/movimientos" className="link">
              Ver todos
            </Link>
          </header>
          {recent.data?.length === 0 ? (
            <p className="empty">No hay movimientos en {monthLabel(month).toLowerCase()}.</p>
          ) : (
            <ul className="tx-list">
              {recent.data?.map((t) => (
                <li key={t.id} className="tx">
                  <span className="tx-dot" style={{ background: t.categoryColor }} aria-hidden="true" />
                  <div className="tx-main">
                    <strong>{t.description || t.categoryName}</strong>
                    <span>
                      {t.categoryName} · {dayLabel(t.date)}
                    </span>
                  </div>
                  <span className={`tx-amount ${t.type}`}>
                    {t.type === "income" ? "+" : "−"}
                    {money(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      {showForm && categories.data && (
        <TransactionForm
          categories={categories.data}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            reload();
          }}
        />
      )}
    </div>
  );
}
