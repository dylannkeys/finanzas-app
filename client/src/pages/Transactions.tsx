import { useEffect, useState } from "react";
import { api } from "../api";
import MonthPicker from "../components/MonthPicker";
import TransactionForm from "../components/TransactionForm";
import { currentMonth, dayLabel, money } from "../format";
import type { MovementType, Transaction } from "../types";
import { useData } from "../useData";

export default function Transactions() {
  const [month, setMonth] = useState(currentMonth());
  const [type, setType] = useState<MovementType | "">("");
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Transaction | "new" | null>(null);
  const [actionError, setActionError] = useState("");

  // Espera a que el usuario deje de escribir antes de buscar.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const categories = useData(() => api.categories(), []);
  const list = useData(
    () => api.transactions({ month, type: type || undefined, categoryId: categoryId || undefined, q: query || undefined }),
    [month, type, categoryId, query]
  );

  const transactions = list.data ?? [];
  const income = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

  const groups = new Map<string, Transaction[]>();
  for (const t of transactions) groups.set(t.date, [...(groups.get(t.date) ?? []), t]);

  async function remove(t: Transaction) {
    if (!confirm(`¿Borrar "${t.description || t.categoryName}" por ${money(t.amount)}?`)) return;
    try {
      await api.deleteTransaction(t.id);
      list.reload();
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  const visibleCategories = (categories.data ?? []).filter((c) => !type || c.type === type);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Historial</p>
          <h1>Movimientos</h1>
        </div>
        <div className="header-actions">
          <MonthPicker value={month} onChange={setMonth} />
          <button className="button primary" onClick={() => setEditing("new")}>
            + Nuevo movimiento
          </button>
        </div>
      </header>

      <section className="card filters">
        <label className="field search">
          <span className="sr-only">Buscar</span>
          <input type="search" placeholder="Buscar por descripción…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label className="field">
          <span className="sr-only">Tipo</span>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as MovementType | "");
              setCategoryId("");
            }}
          >
            <option value="">Todos los tipos</option>
            <option value="expense">Gastos</option>
            <option value="income">Ingresos</option>
          </select>
        </label>
        <label className="field">
          <span className="sr-only">Categoría</span>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Todas las categorías</option>
            {visibleCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="filter-totals">
          <span className="income">+{money(income)}</span>
          <span className="expense">−{money(expense)}</span>
        </div>
      </section>

      {(list.error || actionError) && <p className="banner error">{list.error || actionError}</p>}

      {!list.loading && transactions.length === 0 ? (
        <div className="card empty-state">
          <h2>No hay movimientos</h2>
          <p className="muted">Prueba con otro mes o cambia los filtros.</p>
        </div>
      ) : (
        <div className="day-groups" aria-busy={list.loading}>
          {[...groups].map(([date, items]) => (
            <section key={date} className="card day-group">
              <h2 className="day-title">{dayLabel(date)}</h2>
              <ul className="tx-list">
                {items.map((t) => (
                  <li key={t.id} className="tx">
                    <span className="tx-dot" style={{ background: t.categoryColor }} aria-hidden="true" />
                    <div className="tx-main">
                      <strong>{t.description || t.categoryName}</strong>
                      <span>{t.categoryName}</span>
                    </div>
                    <span className={`tx-amount ${t.type}`}>
                      {t.type === "income" ? "+" : "−"}
                      {money(t.amount)}
                    </span>
                    <div className="tx-actions">
                      <button className="icon-button" onClick={() => setEditing(t)} aria-label="Editar">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
                        </svg>
                      </button>
                      <button className="icon-button danger" onClick={() => remove(t)} aria-label="Borrar">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {editing && categories.data && (
        <TransactionForm
          categories={categories.data}
          transaction={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.reload();
          }}
        />
      )}
    </div>
  );
}
