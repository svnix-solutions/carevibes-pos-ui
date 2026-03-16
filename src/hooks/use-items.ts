"use client";

import { useQuery } from "@tanstack/react-query";
import { erpnext } from "@/lib/erpnext/client";
import { useDebouncedValue } from "./use-debounced-value";
import type { ERPNextItem } from "@/types/erpnext";

export function useItems(search: string, itemGroup?: string, supplier?: string) {
  const debouncedSearch = useDebouncedValue(search, 300);

  return useQuery<ERPNextItem[]>({
    queryKey: ["items", debouncedSearch, itemGroup, supplier],
    queryFn: async () => {
      const filters: unknown[] = [["disabled", "=", 0]];

      if (itemGroup) {
        filters.push(["item_group", "=", itemGroup]);
      }
      if (debouncedSearch) {
        filters.push(["item_name", "like", `%${debouncedSearch}%`]);
      }
      if (supplier) {
        filters.push(["custom_supplier", "=", supplier]);
      }

      return erpnext.getList<ERPNextItem>("Item", {
        fields: [
          "name",
          "item_name",
          "item_group",
          "image",
          "stock_uom",
          "standard_rate",
          "description",
          "is_stock_item",
          "custom_supplier",
        ],
        filters,
        limit: 50,
      });
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}
