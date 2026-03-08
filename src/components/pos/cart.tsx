"use client";

import { ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCartStore } from "@/lib/cart/store";
import { calculateTotals } from "@/lib/cart/calculations";
import { CartItem } from "./cart-item";
import { CartSummary } from "./cart-summary";

interface CartProps {
  onCheckout: () => void;
}

export function Cart({ onCheckout }: CartProps) {
  const items = useCartStore((s) => s.items);
  const patient = useCartStore((s) => s.patient);
  const discount = useCartStore((s) => s.discount);
  const clearCart = useCartStore((s) => s.clearCart);

  const totals = calculateTotals(items, discount);
  const canCheckout = items.length > 0 && patient !== null;

  return (
    <div className="flex h-full flex-col border-l bg-background">
      {/* Cart header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          <h2 className="font-semibold">Cart</h2>
          {items.length > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {totals.itemCount}
            </span>
          )}
        </div>
        {items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={clearCart}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Cart items */}
      <ScrollArea className="flex-1 px-4">
        {items.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <ShoppingCart className="mb-2 h-8 w-8 opacity-30" />
            <p>Cart is empty</p>
            <p className="text-xs">Add items from the catalog</p>
          </div>
        ) : (
          <div className="py-2">
            {items.map((item) => (
              <CartItem key={item.item_code} item={item} />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Summary and checkout */}
      {items.length > 0 && (
        <div className="border-t px-4 pb-4 pt-2">
          <CartSummary totals={totals} />
          <Button
            className="mt-3 w-full"
            size="lg"
            disabled={!canCheckout}
            onClick={onCheckout}
          >
            {!patient
              ? "Select Patient First"
              : `Complete Sale - ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(totals.grandTotal)}`}
          </Button>
        </div>
      )}
    </div>
  );
}
