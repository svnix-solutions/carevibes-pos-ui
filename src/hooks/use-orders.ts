"use client";

import { useQuery } from "@tanstack/react-query";
import { erpnext } from "@/lib/erpnext/client";
import type { ERPNextSalesInvoice, InvoiceStatus } from "@/types/erpnext";

export interface OrderFilters {
  dateFrom: string;
  dateTo: string;
  status?: InvoiceStatus;
  search?: string;
}

export function useOrders(filters: OrderFilters) {
  const { dateFrom, dateTo, status, search } = filters;

  return useQuery<ERPNextSalesInvoice[]>({
    queryKey: ["orders", dateFrom, dateTo, status, search],
    queryFn: () => {
      const apiFilters: unknown[] = [
        ["posting_date", ">=", dateFrom],
        ["posting_date", "<=", dateTo],
        ["is_pos", "=", 1],
        ["docstatus", "!=", 0], // exclude drafts
      ];

      if (status) {
        apiFilters.push(["status", "=", status]);
      }

      return erpnext.getList<ERPNextSalesInvoice>("Sales Invoice", {
        fields: [
          "name",
          "customer",
          "customer_name",
          "posting_date",
          "posting_time",
          "creation",
          "grand_total",
          "outstanding_amount",
          "paid_amount",
          "status",
          "is_pos",
        ],
        filters: apiFilters,
        ...(search
          ? {
              orFilters: [
                ["name", "like", `%${search}%`],
                ["customer_name", "like", `%${search}%`],
              ],
            }
          : {}),
        orderBy: "creation desc",
        limit: 100,
      });
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useOrderDetail(name: string) {
  return useQuery<ERPNextSalesInvoice>({
    queryKey: ["order", name],
    queryFn: () => erpnext.getDoc<ERPNextSalesInvoice>("Sales Invoice", name),
    enabled: !!name,
  });
}
