"use client";

import { useCallback, useRef, useState } from "react";
import { ItemCatalog } from "@/components/pos/item-catalog";
import { Cart } from "@/components/pos/cart";
import { PaymentDialog } from "@/components/pos/payment-dialog";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useCartStore } from "@/lib/cart/store";

export default function BillingPage() {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const items = useCartStore((s) => s.items);
  const patient = useCartStore((s) => s.patient);

  const canCheckout = items.length > 0 && patient !== null;

  useKeyboardShortcuts({
    searchInputRef,
    onOpenPayment: useCallback(() => {
      if (canCheckout) setPaymentOpen(true);
    }, [canCheckout]),
  });

  return (
    <>
      <div className="flex h-full">
        {/* Left panel: Item catalog */}
        <div className="flex-1 overflow-hidden">
          <ItemCatalog ref={searchInputRef} />
        </div>

        {/* Right panel: Cart */}
        <div className="w-[340px] shrink-0 xl:w-[400px]">
          <Cart onCheckout={() => setPaymentOpen(true)} />
        </div>
      </div>

      <PaymentDialog open={paymentOpen} onOpenChange={setPaymentOpen} />
    </>
  );
}
