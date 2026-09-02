"use client";

import { Separator } from "@/components/ui/separator";
import {
  formatCurrency,
  round2,
  MAX_DISCOUNT_PERCENT,
} from "@/lib/cart/calculations";
import { useCartStore } from "@/lib/cart/store";
import type { CartTotals } from "@/lib/cart/types";
import { DiscountInput } from "./discount-input";
import { CouponInput } from "./coupon-input";

interface CartSummaryProps {
  totals: CartTotals;
  /** Hide the bill-discount control where the cart is read-only (e.g. payment). */
  editable?: boolean;
  /** Coupon is applied but grants nothing on the current cart. */
  couponInactive?: boolean;
}

export function CartSummary({
  totals,
  editable = true,
  couponInactive = false,
}: CartSummaryProps) {
  const cartDiscount = useCartStore((s) => s.cartDiscount);
  const setCartDiscount = useCartStore((s) => s.setCartDiscount);
  const clearCartDiscount = useCartStore((s) => s.clearCartDiscount);

  // What the bill discount may still draw on: the unused allowance, plus
  // whatever this control has already applied (so re-opening it can show and
  // re-enter the current value rather than treating it as already spent).
  const billMaxAmount = round2(
    totals.discountAllowance + totals.cartDiscountAmount
  );
  const billMaxPercent =
    totals.netTotal > 0
      ? round2(
          Math.min(MAX_DISCOUNT_PERCENT, (billMaxAmount / totals.netTotal) * 100)
        )
      : 0;

  return (
    <div className="space-y-1.5 pt-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          Subtotal ({totals.itemCount} items)
        </span>
        <span>{formatCurrency(totals.subtotal)}</span>
      </div>

      {totals.lineDiscountAmount > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Item discounts</span>
          <span className="text-green-600">
            -{formatCurrency(totals.lineDiscountAmount)}
          </span>
        </div>
      )}

      {totals.couponDiscountAmount > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Coupon</span>
          <span className="text-green-600">
            -{formatCurrency(totals.couponDiscountAmount)}
          </span>
        </div>
      )}

      {/* Bill-level discount, applied after item discounts */}
      {(editable || totals.cartDiscountAmount > 0) && (
      <div className="flex items-center justify-between text-sm">
        {editable ? (
          <DiscountInput
            label="Bill discount"
            base={totals.netTotal}
            maxPercent={billMaxPercent}
            maxAmount={billMaxAmount}
            discountType={cartDiscount?.type}
            discountValue={cartDiscount?.value}
            discountAmount={totals.cartDiscountAmount}
            onApply={setCartDiscount}
            onClear={clearCartDiscount}
          />
        ) : (
          totals.cartDiscountAmount > 0 && (
            <span className="text-muted-foreground">Bill discount</span>
          )
        )}
        {totals.cartDiscountAmount > 0 && (
          <span className="text-green-600">
            -{formatCurrency(totals.cartDiscountAmount)}
          </span>
        )}
      </div>
      )}

      {totals.taxAmount > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">GST</span>
          <span>{formatCurrency(totals.taxAmount)}</span>
        </div>
      )}

      {editable && (
        <div className="pt-0.5">
          <CouponInput
            couponDiscountAmount={totals.couponDiscountAmount}
            inactive={couponInactive}
          />
        </div>
      )}

      <Separator />
      <div className="flex justify-between text-lg font-bold">
        <span>Total</span>
        <span className="text-primary">{formatCurrency(totals.grandTotal)}</span>
      </div>

      {totals.discountAmount > 0 && (
        <p className="text-right text-xs text-green-600">
          Patient saved {formatCurrency(totals.discountAmount)}
        </p>
      )}
    </div>
  );
}
