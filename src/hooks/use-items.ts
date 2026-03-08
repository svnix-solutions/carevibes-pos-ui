"use client";

import { useQuery } from "@tanstack/react-query";
import { erpnext } from "@/lib/erpnext/client";
import { useDebouncedValue } from "./use-debounced-value";
import type { ERPNextItem } from "@/types/erpnext";

export function useItems(
  search: string,
  itemGroup?: string,
  supplier?: string
) {
  const debouncedSearch = useDebouncedValue(search, 300);

  return useQuery<ERPNextItem[]>({
    queryKey: ["items", debouncedSearch, itemGroup, supplier],
    queryFn: async () => {
      const filters: unknown[] = [];

      if (itemGroup) {
        filters.push(["item_group", "=", itemGroup]);
      }
      if (debouncedSearch) {
        filters.push(["item_name", "like", `%${debouncedSearch}%`]);
      }

      // If a supplier is selected, we need to get items from that supplier
      // via the Item Supplier child table or Item Default
      if (supplier) {
        // First get item codes from Item Supplier
        const itemSuppliers = await erpnext.getList<{ parent: string }>(
          "Item Supplier",
          {
            fields: ["parent"],
            filters: [["supplier", "=", supplier]],
            limit: 200,
          }
        );

        if (itemSuppliers.length === 0) return [];

        const itemCodes = itemSuppliers.map((is) => is.parent);
        filters.push(["name", "in", itemCodes]);
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
        ],
        filters,
        limit: 50,
      });
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}
