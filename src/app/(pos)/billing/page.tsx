"use client";

import { useState } from "react";
import { ItemCatalog } from "@/components/pos/item-catalog";
import { Cart } from "@/components/pos/cart";
import { PaymentDialog } from "@/components/pos/payment-dialog";

export default function BillingPage() {
  const [paymentOpen, setPaymentOpen] = useState(false);

  return (
    <>
      <div className="flex h-full">
        {/* Left panel: Item catalog */}
        <div className="flex-1 overflow-hidden">
          <ItemCatalog />
        </div>

        {/* Right panel: Cart */}
        <div className="w-[380px] shrink-0">
          <Cart onCheckout={() => setPaymentOpen(true)} />
        </div>
      </div>

      <PaymentDialog open={paymentOpen} onOpenChange={setPaymentOpen} />
    </>
  );
}
