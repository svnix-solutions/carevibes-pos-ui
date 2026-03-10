"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/cart/calculations";
import { useCartStore } from "@/lib/cart/store";
import type { ERPNextItem } from "@/types/erpnext";

interface ItemCardProps {
  item: ERPNextItem;
  supplier?: string;
}

export function ItemCard({ item, supplier }: ItemCardProps) {
  const addItem = useCartStore((s) => s.addItem);

  function handleAdd() {
    addItem({
      item_code: item.name,
      item_name: item.item_name,
      rate: item.standard_rate || 0,
      uom: item.stock_uom,
      image: item.image,
      item_group: item.item_group,
      supplier,
    });
    toast.success(`Added ${item.item_name}`);
  }

  return (
    <Card
      className="flex min-h-[100px] cursor-pointer flex-col justify-between p-3 transition-all hover:shadow-md active:scale-[0.97]"
      onClick={handleAdd}
      role="button"
      tabIndex={0}
      aria-label="Add to cart"
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
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Plus className="h-4 w-4" />
        </span>
      </div>
    </Card>
  );
}
