import { useState, type FormEvent } from "react";
import { api } from "../api";
import { today } from "../format";
import type { Category, MovementType, Transaction } from "../types";
import Modal from "./Modal";

interface TransactionFormProps {
  categories: Category[];
  transaction?: Transaction;
  onClose: () => void;
  onSaved: () => void;
}

export default function TransactionForm({ categories, transaction, onClose, onSaved }: TransactionFormProps) {
  const [type, setType] = useState<MovementType>(transaction?.type ?? "expense");
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? 0);
  const [date, setDate] = useState(transaction?.date ?? today());
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const options = categories.filter((category) => category.type === type);
  const selected = options.some((c) => c.id === categoryId) ? categoryId : 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!selected) return setError("Elige una categoría.");
    const value = Number(amount.replace(",", "."));
    if (!(value > 0)) return setError("El importe debe ser mayor que 0.");

    setSaving(true);
    try {
      const input = { categoryId: selected, amount: value, description, date };
      if (transaction) await api.updateTransaction(transaction.id, input);
      else await api.createTransaction(input);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title={transaction ? "Editar movimiento" : "Nuevo movimiento"} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div className="segmented" role="radiogroup" aria-label="Tipo">
          {(["expense", "income"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={type === option}
              className={`segment ${option} ${type === option ? "active" : ""}`}
              onClick={() => setType(option)}
            >
              {option === "expense" ? "Gasto" : "Ingreso"}
            </button>
          ))}
        </div>

        <label className="field amount-field">
          <span>Importe</span>
          <div className="amount-input">
            <span aria-hidden="true">$</span>
            <input
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              required
            />
          </div>
        </label>

        <div className="field-row">
          <label className="field">
            <span>Categoría</span>
            <select value={selected} onChange={(e) => setCategoryId(Number(e.target.value))} required>
              <option value={0} disabled>
                Elegir…
              </option>
              {options.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Fecha</span>
            <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} required />
          </label>
        </div>

        <label className="field">
          <span>Descripción</span>
          <input
            value={description}
            maxLength={120}
            placeholder="Ej.: Supermercado"
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

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
