"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/cart/calculations";
import { useCartStore } from "@/lib/cart/store";
import type { CartItem as CartItemType } from "@/lib/cart/types";

interface CartItemProps {
  item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

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
        {item.supplier && (
          <Badge variant="secondary" className="mt-0.5 text-[10px]">
            {item.supplier}
          </Badge>
        )}
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
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">
              {formatCurrency(item.rate * item.quantity)}
            </p>
            {item.quantity > 1 && (
              <p className="text-xs text-muted-foreground">
                {formatCurrency(item.rate)} each
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
