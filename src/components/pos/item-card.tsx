"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  }

  return (
    <Card className="flex flex-col justify-between p-3 transition-shadow hover:shadow-md">
      <div className="mb-2">
        <h3 className="text-sm font-medium leading-tight">{item.item_name}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{item.item_group}</p>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">
          {formatCurrency(item.standard_rate || 0)}
        </span>
        <Button size="icon" variant="outline" className="h-7 w-7" onClick={handleAdd} aria-label="Add to cart">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
