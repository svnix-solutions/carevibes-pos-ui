"use client";

import { useQuery } from "@tanstack/react-query";
import { erpnext } from "@/lib/erpnext/client";
import type { ERPNextSalesInvoice } from "@/types/erpnext";

export function useOrders(date?: string) {
  const today = date || new Date().toISOString().split("T")[0];

  return useQuery<ERPNextSalesInvoice[]>({
    queryKey: ["orders", today],
    queryFn: () =>
      erpnext.getList<ERPNextSalesInvoice>("Sales Invoice", {
        fields: [
          "name",
          "customer",
          "posting_date",
          "grand_total",
          "status",
          "is_pos",
        ],
        filters: [
          ["posting_date", "=", today],
          ["is_pos", "=", 1],
        ],
        orderBy: "creation desc",
        limit: 100,
      }),
    staleTime: 30 * 1000,
  });
}

export function useOrderDetail(name: string) {
  return useQuery<ERPNextSalesInvoice>({
    queryKey: ["order", name],
    queryFn: () => erpnext.getDoc<ERPNextSalesInvoice>("Sales Invoice", name),
    enabled: !!name,
  });
}
