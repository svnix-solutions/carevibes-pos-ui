"use client";

import { useState } from "react";
import { Loader2, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/lib/cart/store";
import { useApplyCoupon } from "@/hooks/use-coupon";
import { formatCurrency } from "@/lib/cart/calculations";

interface CouponInputProps {
  /** Rupee value the applied coupon is currently granting. */
  couponDiscountAmount: number;
  /** True once the coupon is applied but grants nothing on the current cart. */
  inactive: boolean;
}

export function CouponInput({
  couponDiscountAmount,
  inactive,
}: CouponInputProps) {
  const items = useCartStore((s) => s.items);
  const patient = useCartStore((s) => s.patient);
  const appliedCoupon = useCartStore((s) => s.appliedCoupon);
  const setCoupon = useCartStore((s) => s.setCoupon);

  const [code, setCode] = useState("");
  const applyCoupon = useApplyCoupon();

  async function handleApply() {
    if (!patient?.customer) {
      toast.error("Select a patient before applying a coupon");
      return;
    }
    try {
      const { coupon } = await applyCoupon.mutateAsync({
        code,
        items,
        customer: patient.customer,
      });
      setCoupon(coupon);
      setCode("");
      toast.success(`${coupon.code} applied`);
    } catch (err) {
      // Every failure path carries a cashier-readable reason — an expired
      // date, a spent usage limit, or nothing in the cart it covers.
      toast.error(
        err instanceof Error ? err.message : "Could not apply that coupon"
      );
    }
  }

  function handleRemove() {
    setCoupon(null);
    toast(`${appliedCoupon?.code} removed`, { duration: 1500 });
  }

  if (appliedCoupon) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-green-500/50 bg-green-50/50 px-2.5 py-1.5 dark:bg-green-950/20">
        <div className="flex min-w-0 items-center gap-1.5">
          <Tag className="h-3.5 w-3.5 shrink-0 text-green-600" />
          <span className="truncate text-xs font-medium text-green-700 dark:text-green-400">
            {appliedCoupon.code}
          </span>
          {inactive ? (
            <span className="shrink-0 text-[11px] text-orange-600 dark:text-orange-400">
              not applicable
            </span>
          ) : (
            <span className="shrink-0 text-[11px] text-green-700/80 dark:text-green-400/80">
              -{formatCurrency(couponDiscountAmount)}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={handleRemove}
          aria-label={`Remove coupon ${appliedCoupon.code}`}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        placeholder="Coupon code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleApply();
        }}
        className="h-8 flex-1 text-xs uppercase placeholder:normal-case"
        disabled={applyCoupon.isPending}
      />
      <Button
        variant="outline"
        size="sm"
        className="h-8 shrink-0 px-2.5 text-xs"
        disabled={!code.trim() || applyCoupon.isPending}
        onClick={handleApply}
      >
        {applyCoupon.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          "Apply"
        )}
      </Button>
    </div>
  );
}
