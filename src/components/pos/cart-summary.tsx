"use client";

import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/cart/calculations";
import type { CartTotals } from "@/lib/cart/types";

interface CartSummaryProps {
  totals: CartTotals;
}

export function CartSummary({ totals }: CartSummaryProps) {
  return (
    <div className="space-y-1.5 pt-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          Subtotal ({totals.itemCount} items)
        </span>
        <span>{formatCurrency(totals.subtotal)}</span>
      </div>
      {totals.discountAmount > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Discount</span>
          <span className="text-green-600">
            -{formatCurrency(totals.discountAmount)}
          </span>
        </div>
      )}
      {totals.taxAmount > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tax</span>
          <span>{formatCurrency(totals.taxAmount)}</span>
        </div>
      )}
      <Separator />
      <div className="flex justify-between text-lg font-bold">
        <span>Total</span>
        <span className="text-primary">{formatCurrency(totals.grandTotal)}</span>
      </div>
    </div>
  );
}
