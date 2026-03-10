"use client";

import { useQuery } from "@tanstack/react-query";
import { erpnext } from "@/lib/erpnext/client";
import { useDebouncedValue } from "./use-debounced-value";
import type { ERPNextItem } from "@/types/erpnext";

export function useItems(search: string, itemGroup?: string) {
  const debouncedSearch = useDebouncedValue(search, 300);

  return useQuery<ERPNextItem[]>({
    queryKey: ["items", debouncedSearch, itemGroup],
    queryFn: async () => {
      const filters: unknown[] = [];

      if (itemGroup) {
        filters.push(["item_group", "=", itemGroup]);
      }
      if (debouncedSearch) {
        filters.push(["item_name", "like", `%${debouncedSearch}%`]);
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
        ],
        filters,
        limit: 50,
      });
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}
