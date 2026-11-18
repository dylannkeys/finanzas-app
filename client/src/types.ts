export type MovementType = "income" | "expense";

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Category {
  id: number;
  name: string;
  type: MovementType;
  color: string;
  monthlyBudget: number | null;
}

export interface Transaction {
  id: number;
  amount: number;
  description: string;
  date: string;
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  type: MovementType;
}

export interface TransactionInput {
  categoryId: number;
  amount: number;
  description: string;
  date: string;
}

export interface Summary {
  month: string;
  income: number;
  expense: number;
  balance: number;
  byCategory: Array<{
    id: number;
    name: string;
    color: string;
    type: MovementType;
    budget: number | null;
    total: number;
  }>;
  history: Array<{ month: string; income: number; expense: number }>;
}
