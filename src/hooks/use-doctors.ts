"use client";

import { useQuery } from "@tanstack/react-query";
import { erpnext } from "@/lib/erpnext/client";
import type { ERPNextSupplier } from "@/types/erpnext";

export function useDoctors() {
  return useQuery<ERPNextSupplier[]>({
    queryKey: ["doctors"],
    queryFn: () =>
      erpnext.getList<ERPNextSupplier>("Supplier", {
        fields: ["name", "supplier_name", "custom_supplier_type__care_"],
        filters: [["custom_supplier_type__care_", "=", "Doctor"]],
        limit: 100,
        orderBy: "supplier_name asc",
      }),
    staleTime: 30 * 60 * 1000,
  });
}
