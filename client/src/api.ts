import type { Category, Summary, Transaction, TransactionInput, User } from "./types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "";
const TOKEN_KEY = "cuentas-claras-token";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string | null) => {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* almacenamiento no disponible */
    }
  }
};

/** Se ejecuta cuando la API responde 401 (sesión caducada). Lo configura AuthProvider. */
let onUnauthorized: () => void = () => {};
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor. ¿Está la API en marcha?");
  }

  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token) onUnauthorized();
    const detail = data.details?.[0]?.message;
    const fallback =
      response.status >= 500 && !data.error
        ? "No se pudo conectar con el servidor. ¿Está la API en marcha?"
        : "Algo salió mal.";
    throw new ApiError(response.status, detail ?? data.error ?? fallback);
  }
  return data as T;
}

const json = (body: unknown) => JSON.stringify(body);

interface AuthResponse {
  token: string;
  user: User;
}

export const api = {
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: json({ email, password }) }),
  register: (name: string, email: string, password: string) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: json({ name, email, password }) }),
  me: () => request<{ user: User }>("/auth/me"),

  summary: (month: string) => request<Summary>(`/summary?month=${month}`),

  transactions: (filters: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
    return request<Transaction[]>(`/transactions?${params}`);
  },
  createTransaction: (input: TransactionInput) =>
    request<Transaction>("/transactions", { method: "POST", body: json(input) }),
  updateTransaction: (id: number, input: TransactionInput) =>
    request<Transaction>(`/transactions/${id}`, { method: "PUT", body: json(input) }),
  deleteTransaction: (id: number) => request<void>(`/transactions/${id}`, { method: "DELETE" }),

  categories: () => request<Category[]>("/categories"),
  createCategory: (input: Omit<Category, "id">) =>
    request<Category>("/categories", { method: "POST", body: json(input) }),
  updateCategory: (id: number, input: Omit<Category, "id">) =>
    request<Category>(`/categories/${id}`, { method: "PUT", body: json(input) }),
  deleteCategory: (id: number) => request<void>(`/categories/${id}`, { method: "DELETE" })
};
