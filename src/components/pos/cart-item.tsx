"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  calculateLine,
  formatCurrency,
  round2,
  MAX_DISCOUNT_PERCENT,
} from "@/lib/cart/calculations";
import { useCartStore } from "@/lib/cart/store";
import type { CartItem as CartItemType } from "@/lib/cart/types";
import { DiscountInput } from "./discount-input";

interface CartItemProps {
  item: CartItemType;
  /** Discount percent a coupon grants this line, if any. */
  couponPercent?: number;
}

export function CartItem({ item, couponPercent = 0 }: CartItemProps) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const setItemDiscount = useCartStore((s) => s.setItemDiscount);
  const clearItemDiscount = useCartStore((s) => s.clearItemDiscount);

  const line = calculateLine(item, couponPercent);
  const discounted = line.discountAmount > 0;

  function handleRemove() {
    removeItem(item.item_code);
    toast("Removed " + item.item_name, { duration: 1500 });
  }

  return (
    <div className="flex items-start gap-2 border-b py-2 last:border-0 animate-in fade-in slide-in-from-left-2 duration-200">
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-1">
          <p className="text-sm font-medium leading-tight">{item.item_name}</p>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={handleRemove}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={() => updateQuantity(item.item_code, item.quantity - 1)}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-8 text-center text-sm font-medium">
              {item.quantity}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={() => updateQuantity(item.item_code, item.quantity + 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
            <DiscountInput
              size="sm"
              label="Line discount"
              base={line.gross}
              disabled={couponPercent > 0}
              disabledReason="priced by coupon"
              maxPercent={MAX_DISCOUNT_PERCENT}
              maxAmount={round2((line.gross * MAX_DISCOUNT_PERCENT) / 100)}
              discountType={item.discountType}
              discountValue={item.discountValue}
              discountAmount={line.discountAmount}
              onApply={(type, value) =>
                setItemDiscount(item.item_code, type, value)
              }
              onClear={() => clearItemDiscount(item.item_code)}
            />
          </div>
          <div className="text-right">
            {line.discountSource === "coupon" && (
              <p className="text-[10px] font-medium text-green-600">
                coupon &minus;{round2(line.discountPercent)}%
              </p>
            )}
            {discounted ? (
              <p className="text-sm font-medium">
                <span className="mr-1 text-xs font-normal text-muted-foreground line-through">
                  {formatCurrency(line.gross)}
                </span>
                {formatCurrency(line.net)}
              </p>
            ) : (
              <p className="text-sm font-medium">
                {formatCurrency(line.gross)}
              </p>
            )}
            {item.quantity > 1 && (
              <p className="text-xs text-muted-foreground">
                {formatCurrency(discounted ? line.netRate : item.rate)} each
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
