import type { CartItem, CartTotals } from "./types";

export function calculateTotals(
  items: CartItem[],
  discountPercent: number = 0
): CartTotals {
  const subtotal = items.reduce(
    (sum, item) => sum + item.rate * item.quantity,
    0
  );
  const discountAmount = subtotal * (discountPercent / 100);
  const taxableAmount = subtotal - discountAmount;
  // GST placeholder - in production, get from POS Profile tax template
  const taxAmount = 0;
  const grandTotal = taxableAmount + taxAmount;

  return {
    subtotal,
    taxAmount,
    discountAmount,
    grandTotal,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export function calculateChange(tendered: number, grandTotal: number): number {
  return Math.max(0, tendered - grandTotal);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}
