"use client";

import { useQuery } from "@tanstack/react-query";
import { erpnext } from "@/lib/erpnext/client";
import type { ERPNextBin } from "@/types/erpnext";

/**
 * Batch-fetches stock levels from the Bin doctype for the given item codes.
 * Returns a Map<item_code, total_actual_qty> aggregated across all warehouses.
 */
export function useStockLevels(itemCodes: string[]) {
  return useQuery<Map<string, number>>({
    queryKey: ["stock-levels", itemCodes],
    queryFn: async () => {
      if (itemCodes.length === 0) return new Map();

      const bins = await erpnext.getList<ERPNextBin>("Bin", {
        fields: ["item_code", "actual_qty"],
        filters: [["item_code", "in", itemCodes]],
        limit: 500,
      });

      const stockMap = new Map<string, number>();
      for (const bin of bins) {
        const current = stockMap.get(bin.item_code) ?? 0;
        stockMap.set(bin.item_code, current + bin.actual_qty);
      }

      return stockMap;
    },
    enabled: itemCodes.length > 0,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}
