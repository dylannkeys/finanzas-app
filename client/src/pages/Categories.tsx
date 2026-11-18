import { useState, type FormEvent } from "react";
import { api } from "../api";
import Modal from "../components/Modal";
import { money } from "../format";
import type { Category, MovementType } from "../types";
import { useData } from "../useData";

const PALETTE = ["#ea580c", "#2563eb", "#7c3aed", "#0891b2", "#db2777", "#dc2626", "#ca8a04", "#16a34a", "#0d9488", "#475569"];

export default function Categories() {
  const categories = useData(() => api.categories(), []);
  const [editing, setEditing] = useState<Category | { type: MovementType } | null>(null);
  const [error, setError] = useState("");

  async function remove(category: Category) {
    if (!confirm(`¿Borrar la categoría "${category.name}"?`)) return;
    setError("");
    try {
      await api.deleteCategory(category.id);
      categories.reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const groups: Array<{ type: MovementType; title: string; hint: string }> = [
    { type: "expense", title: "Gastos", hint: "Fija un presupuesto mensual para recibir avisos en el resumen." },
    { type: "income", title: "Ingresos", hint: "Clasifica de dónde viene tu dinero." }
  ];

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Organización</p>
          <h1>Categorías y presupuestos</h1>
        </div>
      </header>

      {(categories.error || error) && <p className="banner error">{categories.error || error}</p>}

      <div className="grid two">
        {groups.map((group) => (
          <section key={group.type} className="card">
            <header className="card-header">
              <div>
                <h2>{group.title}</h2>
                <p className="muted small">{group.hint}</p>
              </div>
              <button className="button ghost small" onClick={() => setEditing({ type: group.type })}>
                + Añadir
              </button>
            </header>
            <ul className="cat-rows">
              {categories.data
                ?.filter((c) => c.type === group.type)
                .map((c) => (
                  <li key={c.id}>
                    <i style={{ background: c.color }} aria-hidden="true" />
                    <span className="cat-name">{c.name}</span>
                    {group.type === "expense" && (
                      <span className="muted small">{c.monthlyBudget !== null ? `${money(c.monthlyBudget)}/mes` : "Sin presupuesto"}</span>
                    )}
                    <div className="tx-actions">
                      <button className="icon-button" onClick={() => setEditing(c)} aria-label={`Editar ${c.name}`}>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
                        </svg>
                      </button>
                      <button className="icon-button danger" onClick={() => remove(c)} aria-label={`Borrar ${c.name}`}>
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

      {editing && (
        <CategoryForm
          category={"id" in editing ? editing : undefined}
          type={editing.type}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            categories.reload();
          }}
        />
      )}
    </div>
  );
}

interface CategoryFormProps {
  category?: Category;
  type: MovementType;
  onClose: () => void;
  onSaved: () => void;
}

function CategoryForm({ category, type, onClose, onSaved }: CategoryFormProps) {
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState(category?.color ?? PALETTE[0]);
  const [budget, setBudget] = useState(category?.monthlyBudget != null ? String(category.monthlyBudget) : "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const monthlyBudget = type === "expense" && budget.trim() ? Number(budget.replace(",", ".")) : null;
    if (monthlyBudget !== null && !(monthlyBudget >= 0)) return setError("Presupuesto no válido.");
    setSaving(true);
    try {
      const input = { name, type, color, monthlyBudget };
      if (category) await api.updateCategory(category.id, input);
      else await api.createCategory(input);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title={category ? "Editar categoría" : `Nueva categoría de ${type === "expense" ? "gasto" : "ingreso"}`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Nombre</span>
          <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} autoFocus required />
        </label>

        <fieldset className="field">
          <legend>Color</legend>
          <div className="swatches">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                className={`swatch ${color === c ? "active" : ""}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                aria-pressed={color === c}
              />
            ))}
          </div>
        </fieldset>

        {type === "expense" && (
          <label className="field">
            <span>Presupuesto mensual (opcional)</span>
            <div className="amount-input">
              <span aria-hidden="true">$</span>
              <input inputMode="decimal" placeholder="Sin límite" value={budget} onChange={(e) => setBudget(e.target.value)} />
            </div>
          </label>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="form-actions">
          <button type="button" className="button ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary" disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
