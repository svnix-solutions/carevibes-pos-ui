"use client";

import { ShoppingCart, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCartStore } from "@/lib/cart/store";
import { calculateTotals, formatCurrency } from "@/lib/cart/calculations";
import { CartItem } from "./cart-item";
import { CartSummary } from "./cart-summary";
import { PatientSearch } from "./patient-search";
import { DoctorSelector } from "./doctor-selector";

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
      {/* Patient & Doctor selectors */}
      <div className="space-y-2 border-b px-4 py-3">
        <PatientSearch />
        <DoctorSelector />
      </div>

      {/* Cart header */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          <h2 className="font-semibold">Cart</h2>
          {items.length > 0 && (
            <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground transition-transform animate-in zoom-in-75 duration-200">
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
          <div className="flex h-48 flex-col items-center justify-center text-center">
            <div className="mb-3 rounded-full bg-muted p-4">
              <ShoppingCart className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Cart is empty</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Tap items from the catalog to add them
            </p>
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
            className="mt-3 h-14 w-full text-base font-semibold shadow-md transition-all"
            disabled={!canCheckout}
            onClick={onCheckout}
          >
            {!patient ? (
              <span className="flex items-center gap-2">
                <UserRound className="h-4 w-4" />
                Select Patient First
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Complete Sale &mdash; {formatCurrency(totals.grandTotal)}
                <kbd className="ml-1 hidden rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1.5 py-0.5 text-[10px] font-normal lg:inline-block">
                  F9
                </kbd>
              </span>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
