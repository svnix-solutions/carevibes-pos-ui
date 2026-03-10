"use client";

import { Plus, PackageX, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/cart/calculations";
import { useCartStore } from "@/lib/cart/store";
import type { ERPNextItem } from "@/types/erpnext";

interface ItemCardProps {
  item: ERPNextItem;
  stockQty?: number | null; // undefined = non-stock, null = loading, number = loaded
}

export function ItemCard({ item, stockQty }: ItemCardProps) {
  const addItem = useCartStore((s) => s.addItem);

  const isStockLoading = stockQty === null;
  const isOutOfStock = typeof stockQty === "number" && stockQty <= 0;

  function handleAdd() {
    if (isStockLoading) return;
    if (isOutOfStock) {
      toast.error(`${item.item_name} is out of stock`);
      return;
    }
    addItem({
      item_code: item.name,
      item_name: item.item_name,
      rate: item.standard_rate || 0,
      uom: item.stock_uom,
      image: item.image,
      item_group: item.item_group,
    });
    toast.success(`Added ${item.item_name}`);
  }

  return (
    <Card
      className={`flex min-h-[100px] flex-col justify-between p-3 transition-all ${
        isOutOfStock
          ? "cursor-not-allowed opacity-60"
          : isStockLoading
            ? "cursor-wait"
            : "cursor-pointer hover:shadow-md active:scale-[0.97]"
      }`}
      onClick={handleAdd}
      role="button"
      tabIndex={isOutOfStock || isStockLoading ? -1 : 0}
      aria-label={isOutOfStock ? `${item.item_name} - out of stock` : "Add to cart"}
      aria-disabled={isOutOfStock || isStockLoading}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleAdd();
        }
      }}
    >
      <div className="mb-2 flex items-start gap-2">
        {item.image && (
          <img
            src={item.image}
            alt=""
            className="h-10 w-10 shrink-0 rounded object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium leading-tight">{item.item_name}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{item.item_group}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">
          {formatCurrency(item.standard_rate || 0)}
        </span>
        <div className="flex items-center gap-1.5">
          {isStockLoading ? (
            <Badge variant="secondary" className="text-[10px]">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Stock...
            </Badge>
          ) : typeof stockQty === "number" ? (
            <Badge
              variant={stockQty > 0 ? "secondary" : "destructive"}
              className="text-[10px]"
            >
              {stockQty > 0 ? `${stockQty} in stock` : "Out of stock"}
            </Badge>
          ) : null}
          {isOutOfStock ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <PackageX className="h-4 w-4" />
            </span>
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Plus className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
