import { z } from "zod";

export const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Usa el formato AAAA-MM.");

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato AAAA-MM-DD.")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Fecha no válida.");

export const idParam = z.coerce.number().int().positive();

export const money = z.coerce
  .number()
  .positive("El importe debe ser mayor que 0.")
  .max(9_999_999_999, "Importe demasiado grande.")
  .transform((value) => Math.round(value * 100) / 100);

/** Primer y último día (exclusivo) de un mes AAAA-MM. */
export function monthRange(month: string): [string, string] {
  const [year, m] = month.split("-").map(Number);
  const next = m === 12 ? `${year + 1}-01` : `${year}-${String(m + 1).padStart(2, "0")}`;
  return [`${month}-01`, `${next}-01`];
}

export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}
