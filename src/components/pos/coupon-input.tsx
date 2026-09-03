"use client";

import { useState } from "react";
import { Loader2, Tag, TicketPercent, User, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/lib/cart/store";
import { useApplyCoupon, useAvailableCoupons } from "@/hooks/use-coupon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  const [open, setOpen] = useState(false);
  const applyCoupon = useApplyCoupon();
  const { data: available, isLoading: loadingList } = useAvailableCoupons(
    patient?.customer
  );

  const query = code.trim().toUpperCase();
  const matches = (available ?? []).filter(
    (c) =>
      !query ||
      c.code.toUpperCase().includes(query) ||
      c.offer.toUpperCase().includes(query) ||
      c.scope.toUpperCase().includes(query)
  );
  // A code that is real but not offered here — expired, spent, or another
  // patient's — still gets a try, so the cashier sees the actual reason.
  const showTypedFallback =
    query.length > 0 && !matches.some((c) => c.code.toUpperCase() === query);

  async function handleApply(applyCode: string = code) {
    if (!patient?.customer) {
      toast.error("Select a patient before applying a coupon");
      return;
    }
    try {
      const { coupon } = await applyCoupon.mutateAsync({
        code: applyCode,
        items,
        customer: patient.customer,
      });
      setOpen(false);
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-full justify-start px-2.5 text-xs font-normal text-muted-foreground"
          />
        }
      >
        <TicketPercent className="mr-1.5 h-3.5 w-3.5" />
        {available?.length
          ? `${available.length} coupon${available.length > 1 ? "" : ""} available`
          : "Add coupon"}
      </PopoverTrigger>

      <PopoverContent className="w-80 space-y-2 p-0" align="end">
        <div className="border-b p-2.5">
          <Input
            autoFocus
            placeholder="Search or type a code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter" && code.trim()) handleApply();
            }}
            className="h-8 text-xs uppercase placeholder:normal-case"
            disabled={applyCoupon.isPending}
          />
        </div>

        <div className="max-h-64 space-y-1 overflow-y-auto px-2.5 pb-1">
          {loadingList && (
            <p className="py-3 text-center text-xs text-muted-foreground">
              Loading coupons&hellip;
            </p>
          )}

          {!loadingList && !matches.length && !showTypedFallback && (
            <p className="py-3 text-center text-xs text-muted-foreground">
              No coupons available for this patient.
            </p>
          )}

          {matches.map((c) => (
            <button
              key={c.name}
              type="button"
              disabled={applyCoupon.isPending}
              onClick={() => handleApply(c.code)}
              className="w-full rounded-lg border p-2 text-left transition-colors hover:bg-accent disabled:opacity-50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                  <Tag className="h-3 w-3 text-green-600" />
                  {c.code}
                  {c.patientSpecific && (
                    <span className="flex items-center gap-0.5 rounded bg-blue-100 px-1 py-px text-[10px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      <User className="h-2.5 w-2.5" />
                      for this patient
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-xs font-medium text-green-600">
                  {c.offer}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {c.scope ? `on ${c.scope}` : "on this bill"}
                {c.remainingUses !== null && ` · ${c.remainingUses} left`}
                {c.validUpto && ` · until ${c.validUpto}`}
              </p>
              {c.note && (
                <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground/80">
                  {c.note}
                </p>
              )}
            </button>
          ))}

          {showTypedFallback && (
            <Button
              variant="secondary"
              className="h-8 w-full text-xs"
              disabled={applyCoupon.isPending}
              onClick={() => handleApply()}
            >
              {applyCoupon.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>Try code &ldquo;{query}&rdquo;</>
              )}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
