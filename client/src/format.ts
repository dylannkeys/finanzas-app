const currency = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" });
const compact = new Intl.NumberFormat("es-EC", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1
});

export const money = (value: number) => currency.format(value);
export const moneyCompact = (value: number) => compact.format(value);

export function monthLabel(month: string, style: "long" | "short" = "long"): string {
  const [year, m] = month.split("-").map(Number);
  const label = new Date(year, m - 1, 1).toLocaleDateString("es-EC", {
    month: style,
    year: style === "long" ? "numeric" : undefined
  });
  return label.charAt(0).toUpperCase() + label.slice(1).replace(".", "");
}

export function dayLabel(date: string): string {
  const [year, m, d] = date.split("-").map(Number);
  return new Date(year, m - 1, d).toLocaleDateString("es-EC", { weekday: "short", day: "numeric", month: "short" });
}

export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function today(): string {
  const now = new Date();
  return `${currentMonth()}-${String(now.getDate()).padStart(2, "0")}`;
}

export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
