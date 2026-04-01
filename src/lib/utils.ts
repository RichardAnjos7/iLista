import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function lineTotal(quantity: number, unitPrice: number | null) {
  if (unitPrice == null || Number.isNaN(unitPrice)) return 0;
  return quantity * unitPrice;
}
