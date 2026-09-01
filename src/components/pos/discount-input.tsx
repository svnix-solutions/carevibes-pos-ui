"use client";

import { useState } from "react";
import { Percent, IndianRupee, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatCurrency,
  round2,
  MAX_DISCOUNT_PERCENT,
} from "@/lib/cart/calculations";
import type { DiscountType } from "@/lib/cart/types";

const QUICK_PERCENTS = [5, 10, 15, 20];

interface DiscountInputProps {
  /** Base the discount applies to — used for the live preview and to cap ₹. */
  base: number;
  discountType?: DiscountType;
  discountValue?: number;
  /** Resolved rupee value of the current discount, for the trigger label. */
  discountAmount: number;
  onApply: (type: DiscountType, value: number) => void;
  onClear: () => void;
  /** Ceiling on the percentage that may be entered here. */
  maxPercent: number;
  /** Ceiling on the flat amount that may be entered here. */
  maxAmount: number;
  label?: string;
  /** Compact trigger for cart line rows. */
  size?: "sm" | "default";
}

export function DiscountInput({
  base,
  discountType,
  discountValue,
  discountAmount,
  onApply,
  onClear,
  maxPercent,
  maxAmount,
  label = "Discount",
  size = "default",
}: DiscountInputProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<DiscountType>(discountType ?? "percent");
  const [value, setValue] = useState(discountValue ? String(discountValue) : "");

  function handleOpenChange(next: boolean) {
    // Re-sync on open so the popover always reflects committed state, not
    // whatever was half-typed and abandoned last time.
    if (next) {
      setType(discountType ?? "percent");
      setValue(discountValue ? String(discountValue) : "");
    }
    setOpen(next);
  }

  // Nothing left to give away — the cap is already spent elsewhere on the bill.
  const exhausted = maxAmount <= 0 && discountAmount <= 0;
  const limit = type === "percent" ? maxPercent : maxAmount;

  const parsed = parseFloat(value);
  const valid = Number.isFinite(parsed) && parsed > 0;
  const overLimit = valid && parsed > limit;
  const capped = valid ? Math.min(parsed, limit) : 0;
  const preview = valid
    ? type === "percent"
      ? (base * capped) / 100
      : capped
    : 0;

  function apply() {
    if (!valid) return;
    onApply(type, capped);
    setOpen(false);
  }

  function clear() {
    onClear();
    setValue("");
    setOpen(false);
  }

  const active = discountAmount > 0;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant={active ? "secondary" : "ghost"}
            size="sm"
            className={
              size === "sm"
                ? "h-6 px-1.5 text-[11px] font-medium text-muted-foreground"
                : "h-8 px-2 text-xs font-medium"
            }
          />
        }
      >
        {active ? (
          <span className="text-green-600">
            {discountType === "percent"
              ? `${discountValue}% off`
              : `-${formatCurrency(discountAmount)}`}
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <Percent className="h-3 w-3" />
            {label}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent className="w-72 space-y-3" align="end">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">
            on {formatCurrency(base)} &middot; max{" "}
            {type === "percent"
              ? `${round2(maxPercent)}%`
              : formatCurrency(maxAmount)}
          </p>
        </div>

        {/* Percent / rupee toggle */}
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          <Button
            variant={type === "percent" ? "default" : "ghost"}
            size="sm"
            className="h-8"
            onClick={() => setType("percent")}
          >
            <Percent className="mr-1 h-3.5 w-3.5" />
            Percent
          </Button>
          <Button
            variant={type === "amount" ? "default" : "ghost"}
            size="sm"
            className="h-8"
            onClick={() => setType("amount")}
          >
            <IndianRupee className="mr-1 h-3.5 w-3.5" />
            Amount
          </Button>
        </div>

        <Input
          autoFocus
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          max={limit}
          placeholder={type === "percent" ? "e.g. 10" : "e.g. 200"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply();
          }}
          className="h-11 text-center text-lg"
        />

        {type === "percent" && (
          <div className="grid grid-cols-4 gap-1">
            {QUICK_PERCENTS.filter((p) => p <= maxPercent).map((p) => (
              <Button
                key={p}
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setValue(String(p))}
              >
                {p}%
              </Button>
            ))}
          </div>
        )}

        {valid && (
          <p className="text-center text-sm">
            <span className="text-muted-foreground">Discount </span>
            <span className="font-semibold text-green-600">
              -{formatCurrency(preview)}
            </span>
            <span className="text-muted-foreground">
              {" "}
              &rarr; {formatCurrency(base - preview)}
            </span>
          </p>
        )}

        {overLimit && (
          <p className="text-center text-xs text-orange-600 dark:text-orange-400">
            Capped at{" "}
            {type === "percent"
              ? `${round2(maxPercent)}%`
              : formatCurrency(maxAmount)}
            {" "}&mdash; bills are limited to {MAX_DISCOUNT_PERCENT}% total.
          </p>
        )}

        {exhausted && (
          <p className="text-center text-xs text-orange-600 dark:text-orange-400">
            The {MAX_DISCOUNT_PERCENT}% limit is already used up by other
            discounts on this bill.
          </p>
        )}

        <div className="flex gap-2">
          {active && (
            <Button variant="outline" className="flex-1" onClick={clear}>
              <X className="mr-1 h-3.5 w-3.5" />
              Remove
            </Button>
          )}
          <Button
            className="flex-1"
            disabled={!valid || exhausted}
            onClick={apply}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
